const sdk = require('node-appwrite');

const client = new sdk.Client()
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')
    .setProject('6a959bb30013a97d1f1b')
    .setKey('standard_b185b8a80f7c53e0ec792b069f483d218db37cdbd155e799d8e247cfc2d2709bc9a691a5610ce7f694ab581f842fccdb554f23e46e99547a334d794f400a5573c05b4de0c530fa8fe9a9f92bd109a1d96680a6f58f4cb486c49a6b87f9bf0c042cf5ffabfbeff51ecb2d9b9f6ef209bfb4aa9c98a40fc8da2c201e7dffdcac4c');

const databases = new sdk.Databases(client);

const DB_ID = 'avence_db';

const collectionsToCreate = [
    {
        id: 'config', name: 'Configuracoes',
        attributes: [
            { key: 'storeName', type: 'string', size: 255, required: false },
            { key: 'bgImage', type: 'string', size: 2000, required: false },
            { key: 'osTitulo', type: 'string', size: 255, required: false },
            { key: 'osEndereco', type: 'string', size: 255, required: false },
            { key: 'osComplemento', type: 'string', size: 255, required: false },
            { key: 'osTelefone', type: 'string', size: 255, required: false },
            { key: 'osEmail', type: 'string', size: 255, required: false },
            { key: 'osTermos', type: 'string', size: 5000, required: false },
            { key: 'osTermosVenda', type: 'string', size: 5000, required: false }
        ]
    },
    {
        id: 'colaboradores', name: 'Colaboradores',
        attributes: [
            { key: 'nome', type: 'string', size: 255, required: true },
            { key: 'senha', type: 'string', size: 255, required: true },
            { key: 'cargo', type: 'string', size: 500, required: false }
        ]
    },
    {
        id: 'estoque', name: 'Estoque',
        attributes: [
            { key: 'ean', type: 'string', size: 255, required: false },
            { key: 'nome', type: 'string', size: 500, required: true },
            { key: 'custo', type: 'float', required: false },
            { key: 'venda', type: 'float', required: false },
            { key: 'qtd', type: 'integer', required: false },
            { key: 'qtd_inicial', type: 'integer', required: false },
            { key: 'tipo', type: 'string', size: 255, required: true }
        ]
    },
    {
        id: 'clientes', name: 'Clientes',
        attributes: [
            { key: 'nome', type: 'string', size: 255, required: true },
            { key: 'cpf', type: 'string', size: 50, required: false },
            { key: 'endereco', type: 'string', size: 500, required: false },
            { key: 'telefone', type: 'string', size: 50, required: false },
            { key: 'celular', type: 'string', size: 50, required: false },
            { key: 'observacoes', type: 'string', size: 2000, required: false }
        ]
    },
    {
        id: 'ordens_servico', name: 'Ordens de Servico',
        attributes: [
            { key: 'osNumber', type: 'string', size: 50, required: true },
            { key: 'status', type: 'string', size: 50, required: true },
            { key: 'cliente', type: 'string', size: 255, required: false },
            { key: 'fones', type: 'string', size: 100, required: false },
            { key: 'marca', type: 'string', size: 100, required: false },
            { key: 'modelo', type: 'string', size: 100, required: false },
            { key: 'serie', type: 'string', size: 100, required: false },
            { key: 'acessorio', type: 'string', size: 500, required: false },
            { key: 'aparencia', type: 'string', size: 500, required: false },
            { key: 'defeito', type: 'string', size: 2000, required: false },
            { key: 'maodeobra', type: 'float', required: false },
            { key: 'pecas', type: 'float', required: false },
            { key: 'deslocamento', type: 'float', required: false },
            { key: 'terceiros', type: 'float', required: false },
            { key: 'outros', type: 'float', required: false },
            { key: 'total', type: 'float', required: false },
            { key: 'laudo', type: 'string', size: 5000, required: false },
            { key: 'relatorio', type: 'string', size: 5000, required: false },
            { key: 'dataIntake', type: 'string', size: 100, required: false },
            { key: 'dataDelivery', type: 'string', size: 100, required: false }
        ]
    },
    {
        id: 'transacoes', name: 'Transacoes Financeiras',
        attributes: [
            { key: 'data', type: 'string', size: 100, required: true },
            { key: 'valor', type: 'float', required: true },
            { key: 'tipo', type: 'string', size: 50, required: true }, // Entrada, Saida
            { key: 'forma', type: 'string', size: 100, required: false }, // Dinheiro, PIX, etc
            { key: 'descricao', type: 'string', size: 500, required: false },
            { key: 'vendedor', type: 'string', size: 255, required: false },
            { key: 'osNumber', type: 'string', size: 50, required: false }
        ]
    },
    {
        id: 'fechamentos', name: 'Fechamentos de Caixa',
        attributes: [
            { key: 'dataFechamento', type: 'string', size: 100, required: true },
            { key: 'fundoInicial', type: 'float', required: false },
            { key: 'responsavelAbertura', type: 'string', size: 255, required: false },
            { key: 'responsavelFechamento', type: 'string', size: 255, required: false },
            { key: 'saldoCalculado', type: 'float', required: false },
            { key: 'totalEntradas', type: 'float', required: false },
            { key: 'totalSaidas', type: 'float', required: false }
        ]
    },
    {
        id: 'pontos', name: 'Controle de Ponto',
        attributes: [
            { key: 'idColaborador', type: 'string', size: 255, required: true },
            { key: 'nomeColaborador', type: 'string', size: 255, required: true },
            { key: 'tipo', type: 'string', size: 50, required: true }, // entrada, intervalo, volta, saida
            { key: 'timestamp', type: 'string', size: 100, required: true }
        ]
    }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function createAttributeWithWait(collectionId, attr) {
    try {
        console.log(`Creating attribute ${attr.key} in ${collectionId}...`);
        if (attr.type === 'string') {
            await databases.createStringAttribute(DB_ID, collectionId, attr.key, attr.size, attr.required);
        } else if (attr.type === 'integer') {
            await databases.createIntegerAttribute(DB_ID, collectionId, attr.key, attr.required);
        } else if (attr.type === 'float') {
            await databases.createFloatAttribute(DB_ID, collectionId, attr.key, attr.required);
        } else if (attr.type === 'boolean') {
            await databases.createBooleanAttribute(DB_ID, collectionId, attr.key, attr.required);
        }
        
        // Wait for it to become available
        let available = false;
        while (!available) {
            await sleep(1000);
            const check = await databases.getAttribute(DB_ID, collectionId, attr.key);
            if (check.status === 'available') {
                available = true;
            }
        }
        console.log(`Attribute ${attr.key} available.`);
    } catch (e) {
        if (e.code === 409) {
            console.log(`Attribute ${attr.key} already exists.`);
        } else {
            console.error(`Failed to create attribute ${attr.key}: ${e.message}`);
        }
    }
}

async function setup() {
    try {
        console.log('Creating database...');
        try {
            await databases.get(DB_ID);
            console.log('Database already exists.');
        } catch(e) {
            if (e.code === 404) {
                await databases.create(DB_ID, 'Avence Cell DB');
                console.log('Database created.');
            } else {
                throw e;
            }
        }

        for (const col of collectionsToCreate) {
            console.log(`Creating collection ${col.name}...`);
            try {
                // Read, write, update, delete for role:any (temporary for this setup to easily migrate without enforcing complex auth yet, though I warned the user about it, we'll lock it down later or rely on the frontend structure for now)
                await databases.createCollection(DB_ID, col.id, col.name, [
                    sdk.Permission.read(sdk.Role.any()),
                    sdk.Permission.create(sdk.Role.any()),
                    sdk.Permission.update(sdk.Role.any()),
                    sdk.Permission.delete(sdk.Role.any())
                ]);
            } catch(e) {
                if(e.code === 409) console.log('Collection already exists.');
                else throw e;
            }

            for (const attr of col.attributes) {
                await createAttributeWithWait(col.id, attr);
            }
        }
        console.log('Appwrite Setup Complete!');
    } catch (e) {
        console.error('Setup failed:', e);
    }
}

setup();
