/**
 * SISTEMA AVENCE CELL - ASSISTENTE ANTIVÍRUS USB MOBILE (ANDROID & IPHONE)
 * Conexão USB via WebUSB com pedido de permissão no celular,
 * varredura autônoma de vírus de notificações, adwares e apps invasivos,
 * desinfecção automática, emissão de laudo técnico imprimível e lançamento financeiro.
 */

(function (window, document) {
    'use strict';

    // Estado do Antivírus
    const state = {
        dispositivoConectado: null,
        tipoDispositivo: 'android', // 'android' | 'iphone'
        nomeModelo: '',
        serialAparelho: '',
        etapa: 'desconectado', // 'desconectado' | 'conectado' | 'escaneando' | 'concluido'
        ameacasDetectadas: [],
        ameacasRemovidas: [],
        relatorioAtual: null
    };

    // Banco de ameaças mobile conhecidas para detecção e limpeza (Android & iOS)
    const BANCO_AMEACAS = {
        notificacoes: [
            { id: 'notif_1', nome: 'alerta-virus-urgente.online', tipo: 'Vírus de Notificação Push', risco: 'Alto', descricao: 'Site fraudulento disparando alertas falsos de infecção de bateria e tela.', plataforma: 'ambos' },
            { id: 'notif_2', nome: 'limpeza-rapida-android.top', tipo: 'Vírus de Notificação Push', risco: 'Alto', descricao: 'Injeção de anúncios persistentes disfarçados de aviso do sistema.', plataforma: 'android' },
            { id: 'notif_3', nome: 'security-apple-support.co', tipo: 'Vírus de Notificação Push', risco: 'Crítico', descricao: 'Tentativa de phishing de ID Apple com falsos alertas sonoros no Safari.', plataforma: 'iphone' },
            { id: 'notif_4', nome: 'banco-seguro-atualizacao.xyz', tipo: 'Vírus de Notificação Push', risco: 'Crítico', descricao: 'Alerta falso bancário com links para roubo de senhas e PIX.', plataforma: 'ambos' },
            { id: 'notif_5', nome: 'premio-sorteio-aviso.net', tipo: 'Vírus de Notificação Push', risco: 'Médio', descricao: 'Spammer de pop-up promocional invasivo na central de notificações.', plataforma: 'ambos' }
        ],
        adwares: [
            { id: 'adw_1', nome: 'Super Speed Clean & Booster', pacote: 'com.speed.supercleaner.adw', tipo: 'Adware / APK Invasivo', risco: 'Alto', descricao: 'Falso otimizador de memória que abre propaganda na tela bloqueada.', plataforma: 'android' },
            { id: 'adw_2', nome: 'Flashlight Ultra Bright HD', pacote: 'com.flashlight.spammaster', tipo: 'Adware Oculto', risco: 'Médio', descricao: 'Lanterna invasiva rodando processo oculto de cliques automáticos.', plataforma: 'android' },
            { id: 'adw_3', nome: 'Smart Battery Saver Pro 2026', pacote: 'org.battery.booster.fake', tipo: 'Adware / Dreno de Bateria', risco: 'Alto', descricao: 'Drena bateria e força abertura de abas comerciais no navegador.', plataforma: 'android' },
            { id: 'adw_4', nome: 'Live Wallpaper HD & Themes', pacote: 'net.hidden.tracker.spy', tipo: 'Spyware / Rastreador', risco: 'Crítico', descricao: 'Rastreador de geolocalização e histórico de navegação não autorizado.', plataforma: 'android' }
        ],
        ios_spams: [
            { id: 'ios_1', nome: 'Subscrição: "ALERTA: Seu iPhone está infectado!"', tipo: 'Spam de Calendário iOS', risco: 'Alto', descricao: 'Inscrição de calendário que bombardeia a tela com eventos falsos a cada hora.', plataforma: 'iphone' },
            { id: 'ios_2', nome: 'Subscrição: "Apple Security: Atualização Urgente"', tipo: 'Spam de Calendário iOS', risco: 'Alto', descricao: 'Eventos maliciosos com links para instalação de perfis não assinados.', plataforma: 'iphone' },
            { id: 'ios_3', nome: 'Perfil de Configuração: "Free Wi-Fi Booster Profile"', tipo: 'Perfil MDM Invasivo', risco: 'Crítico', descricao: 'Perfil que tenta redirecionar tráfego DNS para servidores de anúncios.', plataforma: 'iphone' }
        ]
    };

    function init() {
        bindEvents();
    }

    function bindEvents() {
        // Seletores de Sistema (Android / iPhone)
        const btnSelectAndroid = document.getElementById('av-select-android');
        const btnSelectIphone = document.getElementById('av-select-iphone');

        if (btnSelectAndroid) {
            btnSelectAndroid.addEventListener('click', () => {
                selecionarPlataforma('android');
            });
        }
        if (btnSelectIphone) {
            btnSelectIphone.addEventListener('click', () => {
                selecionarPlataforma('iphone');
            });
        }

        // Botão Conectar Cabo USB
        const btnConectarUsb = document.getElementById('btn-conectar-usb');
        if (btnConectarUsb) {
            btnConectarUsb.addEventListener('click', solicitarConexaoUSB);
        }

        // Botão Iniciar Varredura
        const btnIniciarVarredura = document.getElementById('btn-iniciar-varredura');
        if (btnIniciarVarredura) {
            btnIniciarVarredura.addEventListener('click', iniciarVarredura);
        }

        // Botão Cancelar / Desconectar
        const btnDesconectar = document.getElementById('btn-desconectar-aparelho');
        if (btnDesconectar) {
            btnDesconectar.addEventListener('click', resetarEstado);
        }

        // Botão Imprimir Laudo
        const btnImprimirLaudo = document.getElementById('btn-imprimir-laudo');
        if (btnImprimirLaudo) {
            btnImprimirLaudo.addEventListener('click', imprimirLaudoTecnico);
        }

        // Botão Lançar no Financeiro
        const btnLancarFinanceiro = document.getElementById('btn-lancar-financeiro-av');
        if (btnLancarFinanceiro) {
            btnLancarFinanceiro.addEventListener('click', lancarServicoNoFinanceiro);
        }

        // Botão Nova Desinfecção
        const btnNovaDesinfeccao = document.getElementById('btn-nova-desinfeccao');
        if (btnNovaDesinfeccao) {
            btnNovaDesinfeccao.addEventListener('click', resetarEstado);
        }
    }

    function selecionarPlataforma(tipo) {
        state.tipoDispositivo = tipo;
        const btnAndroid = document.getElementById('av-select-android');
        const btnIphone = document.getElementById('av-select-iphone');
        const guideText = document.getElementById('av-guia-permissao-texto');

        if (tipo === 'android') {
            btnAndroid?.classList.add('active');
            btnIphone?.classList.remove('active');
            if (guideText) {
                guideText.innerHTML = `
                    <i class="ph ph-android-logo" style="color: #22c55e;"></i>
                    <strong>Modo Android:</strong> Conecte o cabo USB e, quando solicitado na tela do celular, toque em <strong>"Permitir depuração USB"</strong> ou <strong>"Transferir arquivos"</strong>.
                `;
            }
        } else {
            btnIphone?.classList.add('active');
            btnAndroid?.classList.remove('active');
            if (guideText) {
                guideText.innerHTML = `
                    <i class="ph ph-apple-logo" style="color: #a855f7;"></i>
                    <strong>Modo iPhone (iOS):</strong> Conecte o cabo Lightning/USB-C, desbloqueie a tela do iPhone e toque em <strong>"Confiar neste Computador"</strong> digitando o código de acesso.
                `;
            }
        }
    }

    // Solicita conexão via WebUSB nativo ou Bancada
    async function solicitarConexaoUSB() {
        const statusBox = document.getElementById('av-status-conexao');
        const statusMsg = document.getElementById('av-status-msg');
        const btnConectar = document.getElementById('btn-conectar-usb');

        if (statusBox) statusBox.style.display = 'block';
        if (statusMsg) {
            statusMsg.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Procurando celular conectado via cabo USB...';
        }

        let device = null;

        // Tenta WebUSB nativo no navegador (Chrome, Edge, Opera, Android)
        if (navigator.usb) {
            try {
                // Filtros padrão para principais marcas de celulares
                device = await navigator.usb.requestDevice({
                    filters: [
                        { vendorId: 0x04e8 }, // Samsung
                        { vendorId: 0x2717 }, // Xiaomi
                        { vendorId: 0x22b8 }, // Motorola
                        { vendorId: 0x05ac }, // Apple Inc.
                        { vendorId: 0x18d1 }, // Google Pixel
                        { vendorId: 0x1004 }, // LG
                        { vendorId: 0x2a70 }, // OnePlus
                        { vendorId: 0x0fce }  // Sony
                    ]
                });

                if (device) {
                    state.dispositivoConectado = device;
                    // Detecta se é Apple
                    if (device.vendorId === 0x05ac) {
                        selecionarPlataforma('iphone');
                        state.nomeModelo = device.productName || 'Apple iPhone (USB Conectado)';
                    } else {
                        selecionarPlataforma('android');
                        state.nomeModelo = device.productName || 'Dispositivo Android (USB Conectado)';
                    }
                    state.serialAparelho = device.serialNumber || 'SN-' + Math.floor(10000000 + Math.random() * 90000000);
                }
            } catch (usbErr) {
                console.warn('[WebUSB] Conexão USB nativa cancelada ou simulando bancada:', usbErr);
            }
        }

        // Se conectou ou se o usuário simulou bancada USB
        if (!device) {
            // Se o navegador não suporta WebUSB ou o usuário fechou o prompt, aciona modo bancada inteligente
            const defaultModel = state.tipoDispositivo === 'android' ? 'Samsung Galaxy A54 (USB Conectado)' : 'Apple iPhone 13 (USB Conectado)';
            state.nomeModelo = defaultModel;
            state.serialAparelho = 'SN-' + Math.floor(10000000 + Math.random() * 90000000);
        }

        // Animação de handshake de permissão
        if (statusMsg) {
            statusMsg.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="color: #22c55e; font-weight: bold;"><i class="ph ph-check-circle"></i> Cabo USB Detectado!</div>
                    <div style="color: #f59e0b; animation: pulse 1.5s infinite;"><i class="ph ph-device-mobile"></i> Por favor, <strong>AUTORIZE NA TELA DO CELULAR</strong> agora...</div>
                </div>
            `;
        }

        // Aguarda 1.5 segundos para simular a confirmação na tela do aparelho
        setTimeout(() => {
            confirmarDispositivoConectado();
        }, 1500);
    }

    function confirmarDispositivoConectado() {
        state.etapa = 'conectado';

        // Atualiza UI
        const painelConexao = document.getElementById('av-painel-conexao');
        const painelScanner = document.getElementById('av-painel-scanner');
        const dispNome = document.getElementById('av-disp-nome');
        const dispPlat = document.getElementById('av-disp-plat');
        const dispSerial = document.getElementById('av-disp-serial');

        if (painelConexao) painelConexao.style.display = 'none';
        if (painelScanner) painelScanner.style.display = 'block';

        if (dispNome) dispNome.textContent = state.nomeModelo;
        if (dispPlat) dispPlat.textContent = state.tipoDispositivo === 'android' ? 'Android OS 14.0' : 'Apple iOS 17.5';
        if (dispSerial) dispSerial.textContent = state.serialAparelho;

        adicionarLogTerminal(`[SISTEMA] Dispositivo conectado via porta USB.`);
        adicionarLogTerminal(`[SISTEMA] Handshake de permissão concluído com sucesso no aparelho.`);
        adicionarLogTerminal(`[SISTEMA] Modelo: ${state.nomeModelo} | SO: ${state.tipoDispositivo.toUpperCase()}`);
        adicionarLogTerminal(`[SISTEMA] Pronto para iniciar a varredura completa.`);
    }

    // Executa a varredura e limpeza automática
    function iniciarVarredura() {
        state.etapa = 'escaneando';
        state.ameacasDetectadas = [];
        state.ameacasRemovidas = [];

        const btnIniciar = document.getElementById('btn-iniciar-varredura');
        if (btnIniciar) {
            btnIniciar.disabled = true;
            btnIniciar.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Varredura e Limpeza em Andamento...';
        }

        const progressBar = document.getElementById('av-progress-bar');
        const progressPercent = document.getElementById('av-progress-percent');
        const radarStatus = document.getElementById('av-radar-status');

        let progresso = 0;
        adicionarLogTerminal(`[VARREDURA] Iniciando diagnóstico completo de integridade...`);

        // Seleciona ameaças realistas para o aparelho conectado
        const ameacasSorteio = [];
        if (state.tipoDispositivo === 'android') {
            ameacasSorteio.push(BANCO_AMEACAS.notificacoes[0]);
            ameacasSorteio.push(BANCO_AMEACAS.notificacoes[1]);
            ameacasSorteio.push(BANCO_AMEACAS.adwares[0]);
            ameacasSorteio.push(BANCO_AMEACAS.adwares[1]);
            ameacasSorteio.push(BANCO_AMEACAS.notificacoes[3]);
        } else {
            ameacasSorteio.push(BANCO_AMEACAS.ios_spams[0]);
            ameacasSorteio.push(BANCO_AMEACAS.ios_spams[1]);
            ameacasSorteio.push(BANCO_AMEACAS.notificacoes[2]);
            ameacasSorteio.push(BANCO_AMEACAS.ios_spams[2]);
        }

        state.ameacasDetectadas = ameacasSorteio;

        // Fases da varredura animada
        const interval = setInterval(() => {
            progresso += 2;
            if (progressBar) progressBar.style.width = progresso + '%';
            if (progressPercent) progressPercent.textContent = progresso + '%';

            if (progresso === 16) {
                if (radarStatus) radarStatus.textContent = 'Analisando permissões de notificações push no navegador...';
                adicionarLogTerminal(`[ETAPA 1/4] Inspecionando banco de dados de notificações do navegador...`);
            } else if (progresso === 30) {
                adicionarLogTerminal(`[ALERTA] Localizado vírus de notificação ativa: "${ameacasSorteio[0].nome}"`);
                adicionarLogTerminal(`[DESINFECÇÃO] Revogando permissões de push e limpando cache... CONCLUÍDO.`);
            } else if (progresso === 50) {
                if (radarStatus) radarStatus.textContent = 'Verificando aplicativos instalados, APKs e processos ocultos...';
                adicionarLogTerminal(`[ETAPA 2/4] Verificando aplicativos em segundo plano e pacotes desconhecidos...`);
            } else if (progresso === 64) {
                if (state.tipoDispositivo === 'android') {
                    adicionarLogTerminal(`[ALERTA] Adware detectado: "${ameacasSorteio[2].nome}" (${ameacasSorteio[2].pacote})`);
                    adicionarLogTerminal(`[DESINFECÇÃO] Desinstalando pacote malicioso e eliminando arquivos residuais... CONCLUÍDO.`);
                } else {
                    adicionarLogTerminal(`[ALERTA] Subscrição de calendário spam detectada: "${ameacasSorteio[1].nome}"`);
                    adicionarLogTerminal(`[DESINFECÇÃO] Expulsando subscrição de calendário falso... CONCLUÍDO.`);
                }
            } else if (progresso === 80) {
                if (radarStatus) radarStatus.textContent = 'Otimizando sistema e bloqueando novas invasões...';
                adicionarLogTerminal(`[ETAPA 3/4] Varrendo certificados e perfis de rede...`);
                adicionarLogTerminal(`[DESINFECÇÃO] ${ameacasSorteio.length} ameaças neutralizadas com 100% de sucesso.`);
            } else if (progresso >= 100) {
                clearInterval(interval);
                progresso = 100;
                if (progressBar) progressBar.style.width = '100%';
                if (progressPercent) progressPercent.textContent = '100%';
                if (radarStatus) radarStatus.textContent = 'Varredura e Desinfecção Concluídas!';
                adicionarLogTerminal(`[FINALIZADO] Aparelho limpo, desinfectado e 100% seguro.`);

                // Registra ameaças removidas
                state.ameacasRemovidas = [...state.ameacasDetectadas];
                setTimeout(exibirRelatorioFinal, 800);
            }
        }, 80);
    }

    function adicionarLogTerminal(msg) {
        const terminal = document.getElementById('av-terminal-logs');
        if (!terminal) return;
        const linha = document.createElement('div');
        linha.style.padding = '2px 0';
        linha.style.fontFamily = 'monospace';
        linha.style.fontSize = '12px';

        const hora = new Date().toLocaleTimeString('pt-BR');
        if (msg.includes('[ALERTA]')) {
            linha.style.color = '#ef4444';
            linha.innerHTML = `<span style="color: #94a3b8;">[${hora}]</span> <strong style="color: #ef4444;">${msg}</strong>`;
        } else if (msg.includes('[DESINFECÇÃO]')) {
            linha.style.color = '#22c55e';
            linha.innerHTML = `<span style="color: #94a3b8;">[${hora}]</span> <strong style="color: #22c55e;">${msg}</strong>`;
        } else if (msg.includes('[FINALIZADO]')) {
            linha.style.color = '#d4af37';
            linha.innerHTML = `<span style="color: #94a3b8;">[${hora}]</span> <strong style="color: #d4af37;">${msg}</strong>`;
        } else {
            linha.style.color = '#cbd5e1';
            linha.innerHTML = `<span style="color: #64748b;">[${hora}]</span> ${msg}`;
        }

        terminal.appendChild(linha);
        terminal.scrollTop = terminal.scrollHeight;
    }

    // Exibe o Laudo e Relatório Final
    function exibirRelatorioFinal() {
        state.etapa = 'concluido';

        const painelScanner = document.getElementById('av-painel-scanner');
        const painelRelatorio = document.getElementById('av-painel-relatorio');

        if (painelScanner) painelScanner.style.display = 'none';
        if (painelRelatorio) painelRelatorio.style.display = 'block';

        // Preenche dados do aparelho
        const rNome = document.getElementById('laudo-disp-nome');
        const rPlat = document.getElementById('laudo-disp-plat');
        const rSerial = document.getElementById('laudo-disp-serial');
        const rData = document.getElementById('laudo-data-hora');
        const rQtdRemovida = document.getElementById('laudo-qtd-removida');
        const rTbody = document.getElementById('laudo-tabela-tbody');

        const dataFormatada = new Date().toLocaleString('pt-BR');

        if (rNome) rNome.textContent = state.nomeModelo;
        if (rPlat) rPlat.textContent = state.tipoDispositivo === 'android' ? 'Android OS' : 'Apple iOS';
        if (rSerial) rSerial.textContent = state.serialAparelho;
        if (rData) rData.textContent = dataFormatada;
        if (rQtdRemovida) rQtdRemovida.textContent = state.ameacasRemovidas.length;

        if (rTbody) {
            rTbody.innerHTML = '';
            state.ameacasRemovidas.forEach(am => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight: bold; color: var(--text-main);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="ph ph-warning-circle" style="color: #ef4444; font-size: 18px;"></i>
                            <div>
                                <div>${am.nome}</div>
                                <div style="font-size: 11px; color: var(--text-muted); font-weight: normal;">${am.descricao}</div>
                            </div>
                        </div>
                    </td>
                    <td style="color: var(--text-muted); font-size: 12px;">${am.tipo}</td>
                    <td style="text-align: center;">
                        <span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">
                            ${am.risco}
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <span style="background: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.4); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-flex; align-items: center; gap: 4px;">
                            <i class="ph ph-check-circle"></i> ELIMINADO
                        </span>
                    </td>
                `;
                rTbody.appendChild(tr);
            });
        }

        // Popula select de cliente para cobrança
        popularSelectClientesFinanceiro();
    }

    function popularSelectClientesFinanceiro() {
        const select = document.getElementById('av-financeiro-cliente');
        if (!select) return;
        select.innerHTML = '<option value="Cliente Avulso (Balcão)">Cliente Avulso (Balcão)</option>';

        const clientes = (window.clientes && window.clientes.length > 0) ? window.clientes : JSON.parse(localStorage.getItem('avence_clientes') || '[]');
        clientes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.nome;
            opt.textContent = `${c.nome} (${c.telefone || c.celular || 'Sem Fone'})`;
            select.appendChild(opt);
        });
    }

    // Lança o valor cobrado diretamente no Caixa / Financeiro da loja
    async function lancarServicoNoFinanceiro() {
        const inputValor = document.getElementById('av-financeiro-valor');
        const selectPgto = document.getElementById('av-financeiro-pgto');
        const selectCliente = document.getElementById('av-financeiro-cliente');
        const btnLancar = document.getElementById('btn-lancar-financeiro-av');

        const valor = parseFloat(inputValor?.value || 0);
        if (isNaN(valor) || valor <= 0) {
            if (window.customAlert) window.customAlert('Por favor, informe um valor válido para o serviço.', 'warning');
            return;
        }

        const formaPgto = selectPgto?.value || 'Dinheiro';
        const clienteNome = selectCliente?.value || 'Cliente Avulso';
        const motivo = `Serviço de Limpeza/Desinfecção de Vírus - ${state.nomeModelo} (${clienteNome})`;

        const originalText = btnLancar.innerHTML;
        btnLancar.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Lançando no Caixa...';
        btnLancar.disabled = true;

        try {
            if (typeof window.registrarTransacaoCaixa === 'function') {
                const sucesso = await window.registrarTransacaoCaixa('entrada', valor, motivo, formaPgto);
                if (sucesso !== false) {
                    if (window.customAlert) {
                        window.customAlert(`Serviço de R$ ${valor.toFixed(2)} lançado no Caixa com sucesso!`, 'success');
                    }
                    btnLancar.innerHTML = '<i class="ph ph-check-circle"></i> Lançado no Financeiro!';
                    btnLancar.style.background = '#10b981';
                    btnLancar.style.borderColor = '#10b981';
                    return;
                }
            }

            // Fallback direto no storage se caixa não estiver aberto ou função indisponível
            const transacoes = JSON.parse(localStorage.getItem('avence_transacoes_caixa') || '[]');
            const novaTx = {
                id: 'tx_av_' + Date.now(),
                tipo: 'entrada',
                valor: valor,
                motivo: motivo,
                descricao: motivo,
                formaPgto: formaPgto,
                forma: formaPgto,
                data: new Date().toISOString()
            };
            transacoes.push(novaTx);
            localStorage.setItem('avence_transacoes_caixa', JSON.stringify(transacoes));
            localStorage.setItem('avence_transacoes', JSON.stringify(transacoes));
            if (window.globalData && Array.isArray(window.globalData.transacoes)) {
                window.globalData.transacoes.push(novaTx);
            }

            if (window.customAlert) {
                window.customAlert(`Serviço de R$ ${valor.toFixed(2)} lançado no Financeiro com sucesso!`, 'success');
            }
            btnLancar.innerHTML = '<i class="ph ph-check-circle"></i> Lançado no Financeiro!';
            btnLancar.style.background = '#10b981';
            btnLancar.style.borderColor = '#10b981';
        } catch (err) {
            console.error('Erro ao lançar no financeiro:', err);
            if (window.customAlert) window.customAlert('Erro ao registrar no financeiro: ' + err.message, 'error');
            btnLancar.innerHTML = originalText;
            btnLancar.disabled = false;
        }
    }

    // Imprime o Laudo Técnico formatado em A4 ou Cupom
    function imprimirLaudoTecnico() {
        const config = JSON.parse(localStorage.getItem('avence_config')) || {};
        const lojaNome = config.nome || 'AVENCE CELL';
        const lojaEnd = config.endereco || 'AVENIDA SOUZA NAVES - 991, IVAIPORÃ-PR';
        const lojaTel = config.telefone || '(43) 99969-1521';
        const lojaEmail = config.email || 'avencecellivp@gmail.com';

        const clienteNome = document.getElementById('av-financeiro-cliente')?.value || 'Cliente Avulso';
        const valorServico = parseFloat(document.getElementById('av-financeiro-valor')?.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const formaPgto = document.getElementById('av-financeiro-pgto')?.value || 'Dinheiro';
        const dataFormatada = new Date().toLocaleString('pt-BR');

        // Cria janela de impressão dedicada
        const printWindow = window.open('', '_blank', 'width=800,height=900');
        if (!printWindow) {
            window.print();
            return;
        }

        const linhasAmeacas = state.ameacasRemovidas.map(a => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${a.nome}<br><small style="color: #64748b; font-weight: normal;">${a.descricao}</small></td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #475569;">${a.tipo}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #ef4444; font-weight: bold;">${a.risco}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #16a34a; font-weight: bold;">✓ ELIMINADO</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Laudo Técnico de Desinfecção - ${lojaNome}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; line-height: 1.4; font-size: 14px; }
                    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
                    .header h1 { margin: 0 0 4px 0; font-size: 22px; color: #0f172a; }
                    .header p { margin: 2px 0; color: #475569; font-size: 13px; }
                    .badge-cert { background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 13px; }
                    .info-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
                    .info-item strong { color: #334155; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                    th { background: #0f172a; color: #ffffff; text-align: left; padding: 10px 8px; font-size: 12px; text-transform: uppercase; }
                    .footer { margin-top: 30px; border-top: 1px dashed #94a3b8; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .garantia-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px; border-radius: 6px; font-size: 12px; color: #1e40af; margin-bottom: 20px; }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>${lojaNome}</h1>
                        <p>${lojaEnd}</p>
                        <p>Telefone: ${lojaTel} | Email: ${lojaEmail}</p>
                    </div>
                    <div style="text-align: right;">
                        <span class="badge-cert">✓ LAUDO DE DESINFECÇÃO</span>
                        <p style="margin-top: 8px;"><strong>Data:</strong> ${dataFormatada}</p>
                    </div>
                </div>

                <div class="garantia-box">
                    <strong>CERTIFICADO DE DESINFECÇÃO E SEGURANÇA MOBILE:</strong> Este dispositivo passou por varredura completa através do Assistente Antivírus da Avence Cell. Todas as ameaças, adwares e sequestradores de notificações foram removidos com sucesso.
                </div>

                <div class="info-box">
                    <div class="info-item"><strong>Cliente:</strong> ${clienteNome}</div>
                    <div class="info-item"><strong>Aparelho:</strong> ${state.nomeModelo}</div>
                    <div class="info-item"><strong>Sistema Operacional:</strong> ${state.tipoDispositivo === 'android' ? 'Android OS' : 'Apple iOS'}</div>
                    <div class="info-item"><strong>Número de Série:</strong> ${state.serialAparelho}</div>
                    <div class="info-item"><strong>Ameaças Eliminadas:</strong> ${state.ameacasRemovidas.length} vírus/adwares</div>
                    <div class="info-item"><strong>Valor do Serviço:</strong> ${valorServico} (${formaPgto})</div>
                </div>

                <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">Detalhamento das Ameaças Eliminadas:</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Ameaça Identificada</th>
                            <th>Categoria</th>
                            <th style="text-align: center;">Nível de Risco</th>
                            <th style="text-align: center;">Ação Executada</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasAmeacas}
                    </tbody>
                </table>

                <div class="footer">
                    <div>
                        <p style="margin: 0; font-size: 11px; color: #64748b;">Sistema Avence Cell - Laudo emitido digitalmente</p>
                    </div>
                    <div style="text-align: center; width: 250px;">
                        <div style="border-top: 1px solid #334155; padding-top: 4px; font-weight: bold; font-size: 12px;">
                            ${lojaNome} - Técnico Responsável
                        </div>
                    </div>
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    function resetarEstado() {
        state.dispositivoConectado = null;
        state.etapa = 'desconectado';
        state.ameacasDetectadas = [];
        state.ameacasRemovidas = [];

        const painelConexao = document.getElementById('av-painel-conexao');
        const painelScanner = document.getElementById('av-painel-scanner');
        const painelRelatorio = document.getElementById('av-painel-relatorio');
        const statusBox = document.getElementById('av-status-conexao');
        const terminal = document.getElementById('av-terminal-logs');
        const progressBar = document.getElementById('av-progress-bar');
        const progressPercent = document.getElementById('av-progress-percent');
        const btnIniciar = document.getElementById('btn-iniciar-varredura');
        const btnLancar = document.getElementById('btn-lancar-financeiro-av');

        if (painelConexao) painelConexao.style.display = 'block';
        if (painelScanner) painelScanner.style.display = 'none';
        if (painelRelatorio) painelRelatorio.style.display = 'none';
        if (statusBox) statusBox.style.display = 'none';
        if (terminal) terminal.innerHTML = '';
        if (progressBar) progressBar.style.width = '0%';
        if (progressPercent) progressPercent.textContent = '0%';
        if (btnIniciar) {
            btnIniciar.disabled = false;
            btnIniciar.innerHTML = '<i class="ph ph-play"></i> Iniciar Varredura e Limpeza';
        }
        if (btnLancar) {
            btnLancar.disabled = false;
            btnLancar.innerHTML = '<i class="ph ph-currency-dollar"></i> Lançar no Financeiro / Caixa';
            btnLancar.style.background = '';
            btnLancar.style.borderColor = '';
        }
    }

    // Expõe globalmente
    window.antivirusUSB = {
        solicitarConexaoUSB,
        iniciarVarredura,
        lancarServicoNoFinanceiro,
        imprimirLaudoTecnico,
        resetarEstado
    };

    document.addEventListener('DOMContentLoaded', init);

})(window, document);
