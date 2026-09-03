// -- Desabilita autocomplete do navegador em todo o sistema --
document.querySelectorAll('input, form').forEach(el => {
    el.setAttribute('autocomplete', 'off'); // Bloqueia auto-preenchimento
    if (el.tagName.toLowerCase() === 'input' && el.type !== 'password' && el.type !== 'email') {
        el.setAttribute('autocomplete', 'new-password'); // Hack para forçar o Chrome a não preencher o nome de usuário (Jean Pedroso)
    }
});

// DOMContentLoaded Wrapper Removed
    // -- Limpa o financeiro a pedido do usuário --
    if (!localStorage.getItem('financeiro_zerado_v2')) {
        localStorage.removeItem('avence_transacoes_caixa');
        localStorage.removeItem('avence_fundo_caixa');
        localStorage.removeItem('avence_caixa_aberto');
        localStorage.removeItem('avence_ultimo_fechamento');
        localStorage.setItem('financeiro_zerado_v2', 'true');
        alert('Caixa financeiro zerado novamente com sucesso! A página será atualizada.');
        location.reload();
    }
    // ---------------------------------------------
    
    // Custom Alert Function
    window.customAlert = function(message, type = 'warning', showCancel = false, onConfirm = null) {
        const modal = document.getElementById('modal-alerta');
        if (!modal) {
            if (showCancel) {
                if (confirm(message) && onConfirm) onConfirm();
            } else {
                alert(message);
            }
            return;
        }
        
        document.getElementById('alerta-mensagem').innerHTML = message;
        const icon = document.getElementById('alerta-icon');
        const titulo = document.getElementById('alerta-titulo');
        const btnCancelar = document.getElementById('btn-cancelar-alerta');
        
        if (type === 'success') {
            icon.className = 'ph ph-check-circle';
            icon.style.color = '#22c55e';
            titulo.textContent = 'Sucesso';
        } else {
            icon.className = 'ph ph-warning-circle';
            icon.style.color = '#ef4444';
            titulo.textContent = 'Atenção';
        }

        if (btnCancelar) {
            btnCancelar.style.display = showCancel ? 'inline-flex' : 'none';
            btnCancelar.onclick = () => modal.classList.remove('active');
        }
        
        modal.classList.add('active');
        document.getElementById('btn-fechar-alerta').onclick = () => {
            modal.classList.remove('active');
            if (onConfirm) onConfirm();
        };
    };

    // UI Elements
    const menuBtns = document.querySelectorAll('.menu-btn');
    const screens = document.querySelectorAll('.screen');
    const pageTitle = document.getElementById('page-title');
    const datetimeDisplay = document.getElementById('datetime-display');
    const searchInput = document.getElementById('client-search');
    
    // ---------------------------------------------
    // Persistência de Tela & Logo Home
    // ---------------------------------------------
    const lastScreenId = localStorage.getItem('avence_last_screen');
    
    // Restore open modals
    const savedModals = JSON.parse(localStorage.getItem('avence_open_modals')) || [];
    savedModals.forEach(modalId => {
        const m = document.getElementById(modalId);
        if (m) m.classList.add('active');
    });
    if (lastScreenId && lastScreenId !== 'dashboard') {
        const lastBtn = document.querySelector(`.menu-btn[data-target="${lastScreenId}"]`);
        if (lastBtn) {
            menuBtns.forEach(b => b.classList.remove('active'));
            screens.forEach(s => s.classList.remove('active'));
            lastBtn.classList.add('active');
            const targetScreen = document.getElementById(lastScreenId);
            if (targetScreen) targetScreen.classList.add('active');
            pageTitle.textContent = lastBtn.querySelector('span').textContent;
        }
    }
    
    const btnLogoHome = document.getElementById('btn-logo-home');
    if (btnLogoHome) {
        btnLogoHome.addEventListener('click', () => {
            menuBtns.forEach(b => b.classList.remove('active'));
            screens.forEach(s => s.classList.remove('active'));
            const dashboard = document.getElementById('dashboard');
            if (dashboard) dashboard.classList.add('active');
            pageTitle.textContent = 'Dashboard';
            localStorage.setItem('avence_last_screen', 'dashboard');
        });
    }
    
    // Modals
    const modalCadastro = document.getElementById('modal-cadastro');
    const modalAparelho = document.getElementById('modal-aparelho');
    const modalIntake = document.getElementById('modal-intake');
    const closeBtns = document.querySelectorAll('.close-btn[data-close], .btn[data-close]');
    
    // Action Buttons
    const btnGravarCliente = document.getElementById('btn-gravar-cliente');
    const btnCelular = document.getElementById('btn-celular');
    const btnNotebook = document.getElementById('btn-notebook');
    const btnFinalizarImprimir = document.getElementById('btn-finalizar-imprimir');
    const btnSalvarConfig = document.getElementById('btn-salvar-config');
    const btnEditarClienteOS = document.getElementById('btn-editar-cliente-os');
    
    // In-memory data store for the current flow
    let currentFlowData = JSON.parse(localStorage.getItem('avence_current_flow')) || {
        cliente: {},
        aparelho: {}
    };

    // Auto-save currentFlowData when modified by proxy or manually
    const saveFlowData = () => localStorage.setItem('avence_current_flow', JSON.stringify(currentFlowData));
    setInterval(saveFlowData, 1000);

    let openModalsState = JSON.parse(localStorage.getItem('avence_open_modals')) || [];

    window.updateTecnicoDropdowns = function() {
        const config = JSON.parse(localStorage.getItem('avence_config')) || {};
        const colabs = JSON.parse(localStorage.getItem('avence_colaboradores')) || [];
        
        const tecnicoSelect = document.getElementById('a_tecnico');
        if (!tecnicoSelect) return;
        
        tecnicoSelect.innerHTML = '';
        const optNone = document.createElement('option');
        optNone.value = 'Não definido';
        optNone.textContent = 'Não definido';
        tecnicoSelect.appendChild(optNone);
        
        const added = new Set();
        added.add('Não definido');
        
        // Add from colaboradores
        colabs.forEach(c => {
            const cargos = Array.isArray(c.cargo) ? c.cargo : [c.cargo];
            if (cargos.includes('Tecnico')) {
                if (!added.has(c.nome)) {
                    const opt = document.createElement('option');
                    opt.value = c.nome;
                    opt.textContent = c.nome;
                    tecnicoSelect.appendChild(opt);
                    added.add(c.nome);
                }
            }
        });
        
        // Add from config (legacy manual config)
        const manualTecnicos = (config.tecnico || '').split(',').map(t => t.trim()).filter(Boolean);
        manualTecnicos.forEach(tec => {
            if (!added.has(tec)) {
                const opt = document.createElement('option');
                opt.value = tec;
                opt.textContent = tec;
                tecnicoSelect.appendChild(opt);
                added.add(tec);
            }
        });
    };

    window.updateVendedorDropdowns = function() {
        const colabs = JSON.parse(localStorage.getItem('avence_colaboradores')) || [];
        const vendedorSelect = document.getElementById('pdv-vendedor');
        if (!vendedorSelect) return;
        
        vendedorSelect.innerHTML = '<option value="">Selecione o Vendedor...</option>';
        colabs.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.nome;
            opt.textContent = `${c.nome} (${Array.isArray(c.cargo) ? c.cargo.join(', ') : c.cargo})`;
            vendedorSelect.appendChild(opt);
        });

        const loggedUserStr = sessionStorage.getItem('avence_session_logged');
        if (loggedUserStr) {
            const loggedUser = JSON.parse(loggedUserStr);
            setTimeout(() => {
                const sel = document.getElementById('pdv-vendedor');
                if (sel) {
                    for(let i = 0; i < sel.options.length; i++) {
                        if (sel.options[i].value === loggedUser.nome) {
                            sel.selectedIndex = i;
                            break;
                        }
                    }
                }
            }, 100);
        }
    };

    // Initialize Store Config from localStorage
    function loadConfig() {
        const config = JSON.parse(localStorage.getItem('avence_config')) || {
            nome: 'AVENCE CELL',
            endereco: 'RUA SANTA CATARINA - 35, IVAIPORA-PR',
            telefone: '(43) 9900-4377',
            email: 'notecenter_ivp@hotmail.com',
            emailRelatorio: '',
            tecnico: 'Não definido',
            tema: 'dark',
            senhaGerente: '1234',
            limiteCaixa: 500,
            osTitulo: 'NOTE BOOK CENTER',
            osAssinatura: 'NOTE BOOK CENTER',
            osEndereco: 'RUA SANTA CATARINA - 35, IVAIPORA-PR',
            osComplemento: 'COMPLEMENTO RUA ATRAS DO BANCO DO BRASIL',
            osTelefone: '(43) 99900-4377',
            osEmail: 'notecenter_ivp@hotmail.com',
            osTermos: '1) PRAZO PARA RETIRAR: 90 DIAS; GARANTIA 90 DIAS;\n2) GARANTIA E ENTREGA SOMENTE COM A ORDEM DE SERVIÇO (O.S.);\n3) REAJUSTE DE 10% A CADA 30 DIAS VENCIDOS (TAXA CONSERVAÇÃO).\n4) APOS 90 DIAS NAO RETIRAR O EQUIPAMENTO SERA FEITA A RECICLAGEM DO MESMO'
        };
        
        // Update Form
        document.getElementById('config-loja').value = config.nome;
        document.getElementById('config-endereco').value = config.endereco;
        document.getElementById('config-telefone').value = config.telefone || '';
        document.getElementById('config-email').value = config.email || '';
        if (document.getElementById('config-tema')) {
            document.getElementById('config-tema').value = config.tema || 'dark';
        }
        if (document.getElementById('config-email-relatorio')) {
            document.getElementById('config-email-relatorio').value = config.emailRelatorio || '';
        }
        if (document.getElementById('config-tecnico')) {
            document.getElementById('config-tecnico').value = config.tecnico || 'Não definido';
        }
        if (document.getElementById('config-senha-gerente')) {
            document.getElementById('config-senha-gerente').value = config.senhaGerente || '1234';
        }
        
        if (document.getElementById('config-limite-caixa')) {
            document.getElementById('config-limite-caixa').value = config.limiteCaixa !== undefined ? config.limiteCaixa : 500;
        }
        if (document.getElementById('config-horario-aviso')) {
            document.getElementById('config-horario-aviso').value = config.horarioAviso || '18:00';
        }
        if (document.getElementById('config-horario-bloqueio')) {
            document.getElementById('config-horario-bloqueio').value = config.horarioBloqueio || '18:30';
        }
        
        // OS Fields
        if (document.getElementById('config-os-titulo')) document.getElementById('config-os-titulo').value = config.osTitulo || 'NOTE BOOK CENTER';
        if (document.getElementById('config-os-assinatura')) document.getElementById('config-os-assinatura').value = config.osAssinatura || 'NOTE BOOK CENTER';
        if (document.getElementById('config-os-endereco')) document.getElementById('config-os-endereco').value = config.osEndereco || 'RUA SANTA CATARINA - 35, IVAIPORA-PR';
        if (document.getElementById('config-os-complemento')) document.getElementById('config-os-complemento').value = config.osComplemento || 'COMPLEMENTO RUA ATRAS DO BANCO DO BRASIL';
        if (document.getElementById('config-os-telefone')) document.getElementById('config-os-telefone').value = config.osTelefone || '(43) 99900-4377';
        if (document.getElementById('config-os-email')) document.getElementById('config-os-email').value = config.osEmail || 'notecenter_ivp@hotmail.com';
        if (document.getElementById('config-os-termos')) document.getElementById('config-os-termos').value = config.osTermos || '1) PRAZO PARA RETIRAR: 90 DIAS; GARANTIA 90 DIAS;\n2) GARANTIA E ENTREGA SOMENTE COM A ORDEM DE SERVIÇO (O.S.);\n3) REAJUSTE DE 10% A CADA 30 DIAS VENCIDOS (TAXA CONSERVAÇÃO).\n4) APOS 90 DIAS NAO RETIRAR O EQUIPAMENTO SERA FEITA A RECICLAGEM DO MESMO';

        // Export to window for global access
        window.lojaConfig = config;
        // Update UI
        document.getElementById('store-name-display').textContent = config.nome;
        window.updateTecnicoDropdowns();
        window.updateVendedorDropdowns();
        
        // Update Print Header
        document.getElementById('p_store_name').textContent = config.nome;
        document.getElementById('p_store_address').textContent = config.endereco;
        document.getElementById('p_store_phone').textContent = config.telefone;
        document.getElementById('p_store_email').textContent = config.email;
        document.getElementById('p_sig_store').textContent = config.nome.toUpperCase();

        if (config.bgImage) {
            document.body.style.backgroundImage = `url(${config.bgImage})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundRepeat = 'no-repeat';
        }

        // Apply Theme
        if (config.tema === 'light') {
            document.body.classList.add('theme-light');
        } else {
            document.body.classList.remove('theme-light');
        }
    }
    
    loadConfig();

    btnSalvarConfig.addEventListener('click', async () => {
        const logoInput = document.getElementById('config-logo');
        const currentConfig = JSON.parse(localStorage.getItem('avence_config')) || {};
        let logoImage = currentConfig.logoImage || null;

        const readFileAsDataURL = (file) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        };

        if (logoInput && logoInput.files && logoInput.files[0]) {
            logoImage = await readFileAsDataURL(logoInput.files[0]);
        }

        const config = {
            nome: document.getElementById('config-loja').value,
            endereco: document.getElementById('config-endereco').value,
            telefone: document.getElementById('config-telefone').value,
            email: document.getElementById('config-email').value,
            emailRelatorio: document.getElementById('config-email-relatorio') ? document.getElementById('config-email-relatorio').value : '',
            tecnico: document.getElementById('config-tecnico') ? document.getElementById('config-tecnico').value : 'Não definido',
            tema: document.getElementById('config-tema') ? document.getElementById('config-tema').value : 'dark',
            senhaGerente: document.getElementById('config-senha-gerente') ? document.getElementById('config-senha-gerente').value : '1234',
            limiteCaixa: document.getElementById('config-limite-caixa') ? parseFloat(document.getElementById('config-limite-caixa').value) : 500,
            horarioAviso: document.getElementById('config-horario-aviso') ? document.getElementById('config-horario-aviso').value : '18:00',
            horarioBloqueio: document.getElementById('config-horario-bloqueio') ? document.getElementById('config-horario-bloqueio').value : '18:30',
            osTitulo: document.getElementById('config-os-titulo') ? document.getElementById('config-os-titulo').value : 'NOTE BOOK CENTER',
            osAssinatura: document.getElementById('config-os-assinatura') ? document.getElementById('config-os-assinatura').value : 'NOTE BOOK CENTER',
            osEndereco: document.getElementById('config-os-endereco') ? document.getElementById('config-os-endereco').value : 'RUA SANTA CATARINA - 35, IVAIPORA-PR',
            osComplemento: document.getElementById('config-os-complemento') ? document.getElementById('config-os-complemento').value : 'COMPLEMENTO RUA ATRAS DO BANCO DO BRASIL',
            osTelefone: document.getElementById('config-os-telefone') ? document.getElementById('config-os-telefone').value : '(43) 99900-4377',
            osEmail: document.getElementById('config-os-email') ? document.getElementById('config-os-email').value : 'notecenter_ivp@hotmail.com',
            osTermos: document.getElementById('config-os-termos') ? document.getElementById('config-os-termos').value : '1) PRAZO PARA RETIRAR: 90 DIAS; GARANTIA 90 DIAS;\n2) GARANTIA E ENTREGA SOMENTE COM A ORDEM DE SERVIÇO (O.S.);\n3) REAJUSTE DE 10% A CADA 30 DIAS VENCIDOS (TAXA CONSERVAÇÃO).\n4) APOS 90 DIAS NAO RETIRAR O EQUIPAMENTO SERA FEITA A RECICLAGEM DO MESMO',
            logoImage: logoImage
        };
        
        localStorage.setItem('avence_config', JSON.stringify(config));
        loadConfig();
        window.customAlert('Configurações salvas com sucesso!', 'success');
    });

    // Update Clock
    function updateClock() {
        const now = new Date();
        const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
        const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const dayName = days[now.getDay()];
        const day = String(now.getDate()).padStart(2, '0');
        const month = months[now.getMonth()];
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        datetimeDisplay.textContent = `${dayName}, ${day}/${month}, ${hour}:${minute}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Navigation Logic
    let currentOSAction = ''; // 'alterar' or 'encerrar'

    menuBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetModal = btn.getAttribute('data-modal');
            const targetId = btn.getAttribute('data-target');

            // --- Bloqueio de Caixa Fechado ---
            if (window.caixaAberto === false) {
                if (targetId !== 'financeiro' && targetModal !== 'modal-configuracoes') {
                    window.customAlert('O Caixa está FECHADO!<br><br>Abra o caixa no Painel Financeiro antes de acessar as outras telas do sistema.', 'warning');
                    
                    // Força a tela para o financeiro se tentar acessar outra
                    const btnFin = document.querySelector('.menu-btn[data-target="financeiro"]');
                    if (btnFin && targetId !== 'financeiro') {
                        menuBtns.forEach(b => b.classList.remove('active'));
                        screens.forEach(s => s.classList.remove('active'));
                        btnFin.classList.add('active');
                        const finScreen = document.getElementById('financeiro');
                        if(finScreen) finScreen.classList.add('active');
                        pageTitle.textContent = 'Financeiro';
                        localStorage.setItem('avence_last_screen', 'financeiro');
                    }
                    return;
                }
            }

            if (targetModal) {
                if (targetModal === 'modal-configuracoes') {
                    if (window.loggedUser && !(Array.isArray(window.loggedUser.cargo) ? window.loggedUser.cargo : [window.loggedUser.cargo]).some(r => ['Dono', 'Gerente'].includes(r))) {
                        window.customAlert('Acesso Restrito:<br>Apenas Dono ou Gerente podem acessar as configurações.', 'error');
                        return;
                    }
                }
                const modal = document.getElementById(targetModal);
                if (modal) {
                    openModal(modal);
                    if (targetModal === 'modal-abrir-os') {
                        setTimeout(() => document.getElementById('client-search').focus(), 300);
                    }
                }
                return;
            }

            // --- Bloqueio de Permissão para Relatórios ---
            if (targetId === 'pdv') {
                if(typeof window.renderPdvCart === 'function') window.renderPdvCart();
                if(typeof window.updateVendedorDropdowns === 'function') window.updateVendedorDropdowns();
                setTimeout(() => { document.getElementById('pdv-search')?.focus(); }, 100);
            }
            if (targetId === 'relatorios') {
                if (window.loggedUser && !(Array.isArray(window.loggedUser.cargo) ? window.loggedUser.cargo : [window.loggedUser.cargo]).includes('Dono')) {
                    window.customAlert('Acesso Restrito:<br>Apenas o administrador (Dono) pode acessar os relatórios.', 'error');
                    return;
                }
            }

            if (targetId === 'alterar-os' || targetId === 'encerrar-os') {
                currentOSAction = targetId === 'alterar-os' ? 'alterar' : 'encerrar';
                const titulo = document.getElementById('titulo-pesquisa-os');
                if(titulo) {
                    titulo.innerHTML = targetId === 'alterar-os' ? '<i class="ph ph-pencil-simple"></i> Alterar O.S' : '<i class="ph ph-check-circle"></i> Encerrar O.S';
                }
                const inputPesquisa = document.getElementById('input-pesquisa-os');
                if(inputPesquisa) inputPesquisa.value = '';
                
                openModal(document.getElementById('modal-pesquisa-os'));
                setTimeout(() => { if(inputPesquisa) inputPesquisa.focus(); }, 300);
                return;
            }

            if (targetId) {
                menuBtns.forEach(b => b.classList.remove('active'));
                screens.forEach(s => s.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(targetId).classList.add('active');
                
                pageTitle.textContent = btn.querySelector('span').textContent;
                localStorage.setItem('avence_last_screen', targetId);
            }
        });
    });

    // OS Search Logic
    const btnConfirmarPesquisa = document.getElementById('btn-confirmar-pesquisa-os');
    if (btnConfirmarPesquisa) {
        btnConfirmarPesquisa.addEventListener('click', () => {
            const osNumber = document.getElementById('input-pesquisa-os').value.trim();
            if (!osNumber) {
                window.customAlert('Por favor, informe o número da O.S.', 'warning');
                return;
            }

            const selectedOS = window.globalData && window.globalData.os ? window.globalData.os.find(os => os.osNumber === osNumber) : null;
            if (!selectedOS) {
                window.customAlert(`Ops! Não encontramos nenhuma O.S com o número "${osNumber}". Verifique e tente novamente.`, 'error');
                return;
            }

            if (selectedOS.status === 'Encerrada' || selectedOS.status === 'Finalizada') {
                window.customAlert(`A O.S. Nº ${osNumber} já encontra-se Encerrada e não está mais disponível para alterações.`, 'warning');
                return;
            }

            // Popula os dados para o fluxo atual mantendo o ID para reconhecer que é edição
            currentFlowData = { ...selectedOS };

            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            
            // Popula campos de Cliente e Aparelho (caso Alterar)
            setVal('c_nome', selectedOS.cliente);
            setVal('c_telefone', selectedOS.fones);
            setVal('a_marca', selectedOS.marca || selectedOS.aparelho?.marca);
            setVal('a_modelo', selectedOS.modelo || selectedOS.aparelho?.modelo);
            setVal('a_serie', selectedOS.serie || selectedOS.aparelho?.serie);
            setVal('a_acessorio', selectedOS.acessorio || selectedOS.aparelho?.acessorio);
            setVal('a_aparencia', selectedOS.aparencia || selectedOS.aparelho?.aparencia);
            setVal('a_defeito', selectedOS.defeito || selectedOS.aparelho?.defeito);
            setVal('a_laudo', selectedOS.laudo || selectedOS.orcamento?.laudo);
            setVal('a_adiantamento', selectedOS.adiantamento || selectedOS.orcamento?.adiantamento || '0.00');
            
            let mo = selectedOS.maodeobra || selectedOS.orcamento?.maodeobra || 0;
            const pecas = selectedOS.pecas || selectedOS.orcamento?.pecas || 0;
            const des = selectedOS.deslocamento || selectedOS.orcamento?.deslocamento || 0;
            const ter = selectedOS.terceiros || selectedOS.orcamento?.terceiros || 0;
            const out = selectedOS.outros || selectedOS.orcamento?.outros || 0;
            
            const totalOS = selectedOS.total || 0;
            
            // Fallback para O.S. muito antigas que s tinham o total e no tinham os servios preenchidos
            if (mo == 0 && pecas == 0 && des == 0 && ter == 0 && out == 0 && totalOS > 0) {
                mo = totalOS;
            }

            setVal('a_maodeobra', mo || '0.00');
            setVal('a_pecas', pecas || '0.00');
            setVal('a_deslocamento', des || '0.00');
            setVal('a_terceiros', ter || '0.00');
            setVal('a_outros', out || '0.00');

            closeModal(document.getElementById('modal-pesquisa-os'));

            if (currentOSAction === 'alterar') {
                document.getElementById('intake-os-number').textContent = currentFlowData.osNumber !== undefined ? currentFlowData.osNumber : (currentFlowData.numero || '-');
                document.getElementById('intake-client-name').textContent = typeof currentFlowData.cliente === 'string' ? currentFlowData.cliente : (currentFlowData.cliente?.nome || '-');
                document.getElementById('intake-client-phone').textContent = currentFlowData.fones || currentFlowData.cliente?.telefone || '-';
                
                openModal(document.getElementById('modal-intake'));
                
                const tabAparelho = document.querySelector('.os-tab[data-target="tab-aparelho"]');
                if (tabAparelho) tabAparelho.click();
                
                setTimeout(() => document.getElementById('a_marca').focus(), 300);
            } else if (currentOSAction === 'encerrar') {
                calculateCheckoutTotal();
                document.getElementById('checkout-valorpago').value = '';
                document.getElementById('checkout-troco').textContent = 'R$ 0,00';
                document.getElementById('checkout-pagamento').value = 'Dinheiro';
                document.getElementById('checkout-calendario-container').style.display = 'none';
                const pCont = document.getElementById('checkout-parcelas-container');
                if (pCont) pCont.style.display = 'none';
                const vCont = document.getElementById('checkout-valores-container');
                if (vCont) vCont.style.display = 'grid';
                openModal(document.getElementById('modal-checkout'));
                setTimeout(() => document.getElementById('checkout-valorpago').focus(), 300);
            }
        });
        
        // Enter to confirm OS
        document.getElementById('input-pesquisa-os')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') btnConfirmarPesquisa.click();
        });
    }

    // Budget Calculation
    function calculateTotal() {
        const adiantamento = parseFloat(document.getElementById('a_adiantamento')?.value) || 0;
        const maodeobra = parseFloat(document.getElementById('a_maodeobra')?.value) || 0;
        const pecas = parseFloat(document.getElementById('a_pecas')?.value) || 0;
        const deslocamento = parseFloat(document.getElementById('a_deslocamento')?.value) || 0;
        const terceiros = parseFloat(document.getElementById('a_terceiros')?.value) || 0;
        const outros = parseFloat(document.getElementById('a_outros')?.value) || 0;

        const total = maodeobra + pecas + deslocamento + terceiros + outros - adiantamento;
        const formattedTotal = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        const totalEl = document.getElementById('a_total');
        if (totalEl) totalEl.textContent = formattedTotal;
        
        const checkoutTotal = document.getElementById('checkout-total');
        if(checkoutTotal) checkoutTotal.textContent = formattedTotal;
        
        return total;
    }

    const budgetInputs = ['a_adiantamento', 'a_maodeobra', 'a_pecas', 'a_deslocamento', 'a_terceiros', 'a_outros'];
    budgetInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calculateTotal);
    });

    // Checkout Logic
    const selectPagamento = document.getElementById('checkout-pagamento');
    const calContainer = document.getElementById('checkout-calendario-container');
    const valorPagoInput = document.getElementById('checkout-valorpago');
    const trocoDiv = document.getElementById('checkout-troco');

    const parcelasContainer = document.getElementById('checkout-parcelas-container');
    const valoresContainer = document.getElementById('checkout-valores-container');

    function calculateCheckoutTotal() {
        const baseTotal = calculateTotal();
        let finalTotal = baseTotal;
        const valPagamento = selectPagamento?.value || 'Dinheiro';
        
        if (valPagamento === 'Cartão Crédito' || valPagamento === 'Cartão de Crédito' || valPagamento.includes('Crédito')) {
            const selectParcelas = document.getElementById('checkout-parcelas');
            const parcelas = parseInt(selectParcelas?.value) || 1;
            const taxasMaquininha = {
                1: 0,
                2: 0.0570,
                3: 0.0652,
                4: 0.07355,
                5: 0.0819,
                6: 0.09033,
                7: 0.09877,
                8: 0.10733,
                9: 0.11588,
                10: 0.12444,
                11: 0.133,
                12: 0.1415
            };
            
            if (parcelas > 1) {
                const jurosValor = baseTotal * (taxasMaquininha[parcelas] || 0);
                finalTotal = baseTotal + jurosValor;
            }
        }
        
        const totalDiv = document.getElementById('checkout-total');
        if (totalDiv) {
            totalDiv.textContent = finalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        return finalTotal;
    }

    if (selectPagamento) {
        selectPagamento.addEventListener('change', (e) => {
            const val = e.target.value;
            
            if (val === 'Notinha') {
                calContainer.style.display = 'flex';
            } else {
                calContainer.style.display = 'none';
            }
            
            if (val === 'Cartão Crédito' || val === 'Cartão de Crédito' || val.includes('Crédito')) {
                if (parcelasContainer) parcelasContainer.style.display = 'flex';
            } else {
                if (parcelasContainer) parcelasContainer.style.display = 'none';
            }
            
            if (val !== 'Dinheiro') {
                if (valoresContainer) valoresContainer.style.display = 'none';
            } else {
                if (valoresContainer) valoresContainer.style.display = 'grid';
            }
            
            calculateCheckoutTotal();
        });
    }
    
    const selectParcelas = document.getElementById('checkout-parcelas');
    if (selectParcelas) {
        selectParcelas.addEventListener('change', calculateCheckoutTotal);
    }

    if (valorPagoInput) {
        valorPagoInput.addEventListener('input', (e) => {
            const total = calculateCheckoutTotal();
            const pago = parseFloat(e.target.value) || 0;
            const troco = pago - total;
            
            if (troco > 0) {
                trocoDiv.textContent = troco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            } else {
                trocoDiv.textContent = 'R$ 0,00';
            }
        });
    }

    const btnFinalizarCheckout = document.getElementById('btn-finalizar-checkout');
    if (btnFinalizarCheckout) {
        btnFinalizarCheckout.addEventListener('click', async () => {
            const osNumber = document.getElementById('input-pesquisa-os')?.value || currentFlowData.osNumber;
            const btnText = btnFinalizarCheckout.innerHTML;
            btnFinalizarCheckout.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Encerrando...';
            btnFinalizarCheckout.disabled = true;

            try {
                // Update Appwrite OS to "Encerrada"
                if (currentFlowData && (currentFlowData.id || currentFlowData.$id)) {
                    const docId = currentFlowData.id || currentFlowData.$id;
                    await window.appwrite.databases.updateDocument(window.appwrite.DB_ID, window.appwrite.COL_OS, docId, {
                        status: 'Encerrada'
                    });
                    
                    const index = window.globalData.os.findIndex(o => o.id === docId || o.$id === docId);
                    if (index !== -1) {
                        window.globalData.os[index].status = 'Encerrada';
                        localStorage.setItem('avence_os', JSON.stringify(window.globalData.os));
                    }
                }

                // Calculate final total and get payment info
                const finalTotal = calculateCheckoutTotal();
                const selectPagamento = document.getElementById('checkout-pagamento');
                let formaPgto = 'dinheiro';
                const pgtoValue = selectPagamento?.value || 'Dinheiro';
                if (pgtoValue === 'Pix') formaPgto = 'pix';
                else if (pgtoValue === 'Cartão Débito') formaPgto = 'debito';
                else if (pgtoValue === 'Cartão Crédito' || pgtoValue === 'Cartão de Crédito') {
                    const selectParcelas = document.getElementById('checkout-parcelas');
                    const parcelas = parseInt(selectParcelas?.value) || 1;
                    formaPgto = parcelas > 1 ? 'credito_parcelado' : 'credito_vista';
                }
                else if (pgtoValue === 'Notinha') formaPgto = 'notinha';

                // Registrar no caixa
                let motivoVenda = `Encerramento O.S. Nº ${osNumber}`;
                const nomeCliente = document.getElementById('c_nome')?.value || currentFlowData?.cliente?.nome;
                if (nomeCliente) {
                    motivoVenda += ` - Cliente: ${nomeCliente}`;
                }
                
                if (window.caixaAberto && window.registrarTransacaoCaixa) {
                    await window.registrarTransacaoCaixa('entrada', finalTotal, motivoVenda, formaPgto);
                } else if (!window.caixaAberto) {
                    window.customAlert('Aviso: O caixa está FECHADO. A O.S. foi encerrada mas não registrada no fluxo de caixa.', 'warning');
                }

            } catch (err) {
                console.error(err);
                window.customAlert('Erro ao encerrar O.S.: ' + err.message, 'warning');
                btnFinalizarCheckout.innerHTML = btnText;
                btnFinalizarCheckout.disabled = false;
                return;
            }

            // --- Preencher Dados para Impressão ---
            document.getElementById('pd_os_number').textContent = 'OS Nº ' + osNumber;
            document.getElementById('pd_cliente').textContent = document.getElementById('c_nome')?.value || 'Nome do Cliente';
            document.getElementById('pd_fones').textContent = (document.getElementById('c_telefone')?.value || '') + ' ' + (document.getElementById('c_celular')?.value || '');
            document.getElementById('pd_marca').textContent = document.getElementById('a_marca')?.value || '';
            document.getElementById('pd_modelo').textContent = document.getElementById('a_modelo')?.value || '';
            document.getElementById('pd_serie').textContent = document.getElementById('a_serie')?.value || '';
            document.getElementById('pd_acessorios').textContent = document.getElementById('a_acessorio')?.value || '';
            document.getElementById('pd_aparencia').textContent = document.getElementById('a_aparencia')?.value || '';
            
            // Store Config
            const config = JSON.parse(localStorage.getItem('avence_config')) || {};
            if(document.getElementById('pd_store_name')) document.getElementById('pd_store_name').textContent = config.osTitulo || 'NOTE BOOK CENTER';
            if(document.getElementById('pd_store_address')) document.getElementById('pd_store_address').textContent = config.osEndereco || 'RUA SANTA CATARINA - 35, IVAIPORA-PR';
            if(document.getElementById('pd_store_phone')) document.getElementById('pd_store_phone').textContent = config.osTelefone || '(43) 99900-4377';
            if(document.getElementById('pd_store_email')) document.getElementById('pd_store_email').textContent = config.osEmail || 'notecenter_ivp@hotmail.com';
            
            // Dates
            const today = new Date().toLocaleDateString('pt-BR');
            const garantiaDate = new Date();
            garantiaDate.setDate(garantiaDate.getDate() + 90);
            
            const intakeDate = document.getElementById('intake-entrada')?.value;
            document.getElementById('pd_entrada').textContent = intakeDate ? new Date(intakeDate).toLocaleDateString('pt-BR') : today;
            document.getElementById('pd_pronto').textContent = today;
            document.getElementById('pd_saida').textContent = today;
            document.getElementById('pd_garantia').textContent = garantiaDate.toLocaleDateString('pt-BR');
            
            document.getElementById('pd_defeito').textContent = document.getElementById('a_defeito')?.value || '';
            
            // Budget Fields
            const formatMoney = (id) => {
                const val = parseFloat(document.getElementById(id)?.value) || 0;
                return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            };
            
            document.getElementById('pd_v_maodeobra').textContent = formatMoney('a_maodeobra');
            document.getElementById('pd_v_pecas').textContent = formatMoney('a_pecas');
            document.getElementById('pd_v_deslocamento').textContent = formatMoney('a_deslocamento');
            document.getElementById('pd_v_terceiros').textContent = formatMoney('a_terceiros');
            document.getElementById('pd_v_outros').textContent = formatMoney('a_outros');
            document.getElementById('pd_v_total').textContent = document.getElementById('checkout-total')?.textContent || document.getElementById('a_total')?.textContent || 'R$ 0,00';
            
            document.getElementById('pd_sig_client').textContent = document.getElementById('pd_cliente').textContent;
            document.getElementById('pd_sig_store').textContent = document.getElementById('p_store_name')?.textContent || 'AVENCE CELL';

            closeModal(document.getElementById('modal-checkout'));
            
            // Show only delivery receipt for printing
            const pReceipt = document.getElementById('print-receipt');
            const pDelivery = document.getElementById('print-delivery');
            
            if (pReceipt) {
                pReceipt.classList.remove('print-only');
                pReceipt.style.display = 'none';
            }
            if (pDelivery) {
                pDelivery.classList.add('print-only');
                pDelivery.style.display = 'block';
            }
            
            const pBarcode = document.getElementById('print-barcode');
            if (pBarcode) pBarcode.innerHTML = '';

            document.body.classList.add('printing-os-delivery');
            window.print();
            
            btnFinalizarCheckout.innerHTML = btnText;
            btnFinalizarCheckout.disabled = false;

            // Restore visibility after print dialog is closed
            setTimeout(() => {
                document.body.classList.remove('printing-os-delivery');
                if (pReceipt) {
                    pReceipt.style.display = '';
                    pReceipt.classList.add('print-only');
                }
                if (pDelivery) {
                    pDelivery.style.display = '';
                    pDelivery.classList.add('print-only');
                }
                window.location.reload(); // Reload to refresh tables and UI
            }, 1500);
        });
    }

    // Modal Control Functions
    function openModal(modal) {
        modal.classList.add('active');
        if (!openModalsState.includes(modal.id)) {
            openModalsState.push(modal.id);
            localStorage.setItem('avence_open_modals', JSON.stringify(openModalsState));
        }
        if (modal.id === 'modal-cadastro') {
            setTimeout(() => document.getElementById('c_nome').focus(), 300);
        } else if (modal.id === 'modal-intake') {
            setTimeout(() => document.getElementById('a_marca').focus(), 300);
        }
    }

    function closeModal(modal) {
        modal.classList.remove('active');
        openModalsState = openModalsState.filter(id => id !== modal.id);
        localStorage.setItem('avence_open_modals', JSON.stringify(openModalsState));
        if (modal.id === 'modal-cadastro' && document.getElementById('modal-abrir-os').classList.contains('active')) {
            setTimeout(() => document.getElementById('client-search').focus(), 300);
        }
    }

    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = btn.getAttribute('data-close');
            const modal = document.getElementById(modalId);
            if (modal) closeModal(modal);
        });
    });

    // Global Keydown (F2 listener)
    document.addEventListener('keydown', (e) => {
        const modalAlerta = document.getElementById('modal-alerta');
        if (modalAlerta && modalAlerta.classList.contains('active') && e.key === 'Enter') {
            e.preventDefault();
            const btnFechar = document.getElementById('btn-fechar-alerta');
            if (btnFechar) btnFechar.click();
            return;
        }

        if (document.getElementById('modal-abrir-os').classList.contains('active')) {
            if (e.key === 'F2') {
                e.preventDefault(); 
                const searchInputEl = document.getElementById('client-search');
                const searchValue = searchInputEl ? searchInputEl.value.trim() : '';
                const nomeInput = document.getElementById('c_nome');
                const telefoneInput = document.getElementById('c_telefone');
                const docInput = document.getElementById('c_documento');
                
                const filterEl = document.querySelector('input[name="searchFilter"]:checked');
                const filter = filterEl ? filterEl.value : 'inicio_nome';
                
                if (searchValue) {
                    if (['inicio_nome', 'qualquer_nome', 'fim_nome'].includes(filter) && isNaN(searchValue)) nomeInput.value = searchValue;
                    if (filter === 'telefone') telefoneInput.value = searchValue;
                    if (filter === 'cpf') docInput.value = searchValue;
                }
                
                // Close the search modal when opening the client registration
                closeModal(document.getElementById('modal-abrir-os'));
                setTimeout(() => openModal(modalCadastro), 300);
            }
        }
        
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                closeModal(modal);
            });
        }
    });

    document.getElementById('btn-novo-cliente-header').addEventListener('click', () => {
        const searchInputEl = document.getElementById('client-search');
        const searchValue = searchInputEl ? searchInputEl.value.trim() : '';
        const nomeInput = document.getElementById('c_nome');
        const telefoneInput = document.getElementById('c_telefone');
        const docInput = document.getElementById('c_documento');
        
        const filterEl = document.querySelector('input[name="searchFilter"]:checked');
        const filter = filterEl ? filterEl.value : 'inicio_nome';
        
        if (searchValue) {
            if (['inicio_nome', 'qualquer_nome', 'fim_nome'].includes(filter) && isNaN(searchValue)) nomeInput.value = searchValue;
            if (filter === 'telefone') telefoneInput.value = searchValue;
            if (filter === 'cpf') docInput.value = searchValue;
        }
        
        closeModal(document.getElementById('modal-abrir-os'));
        setTimeout(() => openModal(modalCadastro), 300);
    });
    // Auto-advance on Enter key in Cadastro Form
    document.getElementById('form-cadastro').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            
            const form = e.currentTarget;
            const focusableElements = Array.from(form.querySelectorAll('input, select, textarea'));
            const currentIndex = focusableElements.indexOf(document.activeElement);
            
            let nextRequired = null;
            if (currentIndex !== -1) {
                for (let i = currentIndex + 1; i < focusableElements.length; i++) {
                    if (focusableElements[i].hasAttribute('required')) {
                        nextRequired = focusableElements[i];
                        break;
                    }
                }
            } else {
                nextRequired = focusableElements.find(el => el.hasAttribute('required'));
            }
            
            if (nextRequired) {
                nextRequired.focus();
            } else {
                // No more required fields, simulate click on Gravar/Continuar
                btnGravarCliente.click();
            }
        }
    });


    // Gravar Cliente (Step 1)
    btnGravarCliente.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('c_nome').value;
        const contato = document.getElementById('c_contato').value;
        
        if (!nome || !contato) {
            window.customAlert('Por favor, preencha pelo menos "Razão Social/Nome" e "Contato".', 'warning');
            return;
        }

        // Save data to currentFlowData
        currentFlowData.cliente = {
            nome: nome,
            telefone: contato,
            documento: document.getElementById('c_documento') ? document.getElementById('c_documento').value : '',
            endereco: document.getElementById('c_endereco') ? document.getElementById('c_endereco').value : '',
            email: document.getElementById('c_email') ? document.getElementById('c_email').value : ''
        };

        const btnText = btnGravarCliente.innerHTML;
        btnGravarCliente.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gravando...';
        btnGravarCliente.disabled = true;

        try {
            // Persist to window.clientes (Appwrite)
            if (!window.clientes) window.clientes = [];
            const existingIdx = window.clientes.findIndex(c => c.nome.toLowerCase() === nome.toLowerCase());
            
            if (existingIdx >= 0) {
                const id = window.clientes[existingIdx].id;
                const updatePayload = { ...currentFlowData.cliente };
                delete updatePayload.id;
                await window.appwrite.databases.updateDocument(window.appwrite.DB_ID, window.appwrite.COL_CLIENTES, id, updatePayload);
                currentFlowData.cliente.id = id;
                window.clientes[existingIdx] = { ...window.clientes[existingIdx], ...currentFlowData.cliente };
            } else {
                const docId = window.appwrite.ID.unique();
                const createPayload = { ...currentFlowData.cliente };
                delete createPayload.id;
                const created = await window.appwrite.databases.createDocument(window.appwrite.DB_ID, window.appwrite.COL_CLIENTES, docId, createPayload);
                currentFlowData.cliente.id = created.$id;
                window.clientes.push(currentFlowData.cliente);
            }
            
            localStorage.setItem('avence_clientes', JSON.stringify(window.clientes));
            if (typeof renderClientList === 'function') renderClientList();

            closeModal(modalCadastro);
            
            if (modalIntake.classList.contains('active')) {
                document.getElementById('intake-client-name').textContent = currentFlowData.cliente.nome || '-';
                document.getElementById('intake-client-phone').textContent = currentFlowData.cliente.telefone || '-';
                document.getElementById('intake-client-address').textContent = currentFlowData.cliente.endereco || '-';
                document.getElementById('intake-client-doc').textContent = currentFlowData.cliente.documento || '-';
                document.getElementById('intake-client-email').textContent = currentFlowData.cliente.email || '-';
            } else {
                setTimeout(() => openModal(modalAparelho), 300);
            }
        } catch (err) {
            console.error(err);
            window.customAlert('Erro ao gravar cliente na nuvem: ' + err.message, 'warning');
        } finally {
            btnGravarCliente.innerHTML = btnText;
            btnGravarCliente.disabled = false;
        }
    });

    if (btnEditarClienteOS) {
        btnEditarClienteOS.addEventListener('click', () => {
            if (currentFlowData.cliente) {
                document.getElementById('c_nome').value = currentFlowData.cliente.nome || '';
                document.getElementById('c_contato').value = currentFlowData.cliente.contato || currentFlowData.cliente.telefone || '';
                
                // Trata caso onde telefone salva tudo, separando se necessário
                const fones = currentFlowData.cliente.telefone || '';
                document.getElementById('c_telefone').value = fones;
                document.getElementById('c_celular').value = fones; 
                document.getElementById('c_documento').value = currentFlowData.cliente.cpf || currentFlowData.cliente.documento || '';
                document.getElementById('c_endereco').value = currentFlowData.cliente.endereco || '';
                document.getElementById('c_email').value = currentFlowData.cliente.email || '';
            }
            openModal(modalCadastro);
        });
    }

    // Device Selection (Step 2)
    function selectDeviceType(type) {
        currentFlowData.aparelho.tipo = type;
        closeModal(modalAparelho);
        
        // Reset intake form
        document.getElementById('form-intake').reset();
        
        // Generate OS Number
        // Generate OS Number
        let nextOsNum = 0;
        if (window.globalData && window.globalData.os && window.globalData.os.length > 0) {
            // Only consider OSes that actually have an 'osNumber' field to avoid old random 'numero's
            const validNumbers = window.globalData.os
                .filter(o => o.osNumber !== undefined && o.osNumber !== null)
                .map(o => parseInt(o.osNumber))
                .filter(n => !isNaN(n));
                
            if (validNumbers.length > 0) {
                nextOsNum = Math.max(...validNumbers) + 1;
            }
        }
        currentFlowData.osNumber = nextOsNum;
        
        // Populate Intake Header
        document.getElementById('intake-os-number').textContent = currentFlowData.osNumber;
        document.getElementById('intake-client-name').textContent = currentFlowData.cliente.nome || '-';
        document.getElementById('intake-client-phone').textContent = currentFlowData.cliente.telefone || '-';
        
        // Set today's date
        const inputEntrada = document.getElementById('intake-entrada');
        if (inputEntrada) {
            inputEntrada.value = new Date().toISOString().split('T')[0];
        }

        setTimeout(() => openModal(modalIntake), 300);
    }

    btnCelular.addEventListener('click', () => selectDeviceType('Celular'));
    btnNotebook.addEventListener('click', () => selectDeviceType('Notebook'));

    // Cancel OS
    const btnCancelarOs = document.getElementById('btn-cancelar-os');
    if(btnCancelarOs) {
        btnCancelarOs.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.modal-overlay.active').forEach(modal => closeModal(modal));
        });
    }

    // Finalizar e Imprimir (Step 3)
    btnFinalizarImprimir.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const marca = document.getElementById('a_marca').value;
        const modelo = document.getElementById('a_modelo').value;
        const acessorio = document.getElementById('a_acessorio').value;
        const defeito = document.getElementById('a_defeito').value;
        const serie = document.getElementById('a_serie').value;
        const aparencia = document.getElementById('a_aparencia').value;
        const obs = document.getElementById('a_obs').value;
        const tecnico = document.getElementById('a_tecnico').value;
        const prioridade = document.getElementById('a_prioridade').value;
        
        if (!marca || !modelo || !acessorio || !defeito) {
            window.customAlert('Por favor, preencha todos os campos obrigatórios (Marca, Modelo, Acessórios, Defeito).', 'warning');
            return;
        }

        const btnText = btnFinalizarImprimir.innerHTML;
        btnFinalizarImprimir.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gravando...';
        btnFinalizarImprimir.disabled = true;

        let isEditing = !!(currentFlowData.id || currentFlowData.$id);

        try {
            const osDoc = {
                osNumber: currentFlowData.osNumber !== undefined ? currentFlowData.osNumber.toString() : "0",
                status: currentFlowData.status || 'Aberta',
                cliente: document.getElementById('intake-client-name').textContent || (currentFlowData.cliente ? currentFlowData.cliente.nome : ''),
                fones: document.getElementById('intake-client-phone').textContent || (currentFlowData.cliente ? currentFlowData.cliente.telefone : ''),
                marca: marca,
                modelo: modelo,
                serie: serie,
                acessorio: acessorio,
                aparencia: aparencia,
                defeito: defeito,
                maodeobra: parseFloat(document.getElementById('a_maodeobra')?.value) || 0,
                pecas: parseFloat(document.getElementById('a_pecas')?.value) || 0,
                deslocamento: parseFloat(document.getElementById('a_deslocamento')?.value) || 0,
                terceiros: parseFloat(document.getElementById('a_terceiros')?.value) || 0,
                outros: parseFloat(document.getElementById('a_outros')?.value) || 0,
                total: calculateTotal(),
                laudo: document.getElementById('a_laudo')?.value || '',
                relatorio: currentFlowData.relatorio || '',
                dataIntake: document.getElementById('intake-entrada') ? document.getElementById('intake-entrada').value : '',
                dataDelivery: document.getElementById('intake-previsao') ? document.getElementById('intake-previsao').value : ''
            };

            if(!window.globalData) window.globalData = {};
            if(!window.globalData.os) window.globalData.os = [];

            if (isEditing) {
                const docId = currentFlowData.id || currentFlowData.$id;
                await window.appwrite.databases.updateDocument(window.appwrite.DB_ID, window.appwrite.COL_OS, docId, osDoc);
                const index = window.globalData.os.findIndex(o => o.id === docId || o.$id === docId);
                if (index !== -1) {
                    window.globalData.os[index] = {...window.globalData.os[index], ...osDoc};
                }
                localStorage.setItem('avence_os', JSON.stringify(window.globalData.os));
            } else {
                const docId = window.appwrite.ID.unique();
                const created = await window.appwrite.databases.createDocument(window.appwrite.DB_ID, window.appwrite.COL_OS, docId, osDoc);
                window.globalData.os.push({...osDoc, id: created.$id});
                localStorage.setItem('avence_os', JSON.stringify(window.globalData.os));
            }
        } catch (err) {
            console.error(err);
            window.customAlert('Erro ao gravar O.S na nuvem: ' + err.message, 'warning');
            btnFinalizarImprimir.innerHTML = btnText;
            btnFinalizarImprimir.disabled = false;
            return; // Stop if failed to save
        }
        
        btnFinalizarImprimir.innerHTML = btnText;
        btnFinalizarImprimir.disabled = false;

        if (isEditing) {
            const modalIntake = document.getElementById('modal-intake');
            if (modalIntake) {
                modalIntake.classList.remove('active');
            }
            return; // Não imprime quando é alteração
        }
        
        // Setup Print Intake data
        const config = window.lojaConfig || {};
        
        document.getElementById('pi-titulo').textContent = config.osTitulo || 'NOTE BOOK CENTER';
        document.getElementById('pi-endereco').textContent = config.osEndereco || 'RUA SANTA CATARINA - 35, IVAIPORA-PR';
        document.getElementById('pi-complemento').textContent = config.osComplemento || 'COMPLEMENTO RUA ATRAS DO BANCO DO BRASIL';
        document.getElementById('pi-telefone-email').textContent = `${config.osTelefone || '(43) 99900-4377'}  ${config.osEmail || 'notecenter_ivp@hotmail.com'}`;
        
        document.getElementById('pi-os-num').textContent = currentFlowData.osNumber;
        document.getElementById('pi-cliente').textContent = document.getElementById('intake-client-name').textContent || '';
        document.getElementById('pi-fones').textContent = document.getElementById('intake-client-phone').textContent || '';
        document.getElementById('pi-marca').textContent = marca;
        document.getElementById('pi-modelo').textContent = modelo;
        document.getElementById('pi-serie').textContent = serie;
        
        const elEntrada = document.getElementById('intake-entrada');
        const elPrevisao = document.getElementById('intake-previsao');
        const dataEntrada = elEntrada ? elEntrada.value : '';
        const dataPrevisao = elPrevisao ? elPrevisao.value : '';
        
        const formatData = (d) => {
            if (!d) return '';
            const [year, month, day] = d.split('-');
            return `${day}/${month}/${year}`;
        };
        
        document.getElementById('pi-entrada').textContent = formatData(dataEntrada) || new Date().toLocaleDateString('pt-BR');
        document.getElementById('pi-previsao').textContent = formatData(dataPrevisao) || 'Sem previsão no momento';
        
        document.getElementById('pi-acessorios').textContent = acessorio || 'sem acessório';
        document.getElementById('pi-aparencia').textContent = aparencia || '';
        
        document.getElementById('pi-defeito').textContent = defeito;
        
        // Termos convert \n to <br>
        const termosText = config.osTermos || '1) PRAZO PARA RETIRAR: 90 DIAS; GARANTIA 90 DIAS;\n2) GARANTIA E ENTREGA SOMENTE COM A ORDEM DE SERVIÇO (O.S.);\n3) REAJUSTE DE 10% A CADA 30 DIAS VENCIDOS (TAXA CONSERVAÇÃO).\n4) APOS 90 DIAS NAO RETIRAR O EQUIPAMENTO SERA FEITA A RECICLAGEM DO MESMO';
        document.getElementById('pi-termos').innerHTML = termosText.replace(/\n/g, '<br>');
        
        document.getElementById('pi-assinatura-loja').textContent = config.osAssinatura || 'NOTE BOOK CENTER';

        // Manage visibility for print
        const pReceipt = document.getElementById('print-receipt');
        const pDelivery = document.getElementById('print-delivery');
        const pIntake = document.getElementById('print-intake');
        const pReciboPdv = document.getElementById('print-recibo-pdv');
        
        if (pReceipt) { pReceipt.classList.remove('print-only'); pReceipt.style.display = 'none'; }
        if (pDelivery) { pDelivery.classList.remove('print-only'); pDelivery.style.display = 'none'; }
        if (pReciboPdv) { pReciboPdv.classList.remove('print-only'); pReciboPdv.style.display = 'none'; }
        
        if (pIntake) {
            pIntake.classList.add('print-only');
            pIntake.style.display = 'block';
        }
        
        const pBarcode = document.getElementById('print-barcode');
        if (pBarcode) pBarcode.innerHTML = '';

        document.body.classList.add('printing-os-intake');
        window.print();
        
        setTimeout(() => {
            document.body.classList.remove('printing-os-intake');
            if (pReceipt) { pReceipt.style.display = ''; pReceipt.classList.add('print-only'); }
            if (pDelivery) { pDelivery.style.display = ''; pDelivery.classList.add('print-only'); }
            if (pReciboPdv) { pReciboPdv.style.display = ''; pReciboPdv.classList.add('print-only'); }
            if (pIntake) { pIntake.style.display = ''; pIntake.classList.add('print-only'); }
            
            // Close modal
            closeModal(modalIntake);
        }, 1000);
    });

    window.clientes = [];
    
    document.addEventListener('appwriteReady', () => {
        if (window.globalData && window.globalData.clientes) {
            window.clientes = window.globalData.clientes;
            localStorage.setItem('avence_clientes', JSON.stringify(window.clientes));
            if (typeof renderClientList === 'function') renderClientList();
        }
    });

    function renderClientList() {
        const container = document.getElementById('client-list-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Obter valores de pesquisa
        const searchInput = document.getElementById('client-search');
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const filterTypeNode = document.querySelector('input[name="searchFilter"]:checked');
        const filterType = filterTypeNode ? filterTypeNode.value : 'inicio_nome';

        // Filtrar clientes nulos ou sem nome antes de ordenar
        let validClients = window.clientes.filter(c => c && c.nome);

        if (searchTerm) {
            validClients = validClients.filter(c => {
                const nome = c.nome.toLowerCase();
                const telefoneStr = (c.telefone || '').toLowerCase().replace(/\D/g, '');
                const celularStr = (c.celular || '').toLowerCase().replace(/\D/g, '');
                const fones = telefoneStr + celularStr;
                const cpfStr = (c.cpf || c.documento || '').toLowerCase().replace(/\D/g, '');
                const searchClean = searchTerm.replace(/\D/g, '');
                
                switch (filterType) {
                    case 'inicio_nome':
                        return nome.startsWith(searchTerm);
                    case 'qualquer_nome':
                        return nome.includes(searchTerm);
                    case 'fim_nome':
                        return nome.endsWith(searchTerm);
                    case 'cpf':
                        return searchClean !== '' && cpfStr.includes(searchClean);
                    case 'telefone':
                        return searchClean !== '' && fones.includes(searchClean);
                    default:
                        return nome.includes(searchTerm);
                }
            });
        }
        
        // Sort alphabetically by nome
        const sorted = validClients.sort((a, b) => a.nome.localeCompare(b.nome));

        if (sorted.length === 0) {
            container.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted);">Nenhum cliente encontrado.</div>';
            return;
        }

        sorted.forEach(client => {
            const div = document.createElement('div');
            div.style.padding = '12px 16px';
            div.style.borderBottom = '1px solid var(--border)';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.cursor = 'pointer';
            
            div.onmouseover = () => div.style.background = 'var(--bg-surface-hover)';
            div.onmouseout = () => div.style.background = 'transparent';
            
            div.innerHTML = `
                <div style="width: 100%;">
                    <div style="font-weight: 600; color: var(--primary);">${client.nome}</div>
                    <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">CPF: ${client.cpf} &nbsp;|&nbsp; Tel: ${client.telefone}</div>
                </div>
            `;
            
            div.addEventListener('click', () => {
                // Simulate selecting client
                currentFlowData.cliente = client;
                document.getElementById('historico-cliente-nome').textContent = client.nome;
                
                const tbody = document.getElementById('historico-cliente-tbody');
                tbody.innerHTML = '';
                
                let osList = [];
                try {
                    const osStr = localStorage.getItem('avence_os');
                    if (osStr) osList = JSON.parse(osStr);
                } catch(e) {}
                
                const clientOs = osList.filter(os => (typeof os.cliente === 'string' ? os.cliente : os.cliente?.nome) === client.nome);
                
                if (clientOs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-muted);">Nenhuma O.S. anterior encontrada para este cliente.</td></tr>';
                } else {
                    clientOs.reverse().forEach(os => {
                        const aparelhoStr = (os.marca || os.aparelho?.marca || '') + ' ' + (os.modelo || os.aparelho?.modelo || '');
                        const defeitoStr = os.defeito || os.aparelho?.defeito || '-';
                        const statusOs = os.status || 'Concluída';
                        const tr = document.createElement('tr');
                        tr.style.cursor = 'pointer';
                        const osNum = os.osNumber || os.numero || '-';
                        let dataStr = '-';
                        if (os.dataIntake) dataStr = os.dataIntake.split('-').reverse().join('/');
                        else if (os.data_entrada) dataStr = os.data_entrada;
                        else if (os.data) dataStr = os.data.split('T')[0].split('-').reverse().join('/');
                        
                        tr.innerHTML = `
                            <td style="font-weight: bold; color: var(--primary);">#${osNum}</td>
                            <td>${aparelhoStr.trim() || '-'}</td>
                            <td>${defeitoStr}</td>
                            <td>${dataStr}</td>
                            <td><span style="background: var(--bg-surface-hover); border: 1px solid var(--border); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${statusOs}</span></td>
                        `;
                        
                        tr.addEventListener('click', () => {
                            // Remover seleção anterior
                            Array.from(tbody.querySelectorAll('tr')).forEach(r => {
                                r.style.background = '';
                                r.classList.remove('selected-os-row');
                            });
                            
                            // Selecionar atual
                            tr.style.background = 'rgba(59, 130, 246, 0.1)';
                            tr.classList.add('selected-os-row');
                            
                            // Habilitar botão
                            osSelecionadaHistorico = os.numero;
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
                
                // Resetar botão Alterar
                osSelecionadaHistorico = null;
                const btnAltReset = document.getElementById('btn-alterar-os-historico');
                if (btnAltReset) {
                    btnAltReset.disabled = true;
                    btnAltReset.style.opacity = '0.5';
                    btnAltReset.style.cursor = 'not-allowed';
                }
                
                closeModal(document.getElementById('modal-abrir-os'));
                openModal(document.getElementById('modal-historico-cliente'));
            });
            
            container.appendChild(div);
        });
    }

    renderClientList();

    const clientSearchInput = document.getElementById('client-search');
    if (clientSearchInput) {
        clientSearchInput.addEventListener('input', renderClientList);
    }
    const searchFilters = document.querySelectorAll('input[name="searchFilter"]');
    searchFilters.forEach(radio => {
        radio.addEventListener('change', () => {
            if (clientSearchInput) clientSearchInput.focus();
            renderClientList();
        });
    });
    // Event listeners para o modal de histórico
    const btnNovaOsHistorico = document.getElementById('btn-nova-os-historico');
    if (btnNovaOsHistorico) {
        btnNovaOsHistorico.addEventListener('click', () => {
            closeModal(document.getElementById('modal-historico-cliente'));
            openModal(document.getElementById('modal-aparelho'));
        });
    }

    const btnVoltarHistoricoX = document.getElementById('btn-voltar-historico-x');
    if (btnVoltarHistoricoX) {
        btnVoltarHistoricoX.addEventListener('click', () => {
            closeModal(document.getElementById('modal-historico-cliente'));
            openModal(document.getElementById('modal-abrir-os'));
        });
    }

    const btnHistoricoInterno = document.getElementById('btn-historico-interno');
    if (btnHistoricoInterno) {
        btnHistoricoInterno.addEventListener('click', () => {
            const clienteAtual = currentFlowData?.cliente?.nome || document.getElementById('a_nome_cliente')?.value;
            if (!clienteAtual) {
                window.customAlert('Por favor, selecione ou informe o nome do cliente primeiro.', 'warning');
                return;
            }
            
            const tbody = document.getElementById('historico-cliente-tbody');
            if (tbody) {
                tbody.innerHTML = '';
                let osList = [];
                try {
                    const osStr = localStorage.getItem('avence_os');
                    if (osStr) osList = JSON.parse(osStr);
                } catch(e) {}
                
                const filtradas = osList.filter(o => {
                    const clientName = typeof o.cliente === 'string' ? o.cliente : (o.cliente?.nome || '');
                    return clientName.toLowerCase().includes(clienteAtual.toLowerCase());
                });
                
                if (filtradas.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">Nenhum serviço anterior encontrado para este cliente.</td></tr>';
                } else {
                    filtradas.forEach(os => {
                        const tr = document.createElement('tr');
                        tr.style.cursor = 'pointer';
                        
                        const osNum = os.osNumber || os.numero || '-';
                        const marcaModelo = (os.marca || os.aparelho?.marca || '') + ' ' + (os.modelo || os.aparelho?.modelo || '');
                        const defeitoStr = os.defeito || os.aparelho?.defeito || '-';
                        let dataStr = '-';
                        if (os.dataIntake) dataStr = os.dataIntake.split('-').reverse().join('/');
                        else if (os.data) dataStr = os.data.split('T')[0].split('-').reverse().join('/');
                        
                        tr.innerHTML = `
                            <td>${osNum}</td>
                            <td>${marcaModelo.trim() || '-'}</td>
                            <td>${defeitoStr}</td>
                            <td>${dataStr}</td>
                            <td><span class="status-badge bg-status-orcamento">${os.status || 'Orçamento'}</span></td>
                        `;
                        tr.addEventListener('click', () => {
                            Array.from(tbody.querySelectorAll('tr')).forEach(row => row.style.background = 'transparent');
                            tr.style.background = 'rgba(59, 130, 246, 0.1)';
                            osSelecionadaHistorico = osNum;
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
            }
            document.getElementById('historico-cliente-nome').textContent = clienteAtual;
            openModal(document.getElementById('modal-historico-cliente'));
        });
    }

    let osSelecionadaHistorico = null;
    const btnAlterarOsHistorico = document.getElementById('btn-alterar-os-historico');
    
    if (btnAlterarOsHistorico) {
        btnAlterarOsHistorico.addEventListener('click', () => {
            if (osSelecionadaHistorico) {
                closeModal(document.getElementById('modal-historico-cliente'));
                // Buscar dados da OS selecionada e preencher os campos
                let osList = [];
                try {
                    const osStr = localStorage.getItem('avence_os');
                    if (osStr) osList = JSON.parse(osStr);
                } catch(e) {}
                
                const selectedOS = osList.find(o => (o.osNumber || o.numero) === osSelecionadaHistorico);
                if (selectedOS) {
                    if (selectedOS.status === 'Encerrada' || selectedOS.status === 'Finalizada') {
                        window.customAlert(`A O.S. Nº ${osSelecionadaHistorico} já encontra-se Encerrada e não está mais disponível para alterações.`, 'warning');
                        return;
                    }
                    currentFlowData = { ...selectedOS };
                    
                    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
                    
                    // Fallback to new flat structure or old nested structure
                    setVal('a_marca', selectedOS.marca || selectedOS.aparelho?.marca);
                    setVal('a_modelo', selectedOS.modelo || selectedOS.aparelho?.modelo);
                    setVal('a_acessorio', selectedOS.acessorio || selectedOS.aparelho?.acessorio);
                    setVal('a_acessorio2', selectedOS.aparelho?.acessorio2); // Old only
                    setVal('a_serie', selectedOS.serie || selectedOS.aparelho?.serie);
                    setVal('a_aparencia', selectedOS.aparencia || selectedOS.aparelho?.aparencia);
                    setVal('a_defeito', selectedOS.defeito || selectedOS.aparelho?.defeito);
                    setVal('a_obs', selectedOS.obs || selectedOS.aparelho?.obs);
                    setVal('a_tecnico', selectedOS.tecnico || selectedOS.aparelho?.tecnico);
                    setVal('a_prioridade', selectedOS.prioridade || selectedOS.aparelho?.prioridade);
                    setVal('a_senha', selectedOS.senha || selectedOS.aparelho?.senha);
                    
                    setVal('a_adiantamento', selectedOS.adiantamento || selectedOS.orcamento?.adiantamento || '0.00');
                    
                    let mo = selectedOS.maodeobra || selectedOS.orcamento?.maodeobra || 0;
                    const pecas = selectedOS.pecas || selectedOS.orcamento?.pecas || 0;
                    const des = selectedOS.deslocamento || selectedOS.orcamento?.deslocamento || 0;
                    const ter = selectedOS.terceiros || selectedOS.orcamento?.terceiros || 0;
                    const out = selectedOS.outros || selectedOS.orcamento?.outros || 0;
                    
                    const totalOS = selectedOS.total || selectedOS.orcamento?.total || 0;
                    
                    if (mo == 0 && pecas == 0 && des == 0 && ter == 0 && out == 0 && totalOS > 0) {
                        mo = totalOS;
                    }
                    
                    setVal('a_maodeobra', mo || '0.00');
                    setVal('a_pecas', pecas || '0.00');
                    setVal('a_deslocamento', des || '0.00');
                    setVal('a_terceiros', ter || '0.00');
                    setVal('a_outros', out || '0.00');
                    
                    if (selectedOS.laudo) setVal('a_laudo', selectedOS.laudo);
                    
                    if (typeof calculateTotal === 'function') calculateTotal();
                }

                // Em vez de ir para a tela vazia, abre o modal-intake (onde ficam as abas de peças, serviços, etc.)
                document.getElementById('intake-os-number').textContent = currentFlowData.osNumber !== undefined ? currentFlowData.osNumber : (currentFlowData.numero || '-');
                document.getElementById('intake-client-name').textContent = typeof currentFlowData.cliente === 'string' ? currentFlowData.cliente : (currentFlowData.cliente?.nome || '-');
                document.getElementById('intake-client-phone').textContent = currentFlowData.fones || currentFlowData.cliente?.telefone || '-';
                openModal(document.getElementById('modal-intake'));
                setTimeout(() => document.getElementById('a_marca')?.focus(), 300);
            }
        });
    }

    // Mask for phone numbers
    function applyPhoneMask(inputElement) {
        if (!inputElement) return;
        inputElement.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
            if (value.length > 11) value = value.slice(0, 11);
            if (value.length > 2) {
                value = '(' + value.substring(0, 2) + ') ' + value.substring(2);
            }
            if (value.length > 9) {
                value = value.substring(0, 10) + '-' + value.substring(10);
            } else if (value.length > 8) {
                value = value.substring(0, 9) + '-' + value.substring(9);
            }
            e.target.value = value;
        });
    }

    applyPhoneMask(document.getElementById('c_contato'));
    applyPhoneMask(document.getElementById('c_telefone'));
    applyPhoneMask(document.getElementById('c_celular'));
    applyPhoneMask(document.getElementById('c_comercial'));


// Mobile Sidebar Logic
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
if(mobileMenuBtn && sidebar && sidebarOverlay) {
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.add('mobile-open');
        sidebarOverlay.classList.add('active');
    });
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        sidebarOverlay.classList.remove('active');
    });
    const menuBtns = sidebar.querySelectorAll('.menu-btn');
    menuBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if(window.innerWidth <= 768) {
                sidebar.classList.remove('mobile-open');
                sidebarOverlay.classList.remove('active');
            }
        });
    });
}











