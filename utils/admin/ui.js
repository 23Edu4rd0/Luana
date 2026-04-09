/**
 * admin-ui.js - Lógica de UI do painel admin (login, painel, tabela)
 */

// Elementos do DOM
const loginBox = document.getElementById('loginBox');
const painel = document.getElementById('painel');
const loginForm = document.getElementById('loginForm');
const senhaInput = document.getElementById('senha');
const loginErro = document.getElementById('loginErro');
const tabelaBody = document.getElementById('tabelaBody');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const crudInfo = document.getElementById('crudInfo');
const tabelaVazia = document.getElementById('tabelaVazia');

// Mostrar painel de dados
function mostrarPainel() {
    loginBox.classList.add('hidden');
    painel.classList.remove('hidden');
}

// Mostrar tela de login
function mostrarLogin() {
    painel.classList.add('hidden');
    loginBox.classList.remove('hidden');
}

// Renderizar tabela de respostas
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

// Evento de clique na tabela (deletar registro)
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

// Verificar se está autenticado ao carregar a página
async function checarSessao() {
    const resposta = await apiFetch('/api/me');
    const dados = await lerJsonSeguro(resposta);

    if (dados.autenticado) {
        await carregarDashboard();
        mostrarPainel();
    }
}

// Evento de login
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

// Evento de atualizar dashboard
refreshBtn.addEventListener('click', async () => {
    crudInfo.textContent = '';
    await carregarDashboard();
});

// Evento de logout
logoutBtn.addEventListener('click', async () => {
    await apiFetch('/api/logout', { method: 'POST' });
    mostrarLogin();
    tabelaBody.innerHTML = '';
    crudInfo.textContent = '';
    limparGrafico();
});

// Inicializar ao carregar a página
checarSessao();
