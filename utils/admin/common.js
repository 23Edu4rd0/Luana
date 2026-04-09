/**
 * admin-common.js - Funções comuns do painel admin
 */

const chartInstances = [];

// Limpar todos os gráficos
function limparGrafico() {
    while (chartInstances.length > 0) {
        const grafico = chartInstances.pop();
        grafico.destroy();
    }
}

// Criar novo gráfico
function criarGrafico(ctx, config) {
    const grafico = new Chart(ctx, config);
    chartInstances.push(grafico);
    return grafico;
}

// Carregar respostas da API
async function carregarRespostas() {
    const resposta = await apiFetch('/api/respostas');

    if (!resposta.ok) {
        throw new Error('Sem permissao para ver respostas.');
    }

    const dados = await lerJsonSeguro(resposta);
    return dados.respostas || [];
}

// Renderizar métricas
function renderMetricas(respostas) {
    const mTotal = document.getElementById('mTotal');
    const mAbrilSim = document.getElementById('mAbrilSim');
    const mAtitudesSim = document.getElementById('mAtitudesSim');
    const mAderencia = document.getElementById('mAderencia');
    const totalInfo = document.getElementById('totalInfo');

    const total = respostas.length;
    const abrilSim = respostas.filter((item) => valorEhSim(item.abrilVerde)).length;
    const atitudesSim = respostas.filter((item) => valorEhSim(item.atitudes)).length;
    const perfeitas = respostas.filter((item) => scoreResposta(item) === 4).length;
    const aderencia = total === 0 ? 0 : Math.round((perfeitas / total) * 100);

    mTotal.textContent = String(total);
    mAbrilSim.textContent = String(abrilSim);
    mAtitudesSim.textContent = String(atitudesSim);
    mAderencia.textContent = `${aderencia}%`;
    totalInfo.textContent = `Total de respostas: ${total}`;
}

// Carregar e renderizar dashboard completo
async function carregarDashboard() {
    const respostas = await carregarRespostas();
    renderMetricas(respostas);
    renderGraficos(respostas);
    renderTabela(respostas);
}
