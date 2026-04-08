const loginBox = document.getElementById('loginBox');
const painel = document.getElementById('painel');
const loginForm = document.getElementById('loginForm');
const senhaInput = document.getElementById('senha');
const loginErro = document.getElementById('loginErro');
const tabelaBody = document.getElementById('tabelaBody');
const totalInfo = document.getElementById('totalInfo');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const mTotal = document.getElementById('mTotal');
const mAbrilSim = document.getElementById('mAbrilSim');
const mAtitudesSim = document.getElementById('mAtitudesSim');
const mAderencia = document.getElementById('mAderencia');
const crudInfo = document.getElementById('crudInfo');
const tabelaVazia = document.getElementById('tabelaVazia');

const graficoCursosTotalEl = document.getElementById('graficoCursosTotal');
const graficoAtitudesEl = document.getElementById('graficoAtitudes');
const graficoAbrilVerdeEl = document.getElementById('graficoAbrilVerde');
const graficoRiscoEl = document.getElementById('graficoRisco');
const graficoResponsabilidadeEl = document.getElementById('graficoResponsabilidade');

const API_BASE = '';
const chartInstances = [];

function limparGrafico() {
    while (chartInstances.length > 0) {
        const grafico = chartInstances.pop();
        grafico.destroy();
    }
}

function criarGrafico(ctx, config) {
    const grafico = new Chart(ctx, config);
    chartInstances.push(grafico);
    return grafico;
}

function normalizarTexto(valor, fallback = 'NAO INFORMADO') {
    const texto = String(valor || '').trim();
    return texto || fallback;
}

