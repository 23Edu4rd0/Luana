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
const mIntegro = document.getElementById('mIntegro');
const mAcidentado = document.getElementById('mAcidentado');
const criarForm = document.getElementById('criarForm');
const novoNome = document.getElementById('novoNome');
const novoCurso = document.getElementById('novoCurso');
const novaPreferencia = document.getElementById('novaPreferencia');
const novoAbrilVerde = document.getElementById('novoAbrilVerde');
const novaAtitudes = document.getElementById('novaAtitudes');
const novoRisco = document.getElementById('novoRisco');
const novaResponsabilidade = document.getElementById('novaResponsabilidade');
const crudInfo = document.getElementById('crudInfo');
const tabelaVazia = document.getElementById('tabelaVazia');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const editNome = document.getElementById('editNome');
const editCurso = document.getElementById('editCurso');
const editPreferencia = document.getElementById('editPreferencia');
const editAbrilVerde = document.getElementById('editAbrilVerde');
const editAtitudes = document.getElementById('editAtitudes');
const editRisco = document.getElementById('editRisco');
const editResponsabilidade = document.getElementById('editResponsabilidade');
const editErro = document.getElementById('editErro');
const cancelarEdicao = document.getElementById('cancelarEdicao');
const graficoPreferenciaEl = document.getElementById('graficoPreferencia');
const graficoDiaEl = document.getElementById('graficoDia');
const API_BASE = '';

let respostasState = [];
let editandoId = null;
let graficoPreferencia = null;
let graficoDia = null;

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

function calcularMetricas(respostas) {
    const integro = respostas.filter((item) => item.preferencia === 'ÍNTEGRO').length;
    const acidentado = respostas.filter((item) => item.preferencia === 'ACIDENTADO').length;
    return {
        total: respostas.length,
        integro,
        acidentado
    };
}

function renderMetricas(respostas) {
    const { total, integro, acidentado } = calcularMetricas(respostas);
    mTotal.textContent = String(total);
    mIntegro.textContent = String(integro);
    mAcidentado.textContent = String(acidentado);
    totalInfo.textContent = `Total de respostas: ${total}`;
}

