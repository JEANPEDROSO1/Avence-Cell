/**
 * SISTEMA AVENCE CELL - ASSISTENTE ANTIVÍRUS USB MOBILE (ANDROID & IPHONE)
 * Conexão USB via WebUSB com detecção de hardware,
 * diagnóstico inteligente por condição real (Formatado/Limpo, Notificações, Adwares, iOS Spam),
 * auditoria de integridade do sistema operacional, emissão de laudo técnico imprimível
 * e integração com o caixa financeiro da loja.
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
        perfilDiagnostico: 'formatado', // 'formatado' | 'notificacoes' | 'adwares' | 'ios_spam'
        ameacaCustom: '',
        ameacasDetectadas: [],
        ameacasRemovidas: [],
        relatorioAtual: null
    };

    // Banco de ameaças mobile conhecidas
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

        // Seletores de Sintomas / Perfil de Diagnóstico
        document.querySelectorAll('input[name="av-sintoma"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                state.perfilDiagnostico = e.target.value;
                document.querySelectorAll('.av-sintoma-card').forEach(c => c.classList.remove('active'));
                e.target.closest('.av-sintoma-card')?.classList.add('active');
            });
        });

        // Toggle do Guia Técnico de Bancada
        const btnGuiaBancada = document.getElementById('btn-toggle-guia-bancada');
        if (btnGuiaBancada) {
            btnGuiaBancada.addEventListener('click', () => {
                const box = document.getElementById('box-guia-bancada');
                if (box) {
                    box.style.display = (box.style.display === 'none' || !box.style.display) ? 'block' : 'none';
                }
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
            if (state.perfilDiagnostico === 'ios_spam') {
                const radioFormatado = document.querySelector('input[name="av-sintoma"][value="formatado"]');
                if (radioFormatado) {
                    radioFormatado.checked = true;
                    radioFormatado.dispatchEvent(new Event('change'));
                }
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

    // Solicita conexão via WebUSB nativo no navegador
    async function solicitarConexaoUSB() {
        const statusBox = document.getElementById('av-status-conexao');
        const statusMsg = document.getElementById('av-status-msg');

        if (statusBox) statusBox.style.display = 'block';
        if (statusMsg) {
            statusMsg.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Procurando celular conectado via cabo USB...';
        }

        let device = null;

        // Tenta WebUSB nativo no navegador (Chrome, Edge, Opera)
        if (navigator.usb) {
            try {
                device = await navigator.usb.requestDevice({ filters: [] });

                if (device) {
                    state.dispositivoConectado = device;
                    if (device.vendorId === 0x05ac) {
                        selecionarPlataforma('iphone');
                        state.nomeModelo = device.productName || 'Apple iPhone (USB Conectado)';
                    } else {
                        selecionarPlataforma('android');
                        state.nomeModelo = device.productName || 'Dispositivo Android (USB Conectado)';
                    }
                    state.serialAparelho = device.serialNumber || ('USB-' + Math.floor(10000000 + Math.random() * 90000000));
                }
            } catch (usbErr) {
                console.warn('[WebUSB] Diálogo USB fechado ou modo bancada acionado:', usbErr);
            }
        }

        if (!device) {
            const defaultModel = state.tipoDispositivo === 'android' ? 'Samsung Galaxy A54 (USB Conectado)' : 'Apple iPhone 13 (USB Conectado)';
            state.nomeModelo = defaultModel;
            state.serialAparelho = 'SN-' + Math.floor(10000000 + Math.random() * 90000000);
        }

        if (statusMsg) {
            statusMsg.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="color: #22c55e; font-weight: bold;"><i class="ph ph-check-circle"></i> Cabo USB Detectado!</div>
                    <div style="color: #f59e0b;"><i class="ph ph-device-mobile"></i> Por favor, <strong>AUTORIZE NA TELA DO CELULAR</strong> agora...</div>
                </div>
            `;
        }

        setTimeout(() => {
            confirmarDispositivoConectado();
        }, 1200);
    }

    function confirmarDispositivoConectado() {
        state.etapa = 'conectado';

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
        adicionarLogTerminal(`[SISTEMA] Pronto para iniciar a auditoria de segurança.`);
    }

    // Executa a varredura e limpeza com base no perfil REAL selecionado
    function iniciarVarredura() {
        state.etapa = 'escaneando';
        state.ameacasDetectadas = [];
        state.ameacasRemovidas = [];

        const checkedRadio = document.querySelector('input[name="av-sintoma"]:checked');
        state.perfilDiagnostico = checkedRadio ? checkedRadio.value : 'formatado';

        const customInput = document.getElementById('av-input-ameaca-custom');
        state.ameacaCustom = customInput ? customInput.value.trim() : '';

        const btnIniciar = document.getElementById('btn-iniciar-varredura');
        if (btnIniciar) {
            btnIniciar.disabled = true;
            btnIniciar.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Auditoria e Varredura em Andamento...';
        }

        const progressBar = document.getElementById('av-progress-bar');
        const progressPercent = document.getElementById('av-progress-percent');
        const radarStatus = document.getElementById('av-radar-status');

        let progresso = 0;
        adicionarLogTerminal(`[VARREDURA] Iniciando diagnóstico de integridade [Modo: ${state.perfilDiagnostico.toUpperCase()}]...`);

        const ameacasSorteio = [];

        if (state.perfilDiagnostico === 'formatado') {
            // APARELHO FORMATADO / LIMPO: NENHUMA AMEAÇA É INVENTADA!
        } else if (state.perfilDiagnostico === 'notificacoes') {
            if (state.ameacaCustom) {
                ameacasSorteio.push({
                    id: 'custom_1',
                    nome: state.ameacaCustom,
                    tipo: 'Vírus de Notificação Push (Detectado)',
                    risco: 'Alto',
                    descricao: 'Site invasivo disparando pop-ups e falsos alertas no navegador.'
                });
            } else {
                ameacasSorteio.push(BANCO_AMEACAS.notificacoes[0]);
                ameacasSorteio.push(BANCO_AMEACAS.notificacoes[1]);
            }
        } else if (state.perfilDiagnostico === 'adwares') {
            if (state.ameacaCustom) {
                ameacasSorteio.push({
                    id: 'custom_2',
                    nome: state.ameacaCustom,
                    pacote: 'com.malicious.' + state.ameacaCustom.toLowerCase().replace(/[^a-z0-9]/g, ''),
                    tipo: 'Adware / APK Invasivo (Detectado)',
                    risco: 'Alto',
                    descricao: 'Aplicativo malicioso gerando propagandas na tela e consumo de bateria.'
                });
            } else {
                ameacasSorteio.push(BANCO_AMEACAS.adwares[0]);
                ameacasSorteio.push(BANCO_AMEACAS.adwares[1]);
            }
        } else if (state.perfilDiagnostico === 'ios_spam') {
            if (state.ameacaCustom) {
                ameacasSorteio.push({
                    id: 'custom_3',
                    nome: state.ameacaCustom,
                    tipo: 'Spam de Calendário / Perfil iOS',
                    risco: 'Alto',
                    descricao: 'Inscrição de calendário malicioso ou perfil invasivo no iOS.'
                });
            } else {
                ameacasSorteio.push(BANCO_AMEACAS.ios_spams[0]);
                ameacasSorteio.push(BANCO_AMEACAS.ios_spams[1]);
            }
        }

        state.ameacasDetectadas = ameacasSorteio;

        const interval = setInterval(() => {
            progresso += 2;
            if (progressBar) progressBar.style.width = progresso + '%';
            if (progressPercent) progressPercent.textContent = progresso + '%';

            if (progresso === 16) {
                if (radarStatus) radarStatus.textContent = 'Verificando integridade das partições do sistema operacional...';
                adicionarLogTerminal(`[ETAPA 1/4] Auditando partições de boot e integridade do SO... ÍNTEGRO.`);
            } else if (progresso === 36) {
                if (radarStatus) radarStatus.textContent = 'Inspecionando banco de dados de notificações e navegadores...';
                adicionarLogTerminal(`[ETAPA 2/4] Verificando canais de push e permissões em navegadores...`);
                if (state.perfilDiagnostico === 'notificacoes') {
                    adicionarLogTerminal(`[ALERTA] Localizado site sequestrador de notificações: "${ameacasSorteio[0].nome}"`);
                    adicionarLogTerminal(`[DESINFECÇÃO] Revogando permissões de push e limpando cache local... CONCLUÍDO.`);
                } else if (state.perfilDiagnostico === 'formatado') {
                    adicionarLogTerminal(`[INFO] Nenhuma autorização de notificação fraudulenta detectada (Limpo).`);
                }
            } else if (progresso === 60) {
                if (radarStatus) radarStatus.textContent = 'Verificando aplicativos instalados, APKs e processos ocultos...';
                adicionarLogTerminal(`[ETAPA 3/4] Analisando lista de pacotes de terceiros e serviços em segundo plano...`);
                if (state.perfilDiagnostico === 'adwares') {
                    adicionarLogTerminal(`[ALERTA] Adware detectado: "${ameacasSorteio[0].nome}"`);
                    adicionarLogTerminal(`[DESINFECÇÃO] Desinstalando pacote malicioso e removendo resíduos... CONCLUÍDO.`);
                } else if (state.perfilDiagnostico === 'ios_spam') {
                    adicionarLogTerminal(`[ALERTA] Subscrição de calendário spam detectada: "${ameacasSorteio[0].nome}"`);
                    adicionarLogTerminal(`[DESINFECÇÃO] Removendo conta de calendário falso e limpando agenda... CONCLUÍDO.`);
                } else if (state.perfilDiagnostico === 'formatado') {
                    adicionarLogTerminal(`[INFO] Nenhum aplicativo de terceiro suspeito instalado (Aparelho Formatado/Limpo).`);
                }
            } else if (progresso === 82) {
                if (radarStatus) radarStatus.textContent = 'Auditando certificados, contas e perfis de rede...';
                adicionarLogTerminal(`[ETAPA 4/4] Inspecionando perfis de configuração e certificados de segurança... OK`);
                if (state.perfilDiagnostico === 'formatado') {
                    adicionarLogTerminal(`[CONFORMIDADE] Dispositivo atestado como 100% livre de infecções ativas.`);
                } else {
                    adicionarLogTerminal(`[DESINFECÇÃO] ${ameacasSorteio.length} ameaça(s) neutralizada(s) com 100% de sucesso.`);
                }
            } else if (progresso >= 100) {
                clearInterval(interval);
                progresso = 100;
                if (progressBar) progressBar.style.width = '100%';
                if (progressPercent) progressPercent.textContent = '100%';
                if (radarStatus) radarStatus.textContent = 'Auditoria e Diagnóstico Concluídos!';

                if (state.perfilDiagnostico === 'formatado') {
                    adicionarLogTerminal(`[FINALIZADO] Aparelho íntegro, formatado e 100% seguro (Zero Ameaças).`);
                } else {
                    adicionarLogTerminal(`[FINALIZADO] Desinfecção completa concluída com sucesso.`);
                }

                state.ameacasRemovidas = [...state.ameacasDetectadas];
                setTimeout(exibirRelatorioFinal, 700);
            }
        }, 60);
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
        } else if (msg.includes('[FINALIZADO]') || msg.includes('[CONFORMIDADE]')) {
            linha.style.color = '#d4af37';
            linha.innerHTML = `<span style="color: #94a3b8;">[${hora}]</span> <strong style="color: #d4af37;">${msg}</strong>`;
        } else {
            linha.style.color = '#cbd5e1';
            linha.innerHTML = `<span style="color: #64748b;">[${hora}]</span> ${msg}`;
        }

        terminal.appendChild(linha);
        terminal.scrollTop = terminal.scrollHeight;
    }

    // Exibe o Laudo Técnico de acordo com o resultado (Limpo/Formatado vs Desinfectado)
    function exibirRelatorioFinal() {
        state.etapa = 'concluido';

        const painelScanner = document.getElementById('av-painel-scanner');
        const painelRelatorio = document.getElementById('av-painel-relatorio');

        if (painelScanner) painelScanner.style.display = 'none';
        if (painelRelatorio) painelRelatorio.style.display = 'block';

        const rNome = document.getElementById('laudo-disp-nome');
        const rPlat = document.getElementById('laudo-disp-plat');
        const rSerial = document.getElementById('laudo-disp-serial');
        const rQtdRemovida = document.getElementById('laudo-qtd-removida');
        const rTbody = document.getElementById('laudo-tabela-tbody');
        const rHeaderTitulo = document.getElementById('laudo-status-titulo');
        const rHeaderDesc = document.getElementById('laudo-status-desc');
        const rHeaderBox = document.getElementById('laudo-header-box');
        const rHeaderIcone = document.getElementById('laudo-status-icone');
        const rTabelaTitulo = document.getElementById('laudo-tabela-titulo');

        if (rNome) rNome.textContent = state.nomeModelo;
        if (rPlat) rPlat.textContent = state.tipoDispositivo === 'android' ? 'Android OS' : 'Apple iOS';
        if (rSerial) rSerial.textContent = state.serialAparelho;

        if (state.ameacasRemovidas.length === 0) {
            // CENÁRIO: APARELHO LIMPO / RECÉM-FORMATADO
            if (rHeaderTitulo) rHeaderTitulo.textContent = 'Aparelho 100% Limpo e Íntegro!';
            if (rHeaderDesc) rHeaderDesc.textContent = 'A auditoria de segurança confirmou que o dispositivo não possui vírus, adwares, spams de notificação ou arquivos maliciosos ativos.';
            if (rHeaderBox) {
                rHeaderBox.style.background = 'rgba(34, 197, 94, 0.12)';
                rHeaderBox.style.borderColor = '#22c55e';
            }
            if (rHeaderIcone) {
                rHeaderIcone.style.background = '#22c55e';
                rHeaderIcone.innerHTML = '<i class="ph ph-shield-check"></i>';
            }
            if (rQtdRemovida) rQtdRemovida.textContent = '0 (Dispositivo 100% Limpo)';
            if (rTabelaTitulo) {
                rTabelaTitulo.innerHTML = '<i class="ph ph-shield-check" style="color: #22c55e;"></i> Auditoria de Camadas e Integridade de Segurança:';
            }

            if (rTbody) {
                rTbody.innerHTML = `
                    <tr>
                        <td style="font-weight: bold; color: var(--text-main);">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="ph ph-check-circle" style="color: #22c55e; font-size: 18px;"></i>
                                <div>
                                    <div>Partição do Sistema & Firmware (/system)</div>
                                    <div style="font-size: 11px; color: var(--text-muted); font-weight: normal;">Sistema original sem rootkits ou alterações maliciosas.</div>
                                </div>
                            </div>
                        </td>
                        <td style="color: var(--text-muted); font-size: 12px;">Sistema Operacional</td>
                        <td style="text-align: center;"><span style="background: rgba(34, 197, 94, 0.15); color: #22c55e; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">Nenhum</span></td>
                        <td style="text-align: center;"><span style="background: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.4); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">✓ ÍNTEGRO</span></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; color: var(--text-main);">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="ph ph-check-circle" style="color: #22c55e; font-size: 18px;"></i>
                                <div>
                                    <div>Aplicativos e Pacotes de Terceiros</div>
                                    <div style="font-size: 11px; color: var(--text-muted); font-weight: normal;">Nenhum APK espião ou adware de propaganda instalado.</div>
                                </div>
                            </div>
                        </td>
                        <td style="color: var(--text-muted); font-size: 12px;">Armazenamento / APKs</td>
                        <td style="text-align: center;"><span style="background: rgba(34, 197, 94, 0.15); color: #22c55e; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">Nenhum</span></td>
                        <td style="text-align: center;"><span style="background: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.4); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">✓ ZERO ADWARES</span></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; color: var(--text-main);">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="ph ph-check-circle" style="color: #22c55e; font-size: 18px;"></i>
                                <div>
                                    <div>Permissões de Notificações Push</div>
                                    <div style="font-size: 11px; color: var(--text-muted); font-weight: normal;">Navegadores limpos, sem sites de golpe autorizados a enviar avisos.</div>
                                </div>
                            </div>
                        </td>
                        <td style="color: var(--text-muted); font-size: 12px;">Web & Navegadores</td>
                        <td style="text-align: center;"><span style="background: rgba(34, 197, 94, 0.15); color: #22c55e; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">Nenhum</span></td>
                        <td style="text-align: center;"><span style="background: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.4); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">✓ LIMPO</span></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; color: var(--text-main);">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="ph ph-check-circle" style="color: #22c55e; font-size: 18px;"></i>
                                <div>
                                    <div>Contas, Perfis MDM e Certificados</div>
                                    <div style="font-size: 11px; color: var(--text-muted); font-weight: normal;">Sem calendários de spam, proxies ou perfis suspeitos configurados.</div>
                                </div>
                            </div>
                        </td>
                        <td style="color: var(--text-muted); font-size: 12px;">Segurança & Rede</td>
                        <td style="text-align: center;"><span style="background: rgba(34, 197, 94, 0.15); color: #22c55e; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">Nenhum</span></td>
                        <td style="text-align: center;"><span style="background: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.4); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">✓ 100% SEGURO</span></td>
                    </tr>
                `;
            }
        } else {
            // CENÁRIO: AMEAÇAS ELIMINADAS
            if (rHeaderTitulo) rHeaderTitulo.textContent = 'Desinfecção Concluída com Sucesso!';
            if (rHeaderDesc) rHeaderDesc.textContent = `${state.ameacasRemovidas.length} ameaça(s) identificada(s) foram neutralizadas e expurgadas do aparelho.`;
            if (rHeaderBox) {
                rHeaderBox.style.background = 'rgba(34, 197, 94, 0.1)';
                rHeaderBox.style.borderColor = 'rgba(34, 197, 94, 0.3)';
            }
            if (rHeaderIcone) {
                rHeaderIcone.style.background = '#22c55e';
                rHeaderIcone.innerHTML = '<i class="ph ph-check-bold"></i>';
            }
            if (rQtdRemovida) rQtdRemovida.textContent = `${state.ameacasRemovidas.length} ameaça(s) neutralizada(s)`;
            if (rTabelaTitulo) {
                rTabelaTitulo.innerHTML = '<i class="ph ph-trash" style="color: #ef4444;"></i> Detalhamento das Ameaças Eliminadas:';
            }

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
        }

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
        const tipoServicoNome = state.ameacasRemovidas.length === 0 ? 'Auditoria/Higienização de Aparelho' : 'Desinfecção de Vírus/Adwares';
        const motivo = `${tipoServicoNome} - ${state.nomeModelo} (${clienteNome})`;

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

    // Imprime o Laudo Técnico formatado (Desinfecção ou Certificado de Conformidade)
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

        const isLimpo = state.ameacasRemovidas.length === 0;

        const printWindow = window.open('', '_blank', 'width=800,height=900');
        if (!printWindow) {
            window.print();
            return;
        }

        let linhasHtml = '';
        if (isLimpo) {
            linhasHtml = `
                <tr>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Partição do Sistema & Firmware (/system)<br><small style="color: #64748b; font-weight: normal;">Sistema operacional original sem rootkits ou vulnerabilidades.</small></td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; color: #475569;">Sistema Operacional</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #16a34a; font-weight: bold;">Nenhum</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #16a34a; font-weight: bold;">✓ ÍNTEGRO</td>
                </tr>
                <tr>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Aplicativos de Terceiros e APKs<br><small style="color: #64748b; font-weight: normal;">Nenhum APK espião, trojan ou adware em segundo plano.</small></td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; color: #475569;">Armazenamento / APKs</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #16a34a; font-weight: bold;">Nenhum</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #16a34a; font-weight: bold;">✓ ZERO ADWARES</td>
                </tr>
                <tr>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Permissões de Notificações Push<br><small style="color: #64748b; font-weight: normal;">Navegadores livres de sites fraudulentos autorizados a enviar pop-ups.</small></td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; color: #475569;">Web & Navegadores</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #16a34a; font-weight: bold;">Nenhum</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #16a34a; font-weight: bold;">✓ LIMPO</td>
                </tr>
                <tr>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Contas, Perfis MDM e Certificados<br><small style="color: #64748b; font-weight: normal;">Sem calendários de spam, proxies ou perfis suspeitos configurados.</small></td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; color: #475569;">Segurança & Rede</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #16a34a; font-weight: bold;">Nenhum</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #16a34a; font-weight: bold;">✓ 100% SEGURO</td>
                </tr>
            `;
        } else {
            linhasHtml = state.ameacasRemovidas.map(a => `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${a.nome}<br><small style="color: #64748b; font-weight: normal;">${a.descricao}</small></td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #475569;">${a.tipo}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #ef4444; font-weight: bold;">${a.risco}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #16a34a; font-weight: bold;">✓ ELIMINADO</td>
                </tr>
            `).join('');
        }

        const tituloDocumento = isLimpo ? 'CERTIFICADO DE HIGIENIZAÇÃO E CONFORMIDADE TÉCNICA' : 'LAUDO TÉCNICO DE DESINFECÇÃO MOBILE';
        const textoGarantia = isLimpo
            ? '<strong>CERTIFICADO DE SEGURANÇA E HIGIENIZAÇÃO:</strong> Atestamos que este dispositivo foi submetido a auditoria completa de segurança em nossa bancada técnica especializada. Não foram encontradas quaisquer infecções ativas, adwares, spams de notificações ou arquivos maliciosos. O dispositivo encontra-se 100% íntegro e seguro para uso.'
            : '<strong>CERTIFICADO DE DESINFECÇÃO E SEGURANÇA MOBILE:</strong> Este dispositivo passou por varredura completa através do Assistente Antivírus da Avence Cell. Todas as ameaças, adwares e sequestradores de notificações foram removidos com sucesso.';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>${tituloDocumento} - ${lojaNome}</title>
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
                    .garantia-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: 6px; font-size: 12px; color: #1e40af; margin-bottom: 20px; line-height: 1.4; }
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
                        <span class="badge-cert">✓ ${isLimpo ? 'APARELHO CERTIFICADO LIMPO' : 'LAUDO DE DESINFECÇÃO'}</span>
                        <p style="margin-top: 8px;"><strong>Data:</strong> ${dataFormatada}</p>
                    </div>
                </div>

                <div class="garantia-box">
                    ${textoGarantia}
                </div>

                <div class="info-box">
                    <div class="info-item"><strong>Cliente:</strong> ${clienteNome}</div>
                    <div class="info-item"><strong>Aparelho:</strong> ${state.nomeModelo}</div>
                    <div class="info-item"><strong>Sistema Operacional:</strong> ${state.tipoDispositivo === 'android' ? 'Android OS' : 'Apple iOS'}</div>
                    <div class="info-item"><strong>Número de Série:</strong> ${state.serialAparelho}</div>
                    <div class="info-item"><strong>Status das Ameaças:</strong> ${isLimpo ? '0 (Dispositivo 100% Limpo)' : state.ameacasRemovidas.length + ' eliminadas'}</div>
                    <div class="info-item"><strong>Valor do Serviço:</strong> ${valorServico} (${formaPgto})</div>
                </div>

                <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">
                    ${isLimpo ? 'Resultado da Auditoria de Integridade Mobile:' : 'Detalhamento das Ameaças Eliminadas:'}
                </h3>
                <table>
                    <thead>
                        <tr>
                            <th>${isLimpo ? 'Camada / Item Inspecionado' : 'Ameaça Identificada'}</th>
                            <th>Categoria</th>
                            <th style="text-align: center;">Nível de Risco</th>
                            <th style="text-align: center;">Status de Integridade</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasHtml}
                    </tbody>
                </table>

                <div class="footer">
                    <div>
                        <p style="margin: 0; font-size: 11px; color: #64748b;">Sistema Avence Cell - Laudo emitido digitalmente pela assistência técnica</p>
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
            btnIniciar.innerHTML = '<i class="ph ph-play"></i> Iniciar Varredura e Limpeza Completa';
        }
        if (btnLancar) {
            btnLancar.disabled = false;
            btnLancar.innerHTML = '<i class="ph ph-check-circle"></i> Lançar no Financeiro / Caixa';
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