function normalizarResposta(valor) {
    return normalizarTexto(valor, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}

function valorEhSim(valor) {
    return normalizarResposta(valor) === 'SIM';
}

function valorEhNao(valor) {
    return normalizarResposta(valor) === 'NAO';
}

function scoreResposta(item) {
    let score = 0;
    if (valorEhSim(item.abrilVerde)) {
        score += 1;
    }
    if (valorEhSim(item.atitudes)) {
        score += 1;
    }
    if (normalizarResposta(item.risco) === 'AVISARIA') {
        score += 1;
    }
    if (normalizarResposta(item.responsabilidade) === 'AMBOS') {
        score += 1;
    }
    return score;
}

function montarResumoCurso(respostas) {
    const mapa = new Map();

    for (const item of respostas) {
        const curso = normalizarTexto(item.curso);
        if (!mapa.has(curso)) {
            mapa.set(curso, { total: 0, perfeitas: 0 });
        }

        const atual = mapa.get(curso);
        atual.total += 1;
        if (scoreResposta(item) === 4) {
            atual.perfeitas += 1;
        }
    }

    const labels = Array.from(mapa.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const total = labels.map((curso) => mapa.get(curso).total);
    const aderencia = labels.map((curso) => {
        const dado = mapa.get(curso);
        return dado.total ? Number(((dado.perfeitas / dado.total) * 100).toFixed(1)) : 0;
    });

    return { labels, total, aderencia };
}

async function lerJsonSeguro(resposta) {
    const texto = await resposta.text();

    if (!texto) {
        return {};
    }

    try {
        return JSON.parse(texto);
    } catch {
        return {};
    }
}

function apiFetch(caminho, opcoes = {}) {
    return fetch(`${API_BASE}${caminho}`, {
        ...opcoes,
        credentials: 'include'
    });
}

async function checarSessao() {
    const resposta = await apiFetch('/api/me');
    const dados = await lerJsonSeguro(resposta);

    if (dados.autenticado) {
        await carregarDashboard();
        mostrarPainel();
    }
}

function mostrarPainel() {
    loginBox.classList.add('hidden');
    painel.classList.remove('hidden');
}

function mostrarLogin() {
    painel.classList.add('hidden');
    loginBox.classList.remove('hidden');
}

async function carregarRespostas() {
    const resposta = await apiFetch('/api/respostas');

    if (!resposta.ok) {
        throw new Error('Sem permissao para ver respostas.');
    }

    const dados = await lerJsonSeguro(resposta);
    return dados.respostas || [];
}

function renderMetricas(respostas) {
  console.log("Exemplo de resposta:", respostas[0]); // <-- adiciona isso
  const total = respostas.length;
  const abrilSim = respostas.filter((item) =>
    valorEhSim(item.abrilVerde),
  ).length;
  const atitudesSim = respostas.filter((item) =>
    valorEhSim(item.atitudes),
  ).length;
  const perfeitas = respostas.filter(
    (item) => scoreResposta(item) === 4,
  ).length;
  const aderencia = total === 0 ? 0 : Math.round((perfeitas / total) * 100);

  mTotal.textContent = String(total);
  mAbrilSim.textContent = String(abrilSim);
  mAtitudesSim.textContent = String(atitudesSim);
  mAderencia.textContent = `${aderencia}%`;
  totalInfo.textContent = `Total de respostas: ${total}`;
}

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

    // 3o grafico: conhecimento sobre Abril Verde.
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

function renderTabela(respostas) {
    tabelaBody.innerHTML = '';
    tabelaVazia.classList.toggle('hidden', respostas.length > 0);

    for (const item of respostas) {
        const tr = document.createElement('tr');

        const colunas = [
            item.nome,
            item.curso,
            item.abrilVerde,
            item.atitudes,
            item.risco,
            item.responsabilidade,
            new Date(item.criadoEm).toLocaleString('pt-BR')
        ];

        for (const valor of colunas) {
            const td = document.createElement('td');
            td.textContent = normalizarTexto(valor, '-');
            tr.appendChild(td);
        }

        const tdAcoes = document.createElement('td');
        tdAcoes.className = 'td-acoes';

        const btnExcluir = document.createElement('button');
        btnExcluir.className = 'perigo';
        btnExcluir.textContent = 'Excluir';
        btnExcluir.dataset.action = 'delete';
        btnExcluir.dataset.id = String(item.id);

        tdAcoes.appendChild(btnExcluir);
        tr.appendChild(tdAcoes);

        tabelaBody.appendChild(tr);
    }
}

tabelaBody.addEventListener('click', async (e) => {
    const botao = e.target.closest('button[data-action="delete"]');
    if (!botao) {
        return;
    }

    const id = Number(botao.dataset.id);
    if (!Number.isFinite(id)) {
        return;
    }

    const confirmou = window.confirm('Deseja realmente excluir este registro?');
    if (!confirmou) {
        return;
    }

    const resposta = await apiFetch(`/api/admin/respostas/${id}`, { method: 'DELETE' });
    const dados = await lerJsonSeguro(resposta);

    if (!resposta.ok) {
        crudInfo.textContent = dados.mensagem || 'Falha ao excluir registro.';
        return;
    }

    crudInfo.textContent = 'Registro excluido com sucesso.';
    await carregarDashboard();
});

async function carregarDashboard() {
    const respostas = await carregarRespostas();
    renderMetricas(respostas);
    renderGraficos(respostas);
    renderTabela(respostas);
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginErro.textContent = '';

    try {
        const resposta = await apiFetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ senha: senhaInput.value })
        });

        const dados = await lerJsonSeguro(resposta);

        if (!resposta.ok) {
            throw new Error(dados.mensagem || 'Falha no login.');
        }

        senhaInput.value = '';
        await carregarDashboard();
        mostrarPainel();
    } catch (erro) {
        loginErro.textContent = erro.message;
    }
});

refreshBtn.addEventListener('click', async () => {
    crudInfo.textContent = '';
    await carregarDashboard();
});

logoutBtn.addEventListener('click', async () => {
    await apiFetch('/api/logout', { method: 'POST' });
    mostrarLogin();
    tabelaBody.innerHTML = '';
    totalInfo.textContent = '';
    crudInfo.textContent = '';
    limparGrafico();
});

checarSessao();
