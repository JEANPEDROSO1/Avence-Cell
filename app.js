document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const menuBtns = document.querySelectorAll('.menu-btn');
    const screens = document.querySelectorAll('.screen');
    const pageTitle = document.getElementById('page-title');
    const datetimeDisplay = document.getElementById('datetime-display');
    const searchInput = document.getElementById('client-search');

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

    // In-memory data store for the current flow
    let currentFlowData = {
        cliente: {},
        aparelho: {}
    };

    // Initialize Store Config from localStorage
    function loadConfig() {
        const config = JSON.parse(localStorage.getItem('avence_config')) || {
            nome: 'AVENCE CELL',
            endereco: 'AVENIDA SOUZA NAVES - 991, IVAIPORÃ-PR',
            telefone: '(43) 9900-4377',
            email: 'avencecellivp@gmail.com',
            tecnico: 'Não definido'
        };

        // Update Form
        document.getElementById('config-loja').value = config.nome;
        document.getElementById('config-endereco').value = config.endereco;
        document.getElementById('config-telefone').value = config.telefone;
        document.getElementById('config-email').value = config.email;
        if (document.getElementById('config-tecnico')) {
            document.getElementById('config-tecnico').value = config.tecnico || 'Não definido';
        }

        // Update UI
        document.getElementById('store-name-display').textContent = config.nome;

        // Populate Tecnico options
        const tecnicoSelect = document.getElementById('a_tecnico');
        if (tecnicoSelect) {
            tecnicoSelect.innerHTML = '';
            const tecnicos = (config.tecnico || 'Não definido').split(',').map(t => t.trim()).filter(Boolean);
            if (tecnicos.length === 0) tecnicos.push('Não definido');
            tecnicos.forEach(tec => {
                const opt = document.createElement('option');
                opt.value = tec;
                opt.textContent = tec;
                tecnicoSelect.appendChild(opt);
            });
        }

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
    }

    loadConfig();

    btnSalvarConfig.addEventListener('click', () => {
        const bgInput = document.getElementById('config-bg');
        let bgImage = JSON.parse(localStorage.getItem('avence_config'))?.bgImage || null;

        const saveConfig = (imageStr) => {
            const config = {
                nome: document.getElementById('config-loja').value,
                endereco: document.getElementById('config-endereco').value,
                telefone: document.getElementById('config-telefone').value,
                email: document.getElementById('config-email').value,
                tecnico: document.getElementById('config-tecnico') ? document.getElementById('config-tecnico').value : 'Não definido',
                bgImage: imageStr
            };
            localStorage.setItem('avence_config', JSON.stringify(config));
            loadConfig();
            alert('Configurações salvas com sucesso!');
        };

        if (bgInput.files && bgInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                saveConfig(e.target.result);
            };
            reader.readAsDataURL(bgInput.files[0]);
        } else {
            saveConfig(bgImage);
        }
    });

    // Update Clock
    function updateClock() {
        const now = new Date();
        const options = { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' };
        datetimeDisplay.textContent = now.toLocaleDateString('pt-BR', options).replace(/ de /g, '/').replace('.', ',');
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Navigation Logic
    menuBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetModal = btn.getAttribute('data-modal');
            if (targetModal) {
                const modal = document.getElementById(targetModal);
                if (modal) {
                    openModal(modal);
                    if (targetModal === 'modal-abrir-os') {
                        setTimeout(() => document.getElementById('client-search').focus(), 300);
                    }
                }
                return;
            }

            const targetId = btn.getAttribute('data-target');
            if (targetId) {
                menuBtns.forEach(b => b.classList.remove('active'));
                screens.forEach(s => s.classList.remove('active'));

                btn.classList.add('active');
                document.getElementById(targetId).classList.add('active');

                pageTitle.textContent = btn.querySelector('span').textContent;
            }
        });
    });

    // Modal Control Functions
    function openModal(modal) {
        modal.classList.add('active');
        if (modal.id === 'modal-cadastro') {
            setTimeout(() => document.getElementById('c_nome').focus(), 300);
        } else if (modal.id === 'modal-intake') {
            setTimeout(() => document.getElementById('a_marca').focus(), 300);
        }
    }

    function closeModal(modal) {
        modal.classList.remove('active');
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
    btnGravarCliente.addEventListener('click', (e) => {
        e.preventDefault();

        const nome = document.getElementById('c_nome').value;
        const contato = document.getElementById('c_contato').value;

        if (!nome || !contato) {
            alert('Por favor, preencha pelo menos "Razão Social/Nome" e "Contato".');
            return;
        }

        // Save data to currentFlowData
        currentFlowData.cliente = {
            nome: nome,
            telefone: document.getElementById('c_telefone').value || document.getElementById('c_celular').value,
            // (In a real app, you'd collect all fields here)
        };

        closeModal(modalCadastro);
        setTimeout(() => openModal(modalAparelho), 300);
    });

    // Device Selection (Step 2)
    function selectDeviceType(type) {
        currentFlowData.aparelho.tipo = type;
        closeModal(modalAparelho);

        // Reset intake form
        document.getElementById('form-intake').reset();

        // Generate OS Number
        currentFlowData.osNumber = Math.floor(Math.random() * 10000) + 1000;

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
    if (btnCancelarOs) {
        btnCancelarOs.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.modal-overlay.active').forEach(modal => closeModal(modal));
        });
    }

    // Finalizar e Imprimir (Step 3)
    btnFinalizarImprimir.addEventListener('click', (e) => {
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
            alert('Por favor, preencha todos os campos obrigatórios (Marca, Modelo, Acessórios, Defeito).');
            return;
        }

        // Save data logic would go here

        // Close modal
        closeModal(modalIntake);
        alert('O.S Nº ' + currentFlowData.osNumber + ' salva com sucesso!');
    });

    // Dummy Clients List
    const dummyClients = [
        { nome: "Ana Santos", telefone: "(43) 9988-7766", cpf: "111.222.333-44" },
        { nome: "Bruno Costa", telefone: "(43) 9123-4567", cpf: "555.666.777-88" },
        { nome: "Carlos Oliveira", telefone: "(43) 9999-0000", cpf: "999.888.777-66" },
        { nome: "João da Silva", telefone: "(43) 99999-8888", cpf: "123.456.789-00" },
        { nome: "Maria Clara", telefone: "(43) 9876-5432", cpf: "444.333.222-11" }
    ];

    function renderClientList() {
        const container = document.getElementById('client-list-container');
        if (!container) return;

        container.innerHTML = '';

        // Sort alphabetically by nome
        const sorted = [...dummyClients].sort((a, b) => a.nome.localeCompare(b.nome));

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
                <div>
                    <div style="font-weight: 600; color: var(--primary);">${client.nome}</div>
                    <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">CPF: ${client.cpf} &nbsp;|&nbsp; Tel: ${client.telefone}</div>
                </div>
                <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;"><i class="ph ph-check"></i> Selecionar</button>
            `;

            div.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                // Simulate selecting client
                currentFlowData.cliente = client;
                closeModal(document.getElementById('modal-abrir-os'));
                openModal(document.getElementById('modal-aparelho'));
            });

            container.appendChild(div);
        });
    }

    renderClientList();

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
});
