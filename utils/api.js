/**
 * api.js - Funções de comunicação com a API
 */

const API_BASE = '';

// Ler JSON seguro de resposta
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

// Fazer requisição para a API
function apiFetch(caminho, opcoes = {}) {
    return fetch(`${API_BASE}${caminho}`, {
        ...opcoes,
        credentials: 'include'
    });
}
