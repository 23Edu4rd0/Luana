// Elementos do DOM
const etapa1 = document.getElementById('etapa1');
const etapa2 = document.getElementById('etapa2');
const etapa3 = document.getElementById('etapa3');
const formularioDados = document.getElementById('formularioDados');
const formularioPergunta = document.getElementById('formularioPergunta');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const responderNovamente = document.getElementById('responderNovamente');
const cardsOpcao = document.querySelectorAll('.card-opcao');
const API_BASE = '';

let dadosUsuario = {};

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

// ========== ETAPA 1: Validar dados pessoais ==========
formularioDados.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Capturar dados
    dadosUsuario.nome = document.getElementById('nome').value;
    dadosUsuario.curso = document.getElementById('curso').value;
    
    // Ir para etapa 2
    irParaEtapa2();
});

// ========== ETAPA 2: Enviar resposta ==========
formularioPergunta.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Capturar preferência
    dadosUsuario.preferencia = document.querySelector('input[name="preferencia"]:checked').value;
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    try {
        const resposta = await apiFetch('/api/respostas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosUsuario)
        });

        const payload = await lerJsonSeguro(resposta);

        if (!resposta.ok) {
            throw new Error(payload.mensagem || 'Nao foi possivel enviar.');
        }

        successMessage.style.display = 'block';
        formularioPergunta.reset();
        mostrarObrigado();
    } catch (erro) {
        errorMessage.textContent = erro.message;
        errorMessage.style.display = 'block';
    }
});

// ========== Funções de navegação ==========
function irParaEtapa2() {
    etapa1.classList.remove('ativo');
    etapa3.classList.remove('ativo');
    etapa2.classList.add('ativo');
}

function voltarEtapa() {
    etapa3.classList.remove('ativo');
    etapa2.classList.remove('ativo');
    etapa1.classList.add('ativo');
    formularioDados.reset();
}

function mostrarObrigado() {
    etapa2.classList.remove('ativo');
    etapa1.classList.remove('ativo');
    etapa3.classList.add('ativo');
}

responderNovamente.addEventListener('click', function() {
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
    dadosUsuario = {};
    voltarEtapa();
});

for (const card of cardsOpcao) {
    card.addEventListener('click', function() {
        const radio = card.querySelector('input[type="radio"]');
        if (!radio) {
            return;
        }

        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
    });
}
