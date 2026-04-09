/**
 * common.js - Funções compartilhadas entre formulário e admin
 */

// Capitalizar nome: primeira letra de cada palavra (como .title() do Python)
function capitalizarNome(texto) {
    return String(texto || '')
        .toLowerCase()
        .split(' ')
        .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
        .join(' ')
        .trim();
}

// Normalizar texto com fallback
function normalizarTexto(valor, fallback = 'NAO INFORMADO') {
    const texto = String(valor || '').trim();
    return texto || fallback;
}

// Normalizar resposta removendo acentos e convertendo para maiúsculas
function normalizarResposta(valor) {
    return normalizarTexto(valor, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}

// Verificar se valor é "SIM"
function valorEhSim(valor) {
    return normalizarResposta(valor) === 'SIM';
}

// Verificar se valor é "NÃO"
function valorEhNao(valor) {
    return normalizarResposta(valor) === 'NAO';
}

// Calcular score de resposta (0-4)
function scoreResposta(item) {
    const RESPOSTAS_CORRETAS = {
        abrilVerde: 'SIM',
        atitudes: 'SIM',
        risco: 'AVISARIA',
        responsabilidade: 'AMBOS'
    };

    let score = 0;
    if (valorEhSim(item.abrilVerde)) score += 1;
    if (valorEhSim(item.atitudes)) score += 1;
    if (normalizarResposta(item.risco) === RESPOSTAS_CORRETAS.risco) score += 1;
    if (normalizarResposta(item.responsabilidade) === RESPOSTAS_CORRETAS.responsabilidade) score += 1;
    return score;
}

// Montar resumo de respostas por curso
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
