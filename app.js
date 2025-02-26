const express = require('express');
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');

// Configurar o cliente do AWS Cost Explorer (CREDENCIAIS INCLUÍDAS)
AWS.config.update({
    accessKeyId: 'AKIA2UC3CJR5KP6A7WFI', // Coloque sua AWS Access Key aqui
    secretAccessKey: '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', // Coloque sua AWS Secret Key aqui
    region: 'sa-east-1'
});

const ce = new AWS.CostExplorer();
const app = express();
app.use(bodyParser.json());

// Função para obter os custos da AWS
function getAWSCosts() {
    return new Promise((resolve, reject) => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);

        const params = {
            TimePeriod: {
                Start: startDate.toISOString().split('T')[0],
                End: endDate.toISOString().split('T')[0]
            },
            Granularity: 'MONTHLY',
            Metrics: ['UnblendedCost'],
            GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }]
        };

        ce.getCostAndUsage(params, (err, data) => {
            if (err) {
                return reject(err);
            }

            const costs = [];
            let totalCost = 0.0;

            data.ResultsByTime.forEach(entry => {
                entry.Groups.forEach(group => {
                    const service = group.Keys[0];
                    const amount = parseFloat(group.Metrics.UnblendedCost.Amount);
                    if (amount > 0) {
                        costs.push({ service, amount });
                        totalCost += amount;
                    }
                });
            });

            resolve({ costs, totalCost });
        });
    });
}

// Rota principal
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Monitoramento de Custos AWS</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
            <h1>Monitoramento de Custos AWS</h1>
            <div>
                <canvas id="costChart" width="400" height="200"></canvas>
                <h2 id="totalCost">Custo Total: $0.00</h2>
            </div>

            <script>
                async function fetchCosts() {
                    const response = await fetch('/costs');
                    const data = await response.json();
                    return data;
                }

                function renderChart(costs) {
                    const ctx = document.getElementById('costChart').getContext('2d');
                    const labels = costs.map(cost => cost.service);
                    const values = costs.map(cost => cost.amount);

                    new Chart(ctx, {
                        type: 'pie', // Mude para 'bar' para gráfico de barras
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Custos da AWS',
                                data: values,
                                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: {
                                    display: true,
                                    position: 'top',
                                }
                            }
                        }
                    });
                }

                fetchCosts().then(({ costs, totalCost }) => {
                    document.getElementById('totalCost').innerText = \`Custo Total: $\${totalCost.toFixed(2)}\`;
                    renderChart(costs);
                });
            </script>
        </body>
        </html>
    `);
});

// Rota para obter custos
app.get('/costs', async (req, res) => {
    try {
        const { costs, totalCost } = await getAWSCosts();
        res.json({ costs, totalCost });
    } catch (error) {
        res.status(500).send('Erro ao obter custos da AWS');
    }
});

// Rodar o app
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`App rodando em http://localhost:\${PORT}`);
});
