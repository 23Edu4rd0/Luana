/**
 * forms.js - Lógica de formulários e navegação entre etapas
 */

// Respostas corretas para validação
const RESPOSTAS_CORRETAS = {
    abrilVerde: 'SIM',
    atitudes: 'SIM',
    risco: 'AVISARIA',
    responsabilidade: 'AMBOS'
};

// Estado do formulário
let dadosUsuario = {
    nome: '',
    curso: '',
    abrilVerde: '',
    atitudes: '',
    risco: '',
    responsabilidade: '',
    preferencia: ''  // Compatibilidade com DB
};

let etagaAtual = 'etapa1';
let proximaEtapaAposFeedback = null;
let acaoAposFeedback = null;
let timerFeedback = null;
let envioFinalPromise = null;
const historicoEtapas = [];

// Elementos do DOM
const etapa1 = document.getElementById('etapa1');
const etapa2 = document.getElementById('etapa2');
const etapa3 = document.getElementById('etapa3');
const etapa4 = document.getElementById('etapa4');
const etapa5 = document.getElementById('etapa5');
const etapa7 = document.getElementById('etapa7');
const formularioDados = document.getElementById('formularioDados');
const formularioPergunta2 = document.getElementById('formularioPergunta2');
const formularioPergunta3 = document.getElementById('formularioPergunta3');
const formularioPergunta4 = document.getElementById('formularioPergunta4');
const formularioPergunta5 = document.getElementById('formularioPergunta5');
const feedbackTitulo = document.getElementById('feedbackTitulo');
const feedbackContent = document.getElementById('feedbackContent');
const feedbackTexto = document.getElementById('feedbackTexto');
const feedbackImagem = document.getElementById('feedbackImagem');
const feedbackProximo = document.getElementById('feedbackProximo');
const loadingOverlay = document.createElement('div');
loadingOverlay.id = 'loadingOverlay';
loadingOverlay.className = 'loading-overlay';
loadingOverlay.innerHTML = '<div class="loading-spinner" aria-hidden="true"></div><p>Enviando respostas...</p>';
document.body.appendChild(loadingOverlay);

function mostrarLoading() {
    loadingOverlay.classList.add('ativo');
}

function esconderLoading() {
    loadingOverlay.classList.remove('ativo');
}

// Mostrar/esconder etapas
function mostrarEtapa(idEtapa, registrarHistorico = true) {
    if (registrarHistorico && etagaAtual !== idEtapa) {
        historicoEtapas.push(etagaAtual);
    }

    document.querySelectorAll('.etapa').forEach((el) => el.classList.remove('ativo'));
    document.getElementById(idEtapa).classList.add('ativo');
    etagaAtual = idEtapa;

    if (window.FormKeyboard && typeof window.FormKeyboard.atualizarEtapaAtiva === 'function') {
        window.FormKeyboard.atualizarEtapaAtiva();
    }
}

// Mostrar tela de feedback
function mostrarTelaFeedback({ correto, mensagem, proximaEtapa, titulo = 'Observacao', mostrarImagem = false, acaoAoAvancar = null, autoAvancoMs = 7000 }) {
    if (timerFeedback) {
        clearTimeout(timerFeedback);
        timerFeedback = null;
    }

    feedbackTitulo.textContent = titulo;
    feedbackTexto.textContent = mensagem;
    feedbackContent.classList.remove('correto', 'errado');
    feedbackContent.classList.add(correto ? 'correto' : 'errado');

    if (mostrarImagem) {
        feedbackImagem.style.display = 'block';
    } else {
        feedbackImagem.style.display = 'none';
    }

    proximaEtapaAposFeedback = proximaEtapa;
    acaoAposFeedback = acaoAoAvancar;
    mostrarEtapa('etapaFeedback');

    if (autoAvancoMs > 0) {
        timerFeedback = setTimeout(() => {
            feedbackProximo.click();
        }, autoAvancoMs);
    }
}

// ========== ETAPA 1: Dados Pessoais ==========
formularioDados.addEventListener('submit', function(e) {
    e.preventDefault();
    
    dadosUsuario.nome = capitalizarNome(document.getElementById('nome').value);
    dadosUsuario.curso = document.getElementById('curso').value;
    
    mostrarEtapa('etapa2');
});

// Capitalizar nome automaticamente quando o usuário sai do campo (blur)
const inputNome = document.getElementById('nome');
if (inputNome) {
    inputNome.addEventListener('blur', function() {
        this.value = capitalizarNome(this.value);
    });
}
// ========== ETAPA 2: Pergunta Abril Verde ==========
formularioPergunta2.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const resposta = document.querySelector('input[name="abrilVerde"]:checked').value;
    dadosUsuario.abrilVerde = resposta;
    const correto = resposta === RESPOSTAS_CORRETAS.abrilVerde;

    mostrarTelaFeedback({
        correto,
        titulo: correto ? 'Resposta correta' : 'Tudo bem',
        mensagem: correto
            ? 'Abril Verde e a campanha de conscientizacao sobre saude e seguranca no trabalho, para prevenir acidentes e doencas ocupacionais.'
            : 'Muita gente ainda nao conhece o Abril Verde. E uma campanha de conscientizacao sobre saude e seguranca no trabalho.',
        proximaEtapa: 'etapa3',
        mostrarImagem: false
    });
});