function montarSeriePorCurso(respostas) {
    const mapa = new Map();

    for (const item of respostas) {
        const curso = String(item.curso || 'Nao informado').trim() || 'Nao informado';

        if (!mapa.has(curso)) {
            mapa.set(curso, { integro: 0, acidentado: 0 });
        }

        const atual = mapa.get(curso);
        if (item.preferencia === 'ÍNTEGRO') {
            atual.integro += 1;
        } else if (item.preferencia === 'ACIDENTADO') {
            atual.acidentado += 1;
        }
    }

    const cursosOrdenados = Array.from(mapa.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return {
        labels: cursosOrdenados,
        integro: cursosOrdenados.map((curso) => mapa.get(curso).integro),
        acidentado: cursosOrdenados.map((curso) => mapa.get(curso).acidentado)
    };
}

function renderGraficos(respostas) {
    const { integro, acidentado } = calcularMetricas(respostas);
    const porCurso = montarSeriePorCurso(respostas);

    if (graficoPreferencia) {
        graficoPreferencia.destroy();
    }

    if (graficoDia) {
        graficoDia.destroy();
    }

    graficoPreferencia = new Chart(graficoPreferenciaEl, {
        type: 'doughnut',
        data: {
            labels: ['ÍNTEGRO', 'ACIDENTADO'],
            datasets: [
                {
                    data: [integro, acidentado],
                    backgroundColor: ['#17a286', '#f26a4b'],
                    borderWidth: 0
                }
            ]
        },
        options: {
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    graficoDia = new Chart(graficoDiaEl, {
        type: 'bar',
        data: {
            labels: porCurso.labels,
            datasets: [
                {
                    label: 'ÍNTEGRO',
                    data: porCurso.integro,
                    backgroundColor: '#17a286',
                    borderRadius: 8,
                    stack: 'votos'
                },
                {
                    label: 'ACIDENTADO',
                    data: porCurso.acidentado,
                    backgroundColor: '#f26a4b',
                    borderRadius: 8,
                    stack: 'votos'
                }
            ]
        },
        options: {
            plugins: {
                legend: { display: true, position: 'bottom' }
            },
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

function renderTabela(respostas) {
    tabelaBody.innerHTML = '';
    tabelaVazia.classList.toggle('hidden', respostas.length > 0);

    for (const item of respostas) {
        const tr = document.createElement('tr');

        const tdNome = document.createElement('td');
        tdNome.textContent = item.nome;

        const tdCurso = document.createElement('td');
        tdCurso.textContent = item.curso;

        const tdPreferencia = document.createElement('td');
        tdPreferencia.textContent = item.preferencia;

        const tdAbrilVerde = document.createElement('td');
        tdAbrilVerde.textContent = item.abrilVerde;

        const tdAtitudes = document.createElement('td');
        tdAtitudes.textContent = item.atitudes;

        const tdRisco = document.createElement('td');
        tdRisco.textContent = item.risco;

        const tdResponsabilidade = document.createElement('td');
        tdResponsabilidade.textContent = item.responsabilidade;

        const tdData = document.createElement('td');
        tdData.textContent = new Date(item.criadoEm).toLocaleString('pt-BR');

        const tdAcoes = document.createElement('td');
        tdAcoes.className = 'td-acoes';

        const btnEditar = document.createElement('button');
        btnEditar.className = 'secundario';
        btnEditar.textContent = 'Editar';
        btnEditar.dataset.action = 'edit';
        btnEditar.dataset.id = String(item.id);

        const btnExcluir = document.createElement('button');
        btnExcluir.className = 'perigo';
        btnExcluir.textContent = 'Excluir';
        btnExcluir.dataset.action = 'delete';
        btnExcluir.dataset.id = String(item.id);

        tdAcoes.appendChild(btnEditar);
        tdAcoes.appendChild(btnExcluir);

        tr.appendChild(tdNome);
        tr.appendChild(tdCurso);
        tr.appendChild(tdPreferencia);
        tr.appendChild(tdAbrilVerde);
        tr.appendChild(tdAtitudes);
        tr.appendChild(tdRisco);
        tr.appendChild(tdResponsabilidade);
        tr.appendChild(tdData);
        tr.appendChild(tdAcoes);
        tabelaBody.appendChild(tr);
    }
}

async function carregarDashboard() {
    respostasState = await carregarRespostas();
    renderMetricas(respostasState);
    renderGraficos(respostasState);
    renderTabela(respostasState);
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

criarForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    crudInfo.textContent = '';

    try {
        const resposta = await apiFetch('/api/admin/respostas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: novoNome.value,
                curso: novoCurso.value,
                preferencia: novaPreferencia.value,
                abrilVerde: novoAbrilVerde.value,
                atitudes: novaAtitudes.value,
                risco: novoRisco.value,
                responsabilidade: novaResponsabilidade.value
            })
        });

        const dados = await lerJsonSeguro(resposta);
        if (!resposta.ok) {
            throw new Error(dados.mensagem || 'Falha ao criar registro.');
        }

        criarForm.reset();
        crudInfo.textContent = 'Registro criado com sucesso.';
        await carregarDashboard();
    } catch (erro) {
        crudInfo.textContent = erro.message;
    }
});

tabelaBody.addEventListener('click', async (e) => {
    const botao = e.target.closest('button[data-action]');
    if (!botao) {
        return;
    }

    const id = Number(botao.dataset.id);
    const acao = botao.dataset.action;

    if (acao === 'edit') {
        const registro = respostasState.find((item) => Number(item.id) === id);
        if (!registro) {
            return;
        }

        editandoId = id;
        editNome.value = registro.nome;
        editCurso.value = registro.curso;
        editPreferencia.value = registro.preferencia;
        editAbrilVerde.value = registro.abrilVerde;
        editAtitudes.value = registro.atitudes;
        editRisco.value = registro.risco;
        editResponsabilidade.value = registro.responsabilidade;
        editErro.textContent = '';
        editModal.showModal();
        return;
    }

    if (acao === 'delete') {
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
    }
});

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    editErro.textContent = '';

    try {
        const resposta = await apiFetch(`/api/admin/respostas/${editandoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: editNome.value,
                curso: editCurso.value,
                preferencia: editPreferencia.value,
                abrilVerde: editAbrilVerde.value,
                atitudes: editAtitudes.value,
                risco: editRisco.value,
                responsabilidade: editResponsabilidade.value
            })
        });

        const dados = await lerJsonSeguro(resposta);
        if (!resposta.ok) {
            throw new Error(dados.mensagem || 'Falha ao editar registro.');
        }

        editModal.close();
        crudInfo.textContent = 'Registro atualizado com sucesso.';
        await carregarDashboard();
    } catch (erro) {
        editErro.textContent = erro.message;
    }
});

cancelarEdicao.addEventListener('click', () => {
    editModal.close();
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
});

checarSessao();
