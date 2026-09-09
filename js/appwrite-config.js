const client = new Appwrite.Client();

client
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')
    .setProject('6a959bb30013a97d1f1b');

const databases = new Appwrite.Databases(client);
const account = new Appwrite.Account(client);

const APPWRITE_DB_ID = 'avence_db';
const COL_CONFIG = 'config';
const COL_COLABS = 'colaboradores';
const COL_ESTOQUE = 'estoque';
const COL_CLIENTES = 'clientes';
const COL_OS = 'ordens_servico';
const COL_TRANS = 'transacoes';
const COL_CAIXA = 'fechamentos';
const COL_PONTOS = 'pontos';

window.appwrite = {
    client,
    databases,
    account,
    ID: Appwrite.ID,
    Query: Appwrite.Query,
    DB_ID: APPWRITE_DB_ID,
    COL_CONFIG,
    COL_COLABS,
    COL_ESTOQUE,
    COL_CLIENTES,
    COL_OS,
    COL_TRANS,
    COL_CAIXA,
    COL_PONTOS
};

// Helper for loading states
window.showLoading = function(message = 'Carregando...') {
    let loader = document.getElementById('appwrite-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'appwrite-loader';
        loader.style.position = 'fixed';
        loader.style.top = '0';
        loader.style.left = '0';
        loader.style.width = '100vw';
        loader.style.height = '100vh';
        loader.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        loader.style.color = '#fff';
        loader.style.display = 'flex';
        loader.style.flexDirection = 'column';
        loader.style.alignItems = 'center';
        loader.style.justifyContent = 'center';
        loader.style.zIndex = '99999';
        loader.style.backdropFilter = 'blur(4px)';
        loader.innerHTML = `
            <i class="ph ph-spinner" style="font-size: 48px; animation: spin 1s linear infinite;"></i>
            <p id="appwrite-loader-msg" style="margin-top: 16px; font-size: 18px; font-weight: bold;">${message}</p>
            <style>
                @keyframes spin { 100% { transform: rotate(360deg); } }
            </style>
        `;
        document.body.appendChild(loader);
    } else {
        document.getElementById('appwrite-loader-msg').textContent = message;
        loader.style.display = 'flex';
    }
};

window.hideLoading = function() {
    const loader = document.getElementById('appwrite-loader');
    if (loader) loader.style.display = 'none';
};

window.globalData = {
    clientes: [],
    estoque: [],
    config: {},
    colaboradores: [],
    os: [],
    transacoes: [],
    fechamentos: [],
    pontos: []
};

