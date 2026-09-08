/**
 * SISTEMA AVENCE CELL - MÓDULO DE GESTÃO DE CLIENTES
 * Permite listar, pesquisar, editar, excluir clientes,
 * visualizar histórico de O.S., contatar via WhatsApp e abrir O.S. diretamente.
 */

(function (window, document) {
    'use strict';

    let clienteParaExcluir = null;
    let clienteParaEditar = null;

    // Inicialização
    function init() {
        bindEvents();
        renderClientes();
        
        document.addEventListener('appwriteReady', () => {
            renderClientes();
        });
    }

    // Vincula eventos da tela e dos modais
    function bindEvents() {
        const searchInput = document.getElementById('cliente-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderClientes(e.target.value);
            });
        }

        // Botão Novo Cliente na tela de clientes
        const btnNovoCliente = document.getElementById('btn-novo-cliente-tela');
        if (btnNovoCliente) {
            btnNovoCliente.addEventListener('click', () => {
                if (typeof openModal === 'function') {
                    // Limpa formulário
                    const form = document.getElementById('form-cliente');
                    if (form) form.reset();
                    const modal = document.getElementById('modal-cadastro');
                    if (modal) openModal(modal);
                }
            });
        }

        // Botão Exportar Clientes
        const btnExportar = document.getElementById('btn-exportar-clientes');
        if (btnExportar) {
            btnExportar.addEventListener('click', exportarClientesCSV);
        }

        // Confirmação de Exclusão
        const btnConfirmarExcluir = document.getElementById('btn-confirmar-excluir-cliente');
        if (btnConfirmarExcluir) {
            btnConfirmarExcluir.addEventListener('click', executarExclusaoCliente);
        }

        // Formulário de Edição Direta
        const formEditar = document.getElementById('form-editar-cliente-direto');
        if (formEditar) {
            formEditar.addEventListener('submit', salvarEdicaoCliente);
        }
    }

    // Obtém lista segura de clientes
    function getClientes() {
        if (window.clientes && Array.isArray(window.clientes) && window.clientes.length > 0) {
            return window.clientes;
        }
        if (window.globalData && Array.isArray(window.globalData.clientes) && window.globalData.clientes.length > 0) {
            return window.globalData.clientes;
        }
        try {
            return JSON.parse(localStorage.getItem('avence_clientes') || '[]');
        } catch (e) {
            return [];
        }
    }

    // Obtém lista de Ordens de Serviço
    function getOrdens() {
        if (window.globalData && Array.isArray(window.globalData.os)) {
            return window.globalData.os;
        }
        try {
            return JSON.parse(localStorage.getItem('avence_os') || '[]');
        } catch (e) {
            return [];
        }
    }

    // Renderiza a lista de clientes
    function renderClientes(filtro = '') {
        const tbody = document.getElementById('clientes-table-tbody');
        const countTotalEl = document.getElementById('clientes-count-total');
        const countComOsEl = document.getElementById('clientes-count-com-os');
        if (!tbody) return;

        const clientes = getClientes();
        const ordens = getOrdens();
        const termo = (filtro || '').trim().toLowerCase();

        const filtrados = clientes.filter(c => {
            if (!termo) return true;
            const nome = (c.nome || '').toLowerCase();
            const cpf = (c.cpf || c.documento || '').toLowerCase();
            const tel = (c.telefone || c.celular || '').toLowerCase();
            const email = (c.email || '').toLowerCase();
            const end = (c.endereco || '').toLowerCase();
            return nome.includes(termo) || cpf.includes(termo) || tel.includes(termo) || email.includes(termo) || end.includes(termo);
        });

        // Contadores
        if (countTotalEl) countTotalEl.textContent = clientes.length;
        if (countComOsEl) {
            const clientesComOs = new Set(ordens.map(o => (typeof o.cliente === 'string' ? o.cliente : o.cliente?.nome || '').trim().toLowerCase()));
            const count = clientes.filter(c => clientesComOs.has((c.nome || '').trim().toLowerCase())).length;
            countComOsEl.textContent = count;
        }

        tbody.innerHTML = '';

        if (filtrados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <i class="ph ph-user-circle-dashed" style="font-size: 48px; display: block; margin-bottom: 8px; opacity: 0.5;"></i>
                        <p style="font-size: 15px; margin: 0;">Nenhum cliente encontrado${termo ? ' para a busca "' + filtro + '"' : ''}.</p>
                    </td>
                </tr>
            `;
            return;
        }

        filtrados.forEach((cliente, index) => {
            const fone = cliente.celular || cliente.telefone || '';
            const foneLimpo = fone.replace(/\D/g, '');
            const doc = cliente.cpf || cliente.documento || '-';
            const end = cliente.endereco || '-';

            // Conta quantas O.S. este cliente tem
            const totalOS = ordens.filter(o => {
                const clienteNome = (typeof o.cliente === 'string' ? o.cliente : o.cliente?.nome || '').trim().toLowerCase();
                return clienteNome === (cliente.nome || '').trim().toLowerCase();
            }).length;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--text-main);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--bg-surface-hover); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-weight: bold; color: var(--primary);">
                            ${(cliente.nome || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div>${cliente.nome}</div>
                            ${cliente.email ? `<span style="font-size: 11px; color: var(--text-muted);">${cliente.email}</span>` : ''}
                        </div>
                    </div>
                </td>
                <td style="color: var(--text-muted);">${doc}</td>
                <td>
                    ${fone ? `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span>${fone}</span>
                            ${foneLimpo ? `
                                <a href="https://wa.me/55${foneLimpo}?text=Ol%C3%A1%2C%20${encodeURIComponent(cliente.nome)}%21%20Aqui%20%C3%A9%20da%20Avence%20Cell." target="_blank" title="Conversar no WhatsApp" 
                                   style="color: #22c55e; font-size: 18px; display: inline-flex; align-items: center; text-decoration: none; padding: 2px;">
                                    <i class="ph ph-whatsapp-logo"></i>
                                </a>
                            ` : ''}
                        </div>
                    ` : '<span style="color: var(--text-muted);">-</span>'}
                </td>
                <td style="color: var(--text-muted); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${end}">
                    ${end}
                </td>
                <td style="text-align: center;">
                    <span class="badge ${totalOS > 0 ? 'badge-primary' : 'badge-secondary'}" style="padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                        ${totalOS} O.S.
                    </span>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                        <button class="btn btn-secondary btn-action-historico-cli" data-id="${cliente.id || index}" title="Ver Histórico de Serviços" style="padding: 6px 10px; font-size: 13px;">
                            <i class="ph ph-clock-counter-clockwise"></i>
                        </button>
                        <button class="btn btn-secondary btn-action-nova-os-cli" data-id="${cliente.id || index}" title="Abrir Nova O.S. para este Cliente" style="padding: 6px 10px; font-size: 13px; color: #22c55e;">
                            <i class="ph ph-folder-plus"></i>
                        </button>
                        <button class="btn btn-secondary btn-action-editar-cli" data-id="${cliente.id || index}" title="Editar Dados do Cliente" style="padding: 6px 10px; font-size: 13px; color: #3b82f6;">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        <button class="btn btn-secondary btn-action-excluir-cli" data-id="${cliente.id || index}" title="Excluir Cliente" style="padding: 6px 10px; font-size: 13px; color: #ef4444;">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            // Ações dos botões
            tr.querySelector('.btn-action-historico-cli').addEventListener('click', () => abrirHistoricoCliente(cliente));
            tr.querySelector('.btn-action-nova-os-cli').addEventListener('click', () => abrirNovaOsParaCliente(cliente));
            tr.querySelector('.btn-action-editar-cli').addEventListener('click', () => abrirModalEditarCliente(cliente));
            tr.querySelector('.btn-action-excluir-cli').addEventListener('click', () => abrirModalExcluirCliente(cliente));

            tbody.appendChild(tr);
        });
    }

    // Abre histórico de O.S. do cliente
    function abrirHistoricoCliente(cliente) {
        if (!cliente) return;
        const modalHistorico = document.getElementById('modal-historico-cliente');
        const nomeSpan = document.getElementById('historico-cliente-nome');
        const tbody = document.getElementById('historico-cliente-tbody');
        if (!modalHistorico || !tbody) return;

        if (nomeSpan) nomeSpan.textContent = cliente.nome;
        tbody.innerHTML = '';

        const ordens = getOrdens().filter(o => {
            const clienteNome = (typeof o.cliente === 'string' ? o.cliente : o.cliente?.nome || '').trim().toLowerCase();
            return clienteNome === (cliente.nome || '').trim().toLowerCase();
        });

        if (ordens.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhuma O.S. cadastrada para este cliente.</td></tr>';
        } else {
            ordens.forEach(os => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-os', os.osNumber || os.numero);
                tr.style.cursor = 'pointer';
                const statusColor = os.status === 'Encerrada' ? '#22c55e' : (os.status === 'Pronto' ? '#3b82f6' : '#f59e0b');
                tr.innerHTML = `
                    <td style="font-weight: bold; color: var(--primary);">#${os.osNumber || os.numero}</td>
                    <td>${(os.marca || '') + ' ' + (os.modelo || '')}</td>
                    <td>${os.defeito || os.problema || '-'}</td>
                    <td>${os.data || os.dataEntrada || '-'}</td>
                    <td><span style="background: ${statusColor}20; color: ${statusColor}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">${os.status || 'Aberta'}</span></td>
                `;
                tr.addEventListener('click', () => {
                    tr.parentElement.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                    tr.classList.add('selected-row');
                    const btnAlt = document.getElementById('btn-alterar-os-historico');
                    if (btnAlt) {
                        btnAlt.disabled = false;
                        btnAlt.style.opacity = '1';
                        btnAlt.style.cursor = 'pointer';
                    }
                });
                tbody.appendChild(tr);
            });
        }

        if (typeof openModal === 'function') openModal(modalHistorico);
    }

    // Abre Nova O.S. com dados do cliente já preenchidos
    function abrirNovaOsParaCliente(cliente) {
        if (!cliente) return;
        if (typeof openModal === 'function') {
            const modalAbrirOs = document.getElementById('modal-abrir-os');
            if (modalAbrirOs) {
                // Preenche dados do cliente
                const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
                setVal('c_nome', cliente.nome);
                setVal('c_telefone', cliente.telefone || cliente.celular || '');
                setVal('c_celular', cliente.celular || cliente.telefone || '');
                setVal('c_documento', cliente.cpf || cliente.documento || '');
                setVal('c_endereco', cliente.endereco || '');
                setVal('c_email', cliente.email || '');

                openModal(modalAbrirOs);
            }
        }
    }

    // Modal de Edição de Cliente
    function abrirModalEditarCliente(cliente) {
        clienteParaEditar = cliente;
        const modal = document.getElementById('modal-editar-cliente-direto');
        if (!modal) return;

        document.getElementById('edit-cli-nome').value = cliente.nome || '';
        document.getElementById('edit-cli-cpf').value = cliente.cpf || cliente.documento || '';
        document.getElementById('edit-cli-telefone').value = cliente.telefone || '';
        document.getElementById('edit-cli-celular').value = cliente.celular || '';
        document.getElementById('edit-cli-email').value = cliente.email || '';
        document.getElementById('edit-cli-endereco').value = cliente.endereco || '';
        document.getElementById('edit-cli-obs').value = cliente.observacoes || cliente.obs || '';

        if (typeof openModal === 'function') openModal(modal);
    }

    // Salva alteração de cliente
    async function salvarEdicaoCliente(e) {
        e.preventDefault();
        if (!clienteParaEditar) return;

        const nome = document.getElementById('edit-cli-nome').value.trim();
        if (!nome) {
            if (window.customAlert) window.customAlert('O nome do cliente é obrigatório.', 'warning');
            return;
        }

        const atualizado = {
            ...clienteParaEditar,
            nome: nome,
            cpf: document.getElementById('edit-cli-cpf').value.trim(),
            documento: document.getElementById('edit-cli-cpf').value.trim(),
            telefone: document.getElementById('edit-cli-telefone').value.trim(),
            celular: document.getElementById('edit-cli-celular').value.trim(),
            email: document.getElementById('edit-cli-email').value.trim(),
            endereco: document.getElementById('edit-cli-endereco').value.trim(),
            observacoes: document.getElementById('edit-cli-obs').value.trim()
        };

        const btn = document.getElementById('btn-salvar-edicao-cliente');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
        btn.disabled = true;

        try {
            // Atualiza em window.clientes e localStorage
            let clientes = getClientes();
            const idx = clientes.findIndex(c => (c.id && c.id === clienteParaEditar.id) || c.nome.toLowerCase() === clienteParaEditar.nome.toLowerCase());

            if (idx >= 0) {
                clientes[idx] = atualizado;
            } else {
                clientes.push(atualizado);
            }

            window.clientes = clientes;
            if (window.globalData) window.globalData.clientes = clientes;
            localStorage.setItem('avence_clientes', JSON.stringify(clientes));

            // Sincroniza com Appwrite se houver conexão e id
            if (window.appwrite && window.appwrite.databases && atualizado.id && !atualizado.id.startsWith('local_')) {
                try {
                    const payload = { ...atualizado };
                    delete payload.id;
                    delete payload.$id;
                    delete payload.$permissions;
                    delete payload.$createdAt;
                    delete payload.$updatedAt;
                    delete payload.$databaseId;
                    delete payload.$collectionId;
                    await window.appwrite.databases.updateDocument(window.appwrite.DB_ID, window.appwrite.COL_CLIENTES, atualizado.id, payload);
                } catch (apiErr) {
                    console.warn('[Clientes] Sincronização em nuvem pendente:', apiErr);
                }
            }

            renderClientes();
            if (typeof closeModal === 'function') closeModal(document.getElementById('modal-editar-cliente-direto'));
            if (window.customAlert) window.customAlert('Cliente atualizado com sucesso!', 'success');
        } catch (err) {
            console.error('Erro ao atualizar cliente:', err);
            if (window.customAlert) window.customAlert('Erro ao atualizar: ' + err.message, 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    // Modal de Exclusão de Cliente
    function abrirModalExcluirCliente(cliente) {
        clienteParaExcluir = cliente;
        const modal = document.getElementById('modal-excluir-cliente-confirm');
        const nomeEl = document.getElementById('excluir-cliente-nome');
        if (!modal) return;

        if (nomeEl) nomeEl.textContent = cliente.nome;
        if (typeof openModal === 'function') openModal(modal);
    }

    // Executa exclusão de cliente
    async function executarExclusaoCliente() {
        if (!clienteParaExcluir) return;

        const btn = document.getElementById('btn-confirmar-excluir-cliente');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Excluindo...';
        btn.disabled = true;

        try {
            let clientes = getClientes();
            const clienteId = clienteParaExcluir.id;
            const clienteNome = clienteParaExcluir.nome;

            clientes = clientes.filter(c => {
                if (clienteId && c.id) return c.id !== clienteId;
                return c.nome.toLowerCase() !== clienteNome.toLowerCase();
            });

            window.clientes = clientes;
            if (window.globalData) window.globalData.clientes = clientes;
            localStorage.setItem('avence_clientes', JSON.stringify(clientes));

            // Remove do Appwrite se estiver conectado
            if (window.appwrite && window.appwrite.databases && clienteId && !clienteId.startsWith('local_')) {
                try {
                    await window.appwrite.databases.deleteDocument(window.appwrite.DB_ID, window.appwrite.COL_CLIENTES, clienteId);
                } catch (apiErr) {
                    console.warn('[Clientes] Erro ao remover do Appwrite:', apiErr);
                }
            }

            renderClientes();
            if (typeof closeModal === 'function') closeModal(document.getElementById('modal-excluir-cliente-confirm'));
            if (window.customAlert) window.customAlert(`Cliente "${clienteNome}" excluído com sucesso!`, 'success');
        } catch (err) {
            console.error('Erro ao excluir cliente:', err);
            if (window.customAlert) window.customAlert('Erro ao excluir: ' + err.message, 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
            clienteParaExcluir = null;
        }
    }

    // Exportação em formato CSV
    function exportarClientesCSV() {
        const clientes = getClientes();
        if (clientes.length === 0) {
            if (window.customAlert) window.customAlert('Nenhum cliente para exportar.', 'warning');
            return;
        }

        const headers = ['Nome', 'CPF/Documento', 'Telefone', 'Celular', 'Email', 'Endereço', 'Observações'];
        const rows = clientes.map(c => [
            `"${(c.nome || '').replace(/"/g, '""')}"`,
            `"${(c.cpf || c.documento || '').replace(/"/g, '""')}"`,
            `"${(c.telefone || '').replace(/"/g, '""')}"`,
            `"${(c.celular || '').replace(/"/g, '""')}"`,
            `"${(c.email || '').replace(/"/g, '""')}"`,
            `"${(c.endereco || '').replace(/"/g, '""')}"`,
            `"${(c.observacoes || c.obs || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `clientes_avence_cell_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Expõe funções públicas
    window.renderClientes = renderClientes;

    document.addEventListener('DOMContentLoaded', init);

})(window, document);