// ========== ETAPA 3: Pergunta Atitudes ==========
formularioPergunta3.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const resposta = document.querySelector('input[name="atitudes"]:checked').value;
    const correto = resposta === RESPOSTAS_CORRETAS.atitudes;
    dadosUsuario.atitudes = resposta;

    dadosUsuario.preferencia = correto ? 'ÍNTEGRO' : 'ACIDENTADO';

    mostrarTelaFeedback({
        correto,
        titulo: correto ? 'Resposta correta' : 'Boa tentativa',
        mensagem: correto
            ? 'Pequenas atitudes, como seguir normas de seguranca e usar EPIs corretamente, reduzem significativamente os riscos.'
            : 'Pequenas atitudes fazem diferenca, sim. Seguir normas e usar EPIs corretamente ajuda muito a prevenir acidentes.',
        proximaEtapa: 'etapa4',
        mostrarImagem: false
    });
});

// ========== ETAPA 4: Pergunta Risco ==========
formularioPergunta4.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const resposta = document.querySelector('input[name="risco"]:checked').value;
    const correto = resposta === RESPOSTAS_CORRETAS.risco;
    dadosUsuario.risco = resposta;

    mostrarTelaFeedback({
        correto,
        titulo: correto ? 'Resposta correta' : 'QUE?',
        mensagem: correto
            ? 'Correto. O certo e avisar um responsavel para o risco ser avaliado e resolvido com seguranca.'
            : 'Errado. O correto e avisar um responsavel para que o risco seja avaliado e resolvido com seguranca.',
        proximaEtapa: 'etapa5',
        mostrarImagem: !correto
    });
});

// ========== ETAPA 5: Pergunta Responsabilidade ==========
formularioPergunta5.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const resposta = document.querySelector('input[name="responsabilidade"]:checked').value;
    dadosUsuario.responsabilidade = resposta;
    const correto = resposta === RESPOSTAS_CORRETAS.responsabilidade;

    // Inicia o envio final antes do clique em "Proximo" para reduzir a sensação de atraso.
    envioFinalPromise = (async () => {
        if (!dadosUsuario.abrilVerde || !dadosUsuario.atitudes || !dadosUsuario.risco) {
            throw new Error('Respostas incompletas. Por favor, responda todas as perguntas.');
        }

        const respostaApi = await apiFetch('/api/respostas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dadosUsuario),
        });

        const payload = await lerJsonSeguro(respostaApi);
        if (!respostaApi.ok) {
            throw new Error(payload.mensagem || 'Nao foi possivel enviar.');
        }
    })();

    mostrarTelaFeedback({
        correto,
        titulo: correto ? 'Resposta correta' : 'Quase la',
        mensagem: correto
            ? 'Correto. A seguranca no trabalho e responsabilidade de todos: empresa e trabalhador.'
            : 'A empresa tem responsabilidade, sim, mas o trabalhador tambem. Seguranca no trabalho e compromisso de todos.',
        proximaEtapa: 'etapa7',
        mostrarImagem: false,
        autoAvancoMs: 1500,
        acaoAoAvancar: async () => {
            if (envioFinalPromise) {
                await envioFinalPromise;
            }
        }
    });
});

// ========== Navegação ==========
function voltarEtapa() {
    const anterior = historicoEtapas.pop();
    if (!anterior) {
        return;
    }
    mostrarEtapa(anterior, false);
}

feedbackProximo.addEventListener('click', async () => {
    let loadingDelayTimer = null;

    try {
        if (timerFeedback) {
            clearTimeout(timerFeedback);
            timerFeedback = null;
        }

        // Evita flash muito rapido: so mostra loading se demorar um pouco.
        loadingDelayTimer = setTimeout(() => {
            mostrarLoading();
        }, 140);

        if (acaoAposFeedback) {
            await acaoAposFeedback();
        }
        if (proximaEtapaAposFeedback) {
            mostrarEtapa(proximaEtapaAposFeedback);
        }
    } catch (erro) {
        console.error('Erro ao avancar apos feedback:', erro);
    } finally {
        if (loadingDelayTimer) {
            clearTimeout(loadingDelayTimer);
        }
        esconderLoading();
    }
});

// Fluxo simplificado: Enter avanca na etapa ativa
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') {
        return;
    }

    const etapaAtiva = document.querySelector('.etapa.ativo');
    if (!etapaAtiva) {
        return;
    }

    const idEtapaAtiva = etapaAtiva.id;

    if (idEtapaAtiva === 'etapaFeedback') {
        e.preventDefault();
        feedbackProximo.click();
        return;
    }

    if (idEtapaAtiva === 'etapa2' || idEtapaAtiva === 'etapa3' || idEtapaAtiva === 'etapa4' || idEtapaAtiva === 'etapa5') {
        const radioSelecionado = etapaAtiva.querySelector('input[type="radio"]:checked');
        if (!radioSelecionado) {
            return;
        }

        const formulario = etapaAtiva.querySelector('form');
        if (!formulario) {
            return;
        }

        e.preventDefault();
        formulario.requestSubmit();
    }
});