window.bootAppwrite = async function() {
    try {
        const [cli, est, cfg, col, os, tr, fec, pts] = await Promise.all([
            window.appwrite.databases.listDocuments(window.appwrite.DB_ID, window.appwrite.COL_CLIENTES, [window.appwrite.Query.limit(5000)]),
            window.appwrite.databases.listDocuments(window.appwrite.DB_ID, window.appwrite.COL_ESTOQUE, [window.appwrite.Query.limit(5000)]),
            window.appwrite.databases.listDocuments(window.appwrite.DB_ID, window.appwrite.COL_CONFIG),
            window.appwrite.databases.listDocuments(window.appwrite.DB_ID, window.appwrite.COL_COLABS, [window.appwrite.Query.limit(5000)]),
            window.appwrite.databases.listDocuments(window.appwrite.DB_ID, window.appwrite.COL_OS, [window.appwrite.Query.limit(5000)]),
            window.appwrite.databases.listDocuments(window.appwrite.DB_ID, window.appwrite.COL_TRANS, [window.appwrite.Query.limit(5000)]),
            window.appwrite.databases.listDocuments(window.appwrite.DB_ID, window.appwrite.COL_CAIXA, [window.appwrite.Query.limit(5000)]),
            window.appwrite.databases.listDocuments(window.appwrite.DB_ID, window.appwrite.COL_PONTOS, [window.appwrite.Query.limit(5000)])
        ]);

        window.globalData.clientes = cli.documents.map(d => ({...d, id: d.$id}));
        window.globalData.estoque = est.documents.map(d => ({...d, id: d.$id}));
        window.globalData.config = cfg.documents[0] ? {...cfg.documents[0], id: cfg.documents[0].$id} : {};
        window.globalData.colaboradores = col.documents.map(d => ({...d, id: d.$id}));
        window.globalData.os = os.documents.map(d => ({...d, id: d.$id}));
        window.globalData.transacoes = tr.documents.map(d => ({
            ...d,
            id: d.$id,
            motivo: d.motivo || d.descricao || '',
            descricao: d.descricao || d.motivo || '',
            formaPgto: d.formaPgto || d.forma || 'dinheiro',
            forma: d.forma || d.formaPgto || 'dinheiro',
            vendedor: d.vendedor || 'Geral'
        }));
        window.globalData.fechamentos = fec.documents.map(d => ({
            ...d,
            id: d.$id,
            valorFechado: d.valorFechado !== undefined ? d.valorFechado : (d.saldoCalculado || 0),
            saldoCalculado: d.saldoCalculado !== undefined ? d.saldoCalculado : (d.valorFechado || 0),
            responsavel: d.responsavel || d.responsavelFechamento || '',
            responsavelFechamento: d.responsavelFechamento || d.responsavel || '',
            data: d.data || d.dataFechamento || '',
            dataFechamento: d.dataFechamento || d.data || ''
        }));
        window.globalData.pontos = pts.documents.map(d => ({...d, id: d.$id}));

        // Atualizar localStorage para manter sincronia com o banco em nuvem
        localStorage.setItem('avence_clientes', JSON.stringify(window.globalData.clientes));
        localStorage.setItem('avence_estoque', JSON.stringify(window.globalData.estoque));
        localStorage.setItem('avence_config', JSON.stringify(window.globalData.config));
        localStorage.setItem('avence_colaboradores', JSON.stringify(window.globalData.colaboradores));
        localStorage.setItem('avence_os', JSON.stringify(window.globalData.os));
        localStorage.setItem('avence_transacoes', JSON.stringify(window.globalData.transacoes));
        localStorage.setItem('avence_transacoes_caixa', JSON.stringify(window.globalData.transacoes));
        localStorage.setItem('avence_fechamentos', JSON.stringify(window.globalData.fechamentos));
        localStorage.setItem('avence_pontos', JSON.stringify(window.globalData.pontos));

        // Aplicar status global inicial do caixa
        if (window.globalData.config) {
            const isAberto = window.globalData.config.caixaAberto === true || window.globalData.config.caixaAberto === 'true';
            const fundo = parseFloat(window.globalData.config.fundoCaixa) || 0;
            const resp = window.globalData.config.responsavelCaixa || '';
            window.caixaAberto = isAberto;
            if (window.updateGlobalCaixaUI) window.updateGlobalCaixaUI(isAberto, resp, fundo);
        }

        document.dispatchEvent(new Event('appwriteReady'));

        // Iniciar monitoramento Realtime e polling contínuo
        if (typeof window.initAppwriteRealtime === 'function') {
            window.initAppwriteRealtime();
        }
    } catch (e) {
        console.warn('Appwrite indisponível ou falha de conexão (operando no modo offline local):', e);
        try {
            window.globalData.clientes = JSON.parse(localStorage.getItem('avence_clientes') || '[]');
            window.globalData.estoque = JSON.parse(localStorage.getItem('avence_estoque') || '[]');
            window.globalData.config = JSON.parse(localStorage.getItem('avence_config') || '{}');
            window.globalData.colaboradores = JSON.parse(localStorage.getItem('avence_colaboradores') || '[]');
            window.globalData.os = JSON.parse(localStorage.getItem('avence_os') || '[]');
            window.globalData.transacoes = JSON.parse(localStorage.getItem('avence_transacoes') || '[]');
            window.globalData.fechamentos = JSON.parse(localStorage.getItem('avence_fechamentos') || '[]');
            window.globalData.pontos = JSON.parse(localStorage.getItem('avence_pontos') || '[]');

            if (window.globalData.config) {
                const isAberto = window.globalData.config.caixaAberto === true || window.globalData.config.caixaAberto === 'true';
                const fundo = parseFloat(window.globalData.config.fundoCaixa) || 0;
                const resp = window.globalData.config.responsavelCaixa || '';
                window.caixaAberto = isAberto;
                if (window.updateGlobalCaixaUI) window.updateGlobalCaixaUI(isAberto, resp, fundo);
            }
        } catch(err) {
            console.error('Erro ao recuperar cache local:', err);
        }
        window.hideLoading();
        document.dispatchEvent(new Event('appwriteReady'));
    }
};

// ===================================================
// SISTEMA DE SINCRONIZAÇÃO EM TEMPO REAL & POLLING
// ===================================================

