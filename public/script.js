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
const responderNovamente = document.getElementById('responderNovamente');
const feedbackTitulo = document.getElementById('feedbackTitulo');
const feedbackContent = document.getElementById('feedbackContent');
const feedbackTexto = document.getElementById('feedbackTexto');
const feedbackImagem = document.getElementById('feedbackImagem');
const feedbackProximo = document.getElementById('feedbackProximo');
const cardsOpcao = document.querySelectorAll('.card-opcao');
const API_BASE = '';

// Respostas corretas para validação
const RESPOSTAS_CORRETAS = {
    abrilVerde: 'SIM',
    atitudes: 'SIM',
    risco: 'AVISARIA',
    responsabilidade: 'AMBOS'
};

let dadosUsuario = {
    nome: '',
    curso: '',
    abrilVerde: '',
    atitudes: '',
    risco: '',
    responsabilidade: '',
    preferencia: ''  // Mantém compatibilidade com DB
};

let etagaAtual = 'etapa1';
let proximaEtapaAposFeedback = null;
let acaoAposFeedback = null;
let timerFeedback = null;
const historicoEtapas = [];

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

function mostrarEtapa(idEtapa, registrarHistorico = true) {
    if (registrarHistorico && etagaAtual !== idEtapa) {
        historicoEtapas.push(etagaAtual);
    }

    document.querySelectorAll('.etapa').forEach((el) => el.classList.remove('ativo'));
    document.getElementById(idEtapa).classList.add('ativo');
    etagaAtual = idEtapa;
}

function mostrarTelaFeedback({ correto, mensagem, proximaEtapa, titulo = 'Observacao', mostrarImagem = false, acaoAoAvancar = null }) {
    
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

    if (timerFeedback) {
        clearTimeout(timerFeedback);
    }

    timerFeedback = setTimeout(() => {
        feedbackProximo.click();
    }, 7000);
}

// ========== ETAPA 1: Dados Pessoais ==========
formularioDados.addEventListener('submit', function(e) {
    e.preventDefault();
    
    dadosUsuario.nome = document.getElementById('nome').value;
    dadosUsuario.curso = document.getElementById('curso').value;
    
    mostrarEtapa('etapa2');
});

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

    // Compatibilidade com validacao do backend existente.
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

    mostrarTelaFeedback({
        correto,
        titulo: correto ? 'Resposta correta' : 'Quase la',
        mensagem: correto
            ? 'Correto. A seguranca no trabalho e responsabilidade de todos: empresa e trabalhador.'
            : 'A empresa tem responsabilidade, sim, mas o trabalhador tambem. Seguranca no trabalho e compromisso de todos.',
        proximaEtapa: 'etapa7',
        mostrarImagem: false,
        acaoAoAvancar: async () => {
          console.log("[DEBUG] dadosUsuario:", dadosUsuario); //
          if (
            !dadosUsuario.abrilVerde ||
            !dadosUsuario.atitudes ||
            !dadosUsuario.risco
          ) {
            throw new Error(
              "Respostas incompletas. Por favor, responda todas as perguntas.",
            );
          }
          const respostaApi = await apiFetch("/api/respostas", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(dadosUsuario),
          });

          const payload = await lerJsonSeguro(respostaApi);
          if (!respostaApi.ok) {
            throw new Error(payload.mensagem || "Nao foi possivel enviar.");
          }
        }
    });
});

// ========== Funções de navegação ==========
function voltarEtapa() {
    const anterior = historicoEtapas.pop();
    if (!anterior) {
        return;
    }
    mostrarEtapa(anterior, false);
}

feedbackProximo.addEventListener('click', async () => {
    try {
        if (timerFeedback) {
            clearTimeout(timerFeedback);
            timerFeedback = null;
        }

        if (acaoAposFeedback) {
            await acaoAposFeedback();
        }
        if (proximaEtapaAposFeedback) {
            mostrarEtapa(proximaEtapaAposFeedback);
        }
    } catch (erro) {
        console.error('Erro ao avancar apos feedback:', erro);
    }
});

responderNovamente.addEventListener('click', function() {
    dadosUsuario = {
        nome: '',
        curso: '',
        abrilVerde: '',
        atitudes: '',
        risco: '',
        responsabilidade: '',
        preferencia: ''
    };
    etagaAtual = 'etapa1';
    historicoEtapas.length = 0;
    mostrarEtapa('etapa1', false);
    formularioDados.reset();
    formularioPergunta2.reset();
    formularioPergunta3.reset();
    formularioPergunta4.reset();
    formularioPergunta5.reset();
    proximaEtapaAposFeedback = null;
    acaoAposFeedback = null;
});

// Fazer cards clicáveis
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
