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
    window.showLoading('Sincronizando com Banco de Dados...');
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

        window.globalData.clientes = cli.documents;
        window.globalData.estoque = est.documents;
        window.globalData.config = cfg.documents[0] || {};
        window.globalData.colaboradores = col.documents;
        window.globalData.os = os.documents;
        window.globalData.transacoes = tr.documents;
        window.globalData.fechamentos = fec.documents;
        window.globalData.pontos = pts.documents;

        window.hideLoading();
        document.dispatchEvent(new Event('appwriteReady'));
    } catch (e) {
        window.showLoading('Erro de conexão com Appwrite. Verifique a internet e as permissões.');
        console.error(e);
    }
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