window.updateGlobalCaixaUI = function(isAberto, responsavel = '', fundo = 0) {
    window.caixaAberto = !!isAberto;

    // Header badge
    const headerBadge = document.getElementById('header-caixa-status');
    const headerText = document.getElementById('header-caixa-text');
    const headerDot = document.getElementById('header-caixa-dot');
    if (headerBadge && headerText) {
        if (isAberto) {
            headerBadge.style.background = 'rgba(34, 197, 94, 0.15)';
            headerBadge.style.color = '#22c55e';
            headerBadge.style.borderColor = 'rgba(34, 197, 94, 0.3)';
            const respFormatado = responsavel ? ` • ${responsavel.split(' ')[0]}` : '';
            headerText.textContent = `Caixa Aberto${respFormatado}`;
            if (headerDot) headerDot.style.background = '#22c55e';
        } else {
            headerBadge.style.background = 'rgba(239, 68, 68, 0.15)';
            headerBadge.style.color = '#ef4444';
            headerBadge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            headerText.textContent = 'Caixa Fechado';
            if (headerDot) headerDot.style.background = '#ef4444';
        }
    }

    // PDV badge
    const pdvBadge = document.getElementById('pdv-caixa-badge');
    if (pdvBadge) {
        if (isAberto) {
            pdvBadge.style.background = '#22c55e';
            const respTxt = responsavel ? ` (${responsavel})` : '';
            pdvBadge.innerHTML = `<i class="ph ph-lock-key-open"></i> <span>Caixa Aberto${respTxt}</span>`;
        } else {
            pdvBadge.style.background = '#ef4444';
            pdvBadge.innerHTML = `<i class="ph ph-lock-key"></i> <span>Caixa Fechado</span>`;
        }
    }

    // Menu sidebar dot
    const sidebarDot = document.getElementById('sidebar-caixa-dot');
    if (sidebarDot) {
        sidebarDot.style.background = isAberto ? '#22c55e' : '#ef4444';
    }

    // Financeiro interno
    if (typeof window.applyCaixaStatus === 'function') {
        window.applyCaixaStatus(isAberto, fundo, responsavel);
    }
};

window.handleConfigRealtimeUpdate = function(cfg) {
    if (!cfg) return;
    const isAberto = cfg.caixaAberto === true || cfg.caixaAberto === 'true';
    const fundo = parseFloat(cfg.fundoCaixa) || 0;
    const resp = cfg.responsavelCaixa || '';

    if (!window.globalData) window.globalData = {};
    window.globalData.config = { ...window.globalData.config, ...cfg };
    window.caixaAberto = isAberto;

    localStorage.setItem('avence_config', JSON.stringify(window.globalData.config));
    localStorage.setItem('avence_caixa_aberto', JSON.stringify(isAberto));
    localStorage.setItem('avence_fundo_caixa', fundo.toString());
    if (resp) localStorage.setItem('avence_abertura_responsavel', resp);

    window.updateGlobalCaixaUI(isAberto, resp, fundo);
};

window.syncTransacoesList = function(documents) {
    if (!Array.isArray(documents)) return;
    if (!window.globalData) window.globalData = {};
    if (!Array.isArray(window.globalData.transacoes)) window.globalData.transacoes = [];

    let hasChanges = false;
    documents.forEach(doc => {
        const id = doc.$id || doc.id;
        const formatted = {
            ...doc,
            id: id,
            motivo: doc.motivo || doc.descricao || '',
            descricao: doc.descricao || doc.motivo || '',
            formaPgto: doc.formaPgto || doc.forma || 'dinheiro',
            forma: doc.forma || doc.formaPgto || 'dinheiro',
            vendedor: doc.vendedor || 'Geral',
            valor: parseFloat(doc.valor) || 0
        };

        const idx = window.globalData.transacoes.findIndex(t => t.id === id || (t.data === formatted.data && t.valor === formatted.valor && t.motivo === formatted.motivo));
        if (idx >= 0) {
            // Se mudou algo, atualiza
            if (JSON.stringify(window.globalData.transacoes[idx]) !== JSON.stringify(formatted)) {
                window.globalData.transacoes[idx] = formatted;
                hasChanges = true;
            }
        } else {
            window.globalData.transacoes.push(formatted);
            hasChanges = true;
        }
    });

    if (hasChanges) {
        localStorage.setItem('avence_transacoes', JSON.stringify(window.globalData.transacoes));
        localStorage.setItem('avence_transacoes_caixa', JSON.stringify(window.globalData.transacoes));
        if (typeof window.onTransacoesSynced === 'function') {
            window.onTransacoesSynced(window.globalData.transacoes);
        } else if (typeof window.renderFinanceiro === 'function') {
            window.renderFinanceiro();
        }
    }
};

window.syncCaixaAndTransacoes = async function() {
    try {
        if (!window.appwrite || !window.appwrite.databases) return;

        // 1. Sincronizar Config (Status do Caixa)
        const cfgList = await window.appwrite.databases.listDocuments(window.appwrite.DB_ID, window.appwrite.COL_CONFIG);
        if (cfgList && cfgList.documents && cfgList.documents[0]) {
            window.handleConfigRealtimeUpdate(cfgList.documents[0]);
        }

        // 2. Sincronizar Transações (Vendas de todos os usuários)
        const trList = await window.appwrite.databases.listDocuments(
            window.appwrite.DB_ID,
            window.appwrite.COL_TRANS,
            [window.appwrite.Query.limit(5000)]
        );
        if (trList && trList.documents) {
            window.syncTransacoesList(trList.documents);
        }
    } catch(err) {
        // Blip de rede tratado silenciosamente
    }
};

