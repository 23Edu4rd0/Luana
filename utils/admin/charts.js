/**
 * admin-charts.js - Lógica de gráficos do painel admin
 */

// Renderizar todos os gráficos
function renderGraficos(respostas) {
    limparGrafico();

    const abrilSim = respostas.filter((item) => valorEhSim(item.abrilVerde)).length;
    const abrilNao = respostas.filter((item) => valorEhNao(item.abrilVerde)).length;
    const atitudesSim = respostas.filter((item) => valorEhSim(item.atitudes)).length;
    const atitudesNao = respostas.filter((item) => valorEhNao(item.atitudes)).length;

    const riscoIgnoraria = respostas.filter((item) => normalizarResposta(item.risco) === 'IGNORARIA').length;
    const riscoAvisaria = respostas.filter((item) => normalizarResposta(item.risco) === 'AVISARIA').length;
    const riscoTentaria = respostas.filter((item) => normalizarResposta(item.risco) === 'TENTARIA').length;

    const respEmpresa = respostas.filter((item) => normalizarResposta(item.responsabilidade) === 'EMPRESA').length;
    const respTrabalhador = respostas.filter((item) => normalizarResposta(item.responsabilidade) === 'TRABALHADOR').length;
    const respAmbos = respostas.filter((item) => normalizarResposta(item.responsabilidade) === 'AMBOS').length;

    const porCurso = montarResumoCurso(respostas);

    // Gráfico: Respostas por Curso
    const graficoCursosTotalEl = document.getElementById('graficoCursosTotal');
    criarGrafico(graficoCursosTotalEl, {
        type: 'bar',
        data: {
            labels: porCurso.labels,
            datasets: [
                {
                    label: 'Respostas',
                    data: porCurso.total,
                    backgroundColor: '#3e7d73',
                    borderRadius: 8
                }
            ]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });

    // Gráfico: Atitudes Preventivas
    const graficoAtitudesEl = document.getElementById('graficoAtitudes');
    criarGrafico(graficoAtitudesEl, {
        type: 'doughnut',
        data: {
            labels: ['SIM', 'NÃO'],
            datasets: [
                {
                    data: [atitudesSim, atitudesNao],
                    backgroundColor: ['#17a286', '#f26a4b'],
                    borderWidth: 0
                }
            ]
        },
        options: {
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // Gráfico: Conhecimento sobre Abril Verde
    const graficoAbrilVerdeEl = document.getElementById('graficoAbrilVerde');
    criarGrafico(graficoAbrilVerdeEl, {
        type: 'doughnut',
        data: {
            labels: ['SIM', 'NÃO'],
            datasets: [
                {
                    data: [abrilSim, abrilNao],
                    backgroundColor: ['#17a286', '#f26a4b'],
                    borderWidth: 0
                }
            ]
        },
        options: {
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // Gráfico: Conduta em Risco
    const graficoRiscoEl = document.getElementById('graficoRisco');
    criarGrafico(graficoRiscoEl, {
        type: 'bar',
        data: {
            labels: ['IGNORARIA', 'AVISARIA', 'TENTARIA'],
            datasets: [
                {
                    label: 'Qtd respostas',
                    data: [riscoIgnoraria, riscoAvisaria, riscoTentaria],
                    backgroundColor: ['#74809a', '#17a286', '#5f87c2'],
                    borderRadius: 8
                }
            ]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });

    // Gráfico: Responsabilidade Percebida
    const graficoResponsabilidadeEl = document.getElementById('graficoResponsabilidade');
    criarGrafico(graficoResponsabilidadeEl, {
        type: 'doughnut',
        data: {
            labels: ['Apenas empresa', 'Apenas trabalhador', 'Ambos'],
            datasets: [
                {
                    data: [respEmpresa, respTrabalhador, respAmbos],
                    backgroundColor: ['#7a8a95', '#8f7f6f', '#3e7d73'],
                    borderWidth: 0
                }
            ]
        },
        options: {
            plugins: { legend: { position: 'bottom' } }
        }
    });
}
