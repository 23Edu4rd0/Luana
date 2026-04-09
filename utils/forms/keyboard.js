/**
 * keyboard.js - Acessibilidade de teclado para cards de opções
 */

(function () {
    const cardsOpcao = Array.from(document.querySelectorAll('.card-opcao'));

    function obterEtapa(card) {
        return card.closest('.etapa');
    }

    function etapaEstaAtiva(card) {
        const etapa = obterEtapa(card);
        return Boolean(etapa && etapa.classList.contains('ativo'));
    }

    function obterRadio(card) {
        return card.querySelector('input[type="radio"]');
    }

    function sincronizarAriaEtapa(etapa) {
        if (!etapa) {
            return;
        }

        const cards = cardsOpcao.filter((card) => obterEtapa(card) === etapa);
        for (const card of cards) {
            const radio = obterRadio(card);
            if (!radio) {
                continue;
            }
            card.setAttribute('aria-checked', radio.checked ? 'true' : 'false');
        }
    }

    function selecionarCard(card) {
        const radio = obterRadio(card);
        if (!radio) {
            return;
        }

        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        sincronizarAriaEtapa(obterEtapa(card));
    }

    function configurarCard(card) {
        const radio = obterRadio(card);
        if (!radio) {
            return;
        }

        const textoOpcao = card.querySelector('.texto-opcao');
        card.setAttribute('role', 'radio');
        card.setAttribute('aria-checked', radio.checked ? 'true' : 'false');
        card.setAttribute('aria-label', textoOpcao ? textoOpcao.textContent.trim() : radio.value);

        // Mantem o radio fora do ciclo de tab para nao duplicar foco.
        radio.tabIndex = -1;

        radio.addEventListener('change', () => {
            sincronizarAriaEtapa(obterEtapa(card));
        });

        card.addEventListener('click', () => {
            if (!etapaEstaAtiva(card)) {
                return;
            }
            selecionarCard(card);
        });

        card.addEventListener('keydown', (e) => {
            if (!etapaEstaAtiva(card)) {
                return;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                selecionarCard(card);
            }
        });
    }

    function atualizarEtapaAtiva() {
        for (const card of cardsOpcao) {
            card.tabIndex = -1;
        }
    }

    for (const card of cardsOpcao) {
        configurarCard(card);
    }

    window.FormKeyboard = {
        atualizarEtapaAtiva,
        selecionarCard,
    };

    atualizarEtapaAtiva();
})();