let realtimeSubscribed = false;
window.initAppwriteRealtime = function() {
    if (realtimeSubscribed) return;
    realtimeSubscribed = true;

    try {
        if (window.appwrite && window.appwrite.client) {
            // Escutar atualizações da coleção de Configurações (Caixa)
            window.appwrite.client.subscribe(
                `databases.${window.appwrite.DB_ID}.collections.${window.appwrite.COL_CONFIG}.documents`,
                response => {
                    if (response && response.payload) {
                        window.handleConfigRealtimeUpdate(response.payload);
                    }
                }
            );

            // Escutar novas transações e vendas
            window.appwrite.client.subscribe(
                `databases.${window.appwrite.DB_ID}.collections.${window.appwrite.COL_TRANS}.documents`,
                response => {
                    if (response && response.payload) {
                        window.syncTransacoesList([response.payload]);
                    }
                }
            );
        }
    } catch(err) {
        console.warn('Inscrição Realtime não disponível, operando com polling contínuo:', err);
    }

    // Polling contínuo a cada 4 segundos como garantia absoluta entre máquinas
    setInterval(() => {
        if (window.syncCaixaAndTransacoes) {
            window.syncCaixaAndTransacoes();
        }
    }, 4000);

    // Sincronizar imediatamente ao focar na aba
    window.addEventListener('focus', () => {
        if (window.syncCaixaAndTransacoes) window.syncCaixaAndTransacoes();
    });

    // Sincronizar instantaneamente entre abas do mesmo navegador
    window.addEventListener('storage', (e) => {
        if (e.key === 'avence_caixa_sync_event' || e.key === 'avence_caixa_aberto' || e.key === 'avence_config') {
            try {
                const cfg = JSON.parse(localStorage.getItem('avence_config') || '{}');
                window.handleConfigRealtimeUpdate(cfg);
            } catch(err){}
        }
        if (e.key === 'avence_transacoes_sync_event' || e.key === 'avence_transacoes_caixa') {
            try {
                const tr = JSON.parse(localStorage.getItem('avence_transacoes_caixa') || '[]');
                window.syncTransacoesList(tr);
            } catch(err){}
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const btnMigrar = document.getElementById('btn-migrar-appwrite');
    if (btnMigrar) {
        btnMigrar.addEventListener('click', async () => {
            if (!confirm('Tem certeza? Isso fará backup do seu estoque e clientes locais para a Nuvem. Só faça isso UMA vez para não duplicar!')) return;
            
            window.showLoading('Migrando dados para a Nuvem. Isso pode demorar alguns minutos...');
            try {
                // Migrar Clientes
                const clientes = JSON.parse(localStorage.getItem('avence_clientes') || '[]');
                for (const c of clientes) {
                    await window.appwrite.databases.createDocument(window.appwrite.DB_ID, window.appwrite.COL_CLIENTES, window.appwrite.ID.unique(), {
                        nome: c.nome,
                        cpf: c.cpf || '',
                        endereco: c.endereco || '',
                        telefone: c.telefone || '',
                        celular: c.celular || '',
                        observacoes: c.observacoes || ''
                    });
                }

                // Migrar Estoque
                const estoque = JSON.parse(localStorage.getItem('avence_estoque') || '[]');
                for (const e of estoque) {
                    await window.appwrite.databases.createDocument(window.appwrite.DB_ID, window.appwrite.COL_ESTOQUE, window.appwrite.ID.unique(), {
                        ean: e.codigo || '',
                        nome: e.nome,
                        custo: parseFloat(e.custo) || 0,
                        venda: parseFloat(e.venda) || 0,
                        qtd: parseInt(e.qtd) || 0,
                        qtd_inicial: parseInt(e.qtd_inicial) || 0,
                        tipo: e.tipo || 'peca'
                    });
                }
                
                // Migrar Colaboradores
                const colaboradores = JSON.parse(localStorage.getItem('avence_colaboradores') || '[]');
                for (const col of colaboradores) {
                    await window.appwrite.databases.createDocument(window.appwrite.DB_ID, window.appwrite.COL_COLABS, window.appwrite.ID.unique(), {
                        nome: col.nome,
                        senha: col.senha,
                        cargo: col.cargo || 'Funcionario'
                    });
                }

                window.hideLoading();
                alert('Migração concluída com sucesso! Os dados foram enviados para o Appwrite.');
            } catch (err) {
                window.hideLoading();
                alert('Erro durante a migração: ' + err.message);
            }
        });
    }
});

