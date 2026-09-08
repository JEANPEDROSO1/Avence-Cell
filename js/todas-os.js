/**
 * SISTEMA AVENCE CELL - MÓDULO DE GESTÃO DE O.S. (TODAS AS O.S.)
 * Permite listar todas as O.S., filtrar por status, pesquisar,
 * editar qualquer O.S., excluir com confirmação, imprimir e notificar no WhatsApp.
 */

(function (window, document) {
    'use strict';

    let osParaExcluir = null;
    let statusFiltroAtual = 'todas';

    function init() {
        bindEvents();
        renderTodasOS();

        document.addEventListener('appwriteReady', () => {
            renderTodasOS();
        });
    }

    function bindEvents() {
        // Campo de busca
        const searchInput = document.getElementById('os-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderTodasOS(e.target.value);
            });
        }

        // Filtros de status por abas/pills
        const filterBtns = document.querySelectorAll('.os-filter-pill');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                statusFiltroAtual = btn.getAttribute('data-status') || 'todas';
                const searchVal = document.getElementById('os-search-input')?.value || '';
                renderTodasOS(searchVal);
            });
        });

        // Botão Nova O.S. na tela
        const btnNovaOS = document.getElementById('btn-nova-os-tela');
        if (btnNovaOS) {
            btnNovaOS.addEventListener('click', () => {
                if (typeof openModal === 'function') {
                    const modal = document.getElementById('modal-abrir-os');
                    if (modal) openModal(modal);
                }
            });
        }

        // Confirmação de Exclusão de O.S.
        const btnConfirmarExcluir = document.getElementById('btn-confirmar-excluir-os');
        if (btnConfirmarExcluir) {
            btnConfirmarExcluir.addEventListener('click', executarExclusaoOS);
        }
    }

    function getOrdens() {
        if (window.globalData && Array.isArray(window.globalData.os) && window.globalData.os.length > 0) {
            return window.globalData.os;
        }
        try {
            return JSON.parse(localStorage.getItem('avence_os') || '[]');
        } catch (e) {
            return [];
        }
    }

    function formatMoney(val) {
        return (parseFloat(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function getStatusBadge(status) {
        const s = (status || 'Aberta').trim().toLowerCase();
        let bg = 'rgba(234, 179, 8, 0.15)';
        let color = '#eab308';
        let text = 'Aberta';

        if (s.includes('andamento')) {
            bg = 'rgba(59, 130, 246, 0.15)';
            color = '#3b82f6';
            text = 'Em Andamento';
        } else if (s.includes('peça') || s.includes('peca')) {
            bg = 'rgba(168, 85, 247, 0.15)';
            color = '#a855f7';
            text = 'Aguardando Peça';
        } else if (s.includes('pronto') || s.includes('concl')) {
            bg = 'rgba(34, 197, 94, 0.15)';
            color = '#22c55e';
            text = 'Pronta';
        } else if (s.includes('encerrada') || s.includes('finaliz')) {
            bg = 'rgba(16, 185, 129, 0.2)';
            color = '#10b981';
            text = 'Encerrada';
        } else if (s.includes('cancel')) {
            bg = 'rgba(239, 68, 68, 0.15)';
            color = '#ef4444';
            text = 'Cancelada';
        }

        return `<span style="background: ${bg}; color: ${color}; border: 1px solid ${color}40; padding: 4px 10px; border-radius: 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${text}</span>`;
    }

    // Renderiza a tabela de todas as O.S.
    function renderTodasOS(filtro = '') {
        const tbody = document.getElementById('todas-os-tbody');
        const countTotalEl = document.getElementById('todas-os-count-total');
        const countAbertasEl = document.getElementById('todas-os-count-abertas');
        const countProntasEl = document.getElementById('todas-os-count-prontas');
        const countEncerradasEl = document.getElementById('todas-os-count-encerradas');
        if (!tbody) return;

        const ordens = getOrdens();
        const termo = (filtro || '').trim().toLowerCase();

        // Atualiza contadores globais
        if (countTotalEl) countTotalEl.textContent = ordens.length;
        if (countAbertasEl) {
            countAbertasEl.textContent = ordens.filter(o => {
                const s = (o.status || '').toLowerCase();
                return !s.includes('encerrada') && !s.includes('cancel');
            }).length;
        }
        if (countProntasEl) {
            countProntasEl.textContent = ordens.filter(o => (o.status || '').toLowerCase().includes('pronto')).length;
        }
        if (countEncerradasEl) {
            countEncerradasEl.textContent = ordens.filter(o => (o.status || '').toLowerCase().includes('encerrada')).length;
        }

        // Filtra por status
        let filtradas = ordens;
        if (statusFiltroAtual !== 'todas') {
            filtradas = filtradas.filter(o => {
                const s = (o.status || 'aberta').toLowerCase();
                if (statusFiltroAtual === 'aberta') return s === 'aberta';
                if (statusFiltroAtual === 'em-andamento') return s.includes('andamento');
                if (statusFiltroAtual === 'aguardando-peca') return s.includes('peça') || s.includes('peca');
                if (statusFiltroAtual === 'pronto') return s.includes('pronto');
                if (statusFiltroAtual === 'encerrada') return s.includes('encerrada');
                if (statusFiltroAtual === 'cancelada') return s.includes('cancel');
                return true;
            });
        }

        // Filtra por termo de busca
        if (termo) {
            filtradas = filtradas.filter(o => {
                const osNum = String(o.osNumber || o.numero || '').toLowerCase();
                const cli = (typeof o.cliente === 'string' ? o.cliente : o.cliente?.nome || '').toLowerCase();
                const tel = (o.fones || o.cliente?.telefone || '').toLowerCase();
                const marca = (o.marca || o.aparelho?.marca || '').toLowerCase();
                const mod = (o.modelo || o.aparelho?.modelo || '').toLowerCase();
                const def = (o.defeito || o.aparelho?.defeito || '').toLowerCase();
                return osNum.includes(termo) || cli.includes(termo) || tel.includes(termo) || marca.includes(termo) || mod.includes(termo) || def.includes(termo);
            });
        }

        tbody.innerHTML = '';

        if (filtradas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <i class="ph ph-clipboard-text" style="font-size: 48px; display: block; margin-bottom: 8px; opacity: 0.5;"></i>
                        <p style="font-size: 15px; margin: 0;">Nenhuma Ordem de Serviço encontrada com os filtros aplicados.</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Ordena pela mais recente primeiro
        filtradas.sort((a, b) => {
            const numA = parseInt(a.osNumber || a.numero || 0, 10);
            const numB = parseInt(b.osNumber || b.numero || 0, 10);
            return numB - numA;
        });

        filtradas.forEach((os) => {
            const osNum = os.osNumber !== undefined ? os.osNumber : (os.numero || '-');
            const cliNome = typeof os.cliente === 'string' ? os.cliente : (os.cliente?.nome || 'Cliente Não Informado');
            const cliFone = os.fones || os.cliente?.telefone || '';
            const foneLimpo = cliFone.replace(/\D/g, '');
            const aparelho = `${os.marca || os.aparelho?.marca || ''} ${os.modelo || os.aparelho?.modelo || ''}`.trim() || 'Aparelho Não Definido';
            const defeito = os.defeito || os.aparelho?.defeito || '-';
            const data = os.data || os.dataEntrada || '-';
            const total = os.total || (parseFloat(os.maodeobra || 0) + parseFloat(os.pecas || 0)) || 0;
            const status = os.status || 'Aberta';
            const isEncerrada = (status || '').toLowerCase().includes('encerrada');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 700; color: var(--primary); font-size: 15px;">
                    #${osNum}
                </td>
                <td style="color: var(--text-muted); font-size: 13px;">${data}</td>
                <td>
                    <div style="font-weight: 600; color: var(--text-main);">${cliNome}</div>
                    ${cliFone ? `
                        <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                            <span>${cliFone}</span>
                            ${foneLimpo ? `
                                <a href="https://wa.me/55${foneLimpo}?text=Ol%C3%A1%2C%20${encodeURIComponent(cliNome)}%21%20Atualiza%C3%A7%C3%A3o%20da%20sua%20O.S.%20N%C2%BA%20${osNum}%20na%20Avence%20Cell%3A%20Status%20atual%3A%20${encodeURIComponent(status)}." target="_blank" title="Avisar no WhatsApp" style="color: #22c55e; font-size: 16px; text-decoration: none;">
                                    <i class="ph ph-whatsapp-logo"></i>
                                </a>
                            ` : ''}
                        </div>
                    ` : ''}
                </td>
                <td>
                    <div style="font-weight: 500; color: var(--text-main);">${aparelho}</div>
                    ${os.serie ? `<span style="font-size: 11px; color: var(--text-muted);">Série: ${os.serie}</span>` : ''}
                </td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-muted);" title="${defeito}">
                    ${defeito}
                </td>
                <td>${getStatusBadge(status)}</td>
                <td style="font-weight: 700; color: var(--primary); text-align: right;">
                    ${formatMoney(total)}
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                        <button class="btn btn-secondary btn-os-editar" title="Editar O.S." style="padding: 6px 10px; font-size: 13px; color: #3b82f6;">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        ${!isEncerrada ? `
                            <button class="btn btn-secondary btn-os-encerrar" title="Encerrar / Pagamento" style="padding: 6px 10px; font-size: 13px; color: #22c55e;">
                                <i class="ph ph-check-circle"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-os-imprimir" title="Imprimir Via" style="padding: 6px 10px; font-size: 13px;">
                            <i class="ph ph-printer"></i>
                        </button>
                        <button class="btn btn-secondary btn-os-excluir" title="Excluir O.S." style="padding: 6px 10px; font-size: 13px; color: #ef4444;">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            // Ações dos botões
            tr.querySelector('.btn-os-editar').addEventListener('click', () => editarOS(os));
            const btnEncerrar = tr.querySelector('.btn-os-encerrar');
            if (btnEncerrar) {
                btnEncerrar.addEventListener('click', () => encerrarOS(os));
            }
            tr.querySelector('.btn-os-imprimir').addEventListener('click', () => imprimirOS(os));
            tr.querySelector('.btn-os-excluir').addEventListener('click', () => abrirModalExcluirOS(os));

            tbody.appendChild(tr);
        });
    }

    // Carrega a O.S. no fluxo de edição
    function editarOS(os) {
        if (!os) return;
        const osNum = String(os.osNumber || os.numero);

        // Preenche o input de pesquisa e aciona a rotina oficial de alteração
        const inputPesquisa = document.getElementById('input-pesquisa-os');
        if (inputPesquisa) {
            inputPesquisa.value = osNum;
        }

        // Define a ação atual como 'alterar'
        window.currentOSAction = 'alterar';

        const btnConfirmarPesquisa = document.getElementById('btn-confirmar-pesquisa-os');
        if (btnConfirmarPesquisa) {
            btnConfirmarPesquisa.click();
        } else {
            if (window.customAlert) window.customAlert('Abra a pesquisa de O.S. para editar.', 'warning');
        }
    }

    // Abre o fechamento da O.S.
    function encerrarOS(os) {
        if (!os) return;
        const osNum = String(os.osNumber || os.numero);

        const inputPesquisa = document.getElementById('input-pesquisa-os');
        if (inputPesquisa) {
            inputPesquisa.value = osNum;
        }

        window.currentOSAction = 'encerrar';

        const btnConfirmarPesquisa = document.getElementById('btn-confirmar-pesquisa-os');
        if (btnConfirmarPesquisa) {
            btnConfirmarPesquisa.click();
        }
    }

    // Imprime comprovante da O.S.
    function imprimirOS(os) {
        if (!os) return;
        if (typeof window.imprimirComprovanteOS === 'function') {
            window.imprimirComprovanteOS(os);
        } else {
            window.print();
        }
    }

    // Modal de Confirmação de Exclusão de O.S.
    function abrirModalExcluirOS(os) {
        osParaExcluir = os;
        const modal = document.getElementById('modal-excluir-os-confirm');
        const numEl = document.getElementById('excluir-os-numero');
        const cliEl = document.getElementById('excluir-os-cliente');
        if (!modal) return;

        if (numEl) numEl.textContent = '#' + (os.osNumber || os.numero);
        if (cliEl) cliEl.textContent = typeof os.cliente === 'string' ? os.cliente : (os.cliente?.nome || '-');

        if (typeof openModal === 'function') openModal(modal);
    }

    // Executa a exclusão da O.S.
    async function executarExclusaoOS() {
        if (!osParaExcluir) return;

        const btn = document.getElementById('btn-confirmar-excluir-os');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Excluindo...';
        btn.disabled = true;

        try {
            let ordens = getOrdens();
            const osId = osParaExcluir.id;
            const osNumero = osParaExcluir.osNumber || osParaExcluir.numero;

            ordens = ordens.filter(o => {
                if (osId && o.id) return o.id !== osId;
                const num = o.osNumber || o.numero;
                return String(num) !== String(osNumero);
            });

            if (window.globalData) window.globalData.os = ordens;
            localStorage.setItem('avence_os', JSON.stringify(ordens));

            // Remove do Appwrite se estiver conectado
            if (window.appwrite && window.appwrite.databases && osId && !osId.startsWith('local_')) {
                try {
                    await window.appwrite.databases.deleteDocument(window.appwrite.DB_ID, window.appwrite.COL_OS, osId);
                } catch (apiErr) {
                    console.warn('[Todas OS] Erro ao remover do Appwrite:', apiErr);
                }
            }

            renderTodasOS();
            if (typeof closeModal === 'function') closeModal(document.getElementById('modal-excluir-os-confirm'));
            if (window.customAlert) window.customAlert(`Ordem de Serviço #${osNumero} excluída com sucesso!`, 'success');
        } catch (err) {
            console.error('Erro ao excluir O.S.:', err);
            if (window.customAlert) window.customAlert('Erro ao excluir: ' + err.message, 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
            osParaExcluir = null;
        }
    }

    // Expõe globalmente
    window.renderTodasOS = renderTodasOS;

    document.addEventListener('DOMContentLoaded', init);

})(window, document);
