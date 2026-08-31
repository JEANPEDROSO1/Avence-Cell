const sdk = require('node-appwrite');

const client = new sdk.Client()
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')
    .setProject('6a959bb30013a97d1f1b')
    .setKey('standard_b185b8a80f7c53e0ec792b069f483d218db37cdbd155e799d8e247cfc2d2709bc9a691a5610ce7f694ab581f842fccdb554f23e46e99547a334d794f400a5573c05b4de0c530fa8fe9a9f92bd109a1d96680a6f58f4cb486c49a6b87f9bf0c042cf5ffabfbeff51ecb2d9b9f6ef209bfb4aa9c98a40fc8da2c201e7dffdcac4c');

const databases = new sdk.Databases(client);

async function check() {
    try {
        const estoque = await databases.listDocuments('avence_db', 'estoque');
        const clientes = await databases.listDocuments('avence_db', 'clientes');
        
        console.log(`Backend Status: `);
        console.log(`- Produtos no Estoque da Nuvem: ${estoque.total}`);
        console.log(`- Clientes na Nuvem: ${clientes.total}`);
    } catch(e) {
        console.log('Error', e);
    }
}
check();
