    // --- MÓDULO DE ESTOQUE ---
    const modalProduto = document.getElementById('modal-produto');
    const btnNovoProduto = document.getElementById('btn-novo-produto');
    const btnSalvarProduto = document.getElementById('btn-salvar-produto');
    const btnRelatorioCompras = document.getElementById('btn-relatorio-compras');
    const tbodyEstoque = document.getElementById('estoque-tbody');
    const searchEstoque = document.getElementById('produto-search');

    const inputPId = document.getElementById('p_id');
    const inputPTipo = document.getElementById('p_tipo');
    const inputPEan = document.getElementById('p_ean');
    const inputPNome = document.getElementById('p_nome');
    const inputPCusto = document.getElementById('p_custo');
    const inputPVenda = document.getElementById('p_venda');
    const inputPQtd = document.getElementById('p_qtd');
    const divPGanho = document.getElementById('p_ganho_display');
    const formProduto = document.getElementById('form-produto');

    let estoque = [];
    
    document.addEventListener('appwriteReady', () => {
        if (window.globalData && window.globalData.estoque) {
            estoque = window.globalData.estoque;
            localStorage.setItem('avence_estoque', JSON.stringify(estoque));
            if (typeof renderEstoque === 'function') renderEstoque();
        }
    });
    
    let eanConfig = { linhas: 10, colunas: 3, tamanho: 'medio' };
    try {
        const storedConfig = localStorage.getItem('avence_ean_config');
        if (storedConfig) eanConfig = JSON.parse(storedConfig);
    } catch(e) {}
    
    const btnConfigEan = document.getElementById('btn-config-ean');
    if (btnConfigEan) {
        btnConfigEan.addEventListener('click', () => {
            document.getElementById('ean-linhas').value = eanConfig.linhas;
            document.getElementById('ean-colunas').value = eanConfig.colunas;
            document.getElementById('ean-tamanho').value = eanConfig.tamanho;
            
            // Preview com produto dummy
            window.currentEanProduct = { nome: 'Produto Exemplo', ean: '7891234567890', venda: 99.90 };
            updateEanPreview();
            
            const modal = document.getElementById('modal-editar-ean');
            if(modal) openModal(modal);
        });
    }
    
    function generateId() {
        return Date.now().toString() + Math.random().toString(36).substring(2, 9);
    }

    function formatMoney(value) {
        return parseFloat(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function renderEstoque(filtro = '') {
        if (!tbodyEstoque) return;
        tbodyEstoque.innerHTML = '';
        
        let filtrados = estoque;
        if (filtro) {
            const termo = filtro.toLowerCase();
            filtrados = estoque.filter(p => {
                if (!p) return false;
                return (p.nome && p.nome.toLowerCase().includes(termo)) || 
                       (p.ean && p.ean.includes(termo));
            });
        }

        filtrados.forEach(produto => {
            if (!produto) return;
            const nomeProd = produto.nome || 'Produto sem nome';
            const custoProd = parseFloat(produto.custo) || 0;
            const vendaProd = parseFloat(produto.venda) || 0;
            const qtdProd = produto.qtd || 0;
            const ganho = vendaProd - custoProd;
            const tr = document.createElement('tr');
            
            // Alerta vermelho se qtd <= 2 e não for serviço
            if (qtdProd <= 2 && produto.tipo !== 'servico') {
                tr.classList.add('estoque-alerta');
            }
            
            const badgeTipo = produto.tipo === 'servico' ? '<span style="font-size:10px; background:var(--primary); color:#fff; padding:2px 4px; border-radius:4px; margin-left:8px;">Serviço</span>' : '';

            tr.innerHTML = `
                <td>${produto.ean || '-'}</td>
                <td style="font-weight: 500;">${nomeProd} ${badgeTipo}</td>
                <td style="text-align: right;">${formatMoney(custoProd)}</td>
                <td style="text-align: right;">${formatMoney(vendaProd)}</td>
                <td style="text-align: right;" class="${ganho > 0 ? 'lucro-verde' : ''}">${formatMoney(ganho)}</td>
                <td style="text-align: center;" class="qtd-col">${produto.tipo === 'servico' ? '-' : qtdProd}</td>
                <td style="text-align: center; white-space: nowrap;">
                    <button class="btn btn-secondary btn-imprimir-prod" data-id="${produto.id}" title="Imprimir Etiqueta" style="padding: 6px; font-size: 16px; display: inline-flex; margin-right: 4px;"><i class="ph ph-barcode"></i></button>
                    <button class="btn btn-secondary btn-editar-prod" data-id="${produto.id}" title="Editar" style="padding: 6px; font-size: 16px; display: inline-flex; margin-right: 4px;"><i class="ph ph-pencil-simple"></i></button>
                    <button class="btn btn-danger btn-excluir-prod" data-id="${produto.id}" title="Excluir" style="padding: 6px; font-size: 16px; display: inline-flex;"><i class="ph ph-trash"></i></button>
                </td>
            `;
            tbodyEstoque.appendChild(tr);
        });

        // Event listeners para botões da tabela
        document.querySelectorAll('.btn-editar-prod').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const produto = estoque.find(p => p.id == id);
                if (produto) {
                    inputPId.value = produto.id;
                    if(inputPTipo) {
                        inputPTipo.value = produto.tipo || 'produto';
                        inputPTipo.dispatchEvent(new Event('change'));
                    }
                    inputPEan.value = produto.ean || '';
                    inputPNome.value = produto.nome;
                    inputPCusto.value = produto.custo;
                    inputPVenda.value = produto.venda;
                    if (produto.tipo !== 'servico') {
                        inputPQtd.value = produto.qtd;
                    }
                    calcGanho();
                    document.getElementById('modal-produto-titulo').innerHTML = '<i class="ph ph-pencil-simple"></i> Editar Produto';
                    openModal(modalProduto);
                }
            });
        });

        document.querySelectorAll('.btn-excluir-prod').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const produto = estoque.find(p => p.id == id);
                if (produto) {
                    window.customAlert(`Deseja realmente excluir o produto <strong>${produto.nome}</strong>?`, 'warning', true, async () => {
                        window.showLoading('Excluindo da nuvem...');
                        try {
                            await window.appwrite.databases.deleteDocument(window.appwrite.DB_ID, window.appwrite.COL_ESTOQUE, id);
                            estoque = estoque.filter(p => p.id != id);
                            localStorage.setItem('avence_estoque', JSON.stringify(estoque));
                            renderEstoque(searchEstoque.value);
                            window.hideLoading();
                        } catch (err) {
                            window.hideLoading();
                            window.customAlert('Erro ao excluir na nuvem: ' + err.message, 'warning');
                        }
                    });
                }
            });
        });

        document.querySelectorAll('.btn-imprimir-prod').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const produto = estoque.find(p => p.id == id);
                if (produto && produto.ean) {
                    window.currentEanProduct = produto;
                    
                    document.getElementById('ean-linhas').value = eanConfig.linhas;
                    document.getElementById('ean-colunas').value = eanConfig.colunas;
                    document.getElementById('ean-tamanho').value = eanConfig.tamanho;
                    
                    updateEanPreview();
                    
                    document.body.classList.add('printing-ean');
                    window.print();
                    setTimeout(() => { document.body.classList.remove('printing-ean'); }, 1000);
                } else {
                    window.customAlert('Este produto não possui código de barras cadastrado.', 'warning');
                }
            });
        });
    }

    // Lógica para EAN
    const btnGerarEan = document.getElementById('btn-gerar-ean');
    if (btnGerarEan) {
        btnGerarEan.addEventListener('click', () => {
            // Gera padrão EAN-13 brasileiro (começa com 789)
            let base = '789' + Math.floor(100000000 + Math.random() * 900000000).toString();
            // Calcula o dígito verificador
            let sum = 0;
            for (let i = 0; i < 12; i++) {
                sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
            }
            const check = (10 - (sum % 10)) % 10;
            inputPEan.value = base + check;
        });
    }

    if (inputPEan) {
        inputPEan.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
        
        inputPEan.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                inputPNome.focus();
            }
        });
    }

    if (btnNovoProduto) {
        btnNovoProduto.addEventListener('click', () => {
            formProduto.reset();
            inputPId.value = '';
            if(inputPTipo) {
                inputPTipo.value = 'produto';
                inputPTipo.dispatchEvent(new Event('change'));
            }
            calcGanho();
            document.getElementById('modal-produto-titulo').innerHTML = '<i class="ph ph-package"></i> Novo Produto';
            openModal(modalProduto);
            setTimeout(() => inputPEan.focus(), 300); // Focar no EAN para o leitor
        });
    }
    
    if (btnRelatorioCompras) {
        btnRelatorioCompras.addEventListener('click', () => {
            const modal = document.getElementById('modal-relatorio-compras');
            if (!modal) return;
            
            const tbodyGiro = document.getElementById('tbody-alto-giro');
            const tbodyParado = document.getElementById('tbody-estoque-parado');
            tbodyGiro.innerHTML = '';
            tbodyParado.innerHTML = '';
            
            let historicoItens = JSON.parse(localStorage.getItem('avence_historico_vendas_itens')) || [];
            const agora = Date.now();
            const umDia = 24 * 60 * 60 * 1000;
            
            // Agrupar histórico por ID de produto
            const vendasPorId = {};
            historicoItens.forEach(v => {
                if (!vendasPorId[v.id]) vendasPorId[v.id] = { qtdVendida: 0, ultimaVenda: 0 };
                vendasPorId[v.id].qtdVendida += v.qtd;
                const dataVenda = new Date(v.data).getTime();
                if (dataVenda > vendasPorId[v.id].ultimaVenda) {
                    vendasPorId[v.id].ultimaVenda = dataVenda;
                }
            });
            
            estoque.forEach(p => {
                if (p.tipo === 'servico') return;
                
                const dataCadastro = parseInt(p.id) > 1000000000000 ? parseInt(p.id) : agora;
                let diasNoEstoque = Math.floor((agora - dataCadastro) / umDia);
                if (diasNoEstoque < 0) diasNoEstoque = 0;

                const vendas = vendasPorId[p.id] || { qtdVendida: 0, ultimaVenda: 0 };
                const qtdInicial = p.qtd_inicial || (p.qtd + vendas.qtdVendida);
                const pctVendido = qtdInicial > 0 ? (vendas.qtdVendida / qtdInicial) * 100 : 0;
                
                // Alto Giro: vendeu >= 60% e teve alguma venda recente (ou > 10 itens vendidos)
                if (pctVendido >= 60 || vendas.qtdVendida >= 10) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${p.ean || '-'}</td>
                        <td>${p.nome}</td>
                        <td style="text-align: center;">${qtdInicial}</td>
                        <td style="text-align: center;">${p.qtd}</td>
                        <td style="text-align: center;">${vendas.qtdVendida}</td>
                        <td style="text-align: center; color: #22c55e; font-weight: bold;">${pctVendido.toFixed(1)}%</td>
                    `;
                    tbodyGiro.appendChild(tr);
                }
                
                // Estoque Parado: > 90 dias (ou > 3 meses) e vendeu < 20%
                if (diasNoEstoque >= 90 && pctVendido < 20) {
                    const dataUltimaVendaStr = vendas.ultimaVenda > 0 ? new Date(vendas.ultimaVenda).toLocaleDateString('pt-BR') : 'Nunca';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${p.ean || '-'}</td>
                        <td>${p.nome}</td>
                        <td style="text-align: center;">${qtdInicial}</td>
                        <td style="text-align: center;">${p.qtd}</td>
                        <td style="text-align: center;">${diasNoEstoque} dias</td>
                        <td style="text-align: center;">${dataUltimaVendaStr}</td>
                    `;
                    tbodyParado.appendChild(tr);
                }
            });
            
            if (tbodyGiro.children.length === 0) tbodyGiro.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum produto de alto giro encontrado.</td></tr>';
            if (tbodyParado.children.length === 0) tbodyParado.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum produto parado encontrado.</td></tr>';
            
            openModal(modal);
        });
    }
    
    if (inputPTipo) {
        inputPTipo.addEventListener('change', (e) => {
            if (e.target.value === 'servico') {
                inputPQtd.type = 'text';
                inputPQtd.value = '∞';
                inputPQtd.disabled = true;
            } else {
                inputPQtd.type = 'number';
                inputPQtd.value = inputPQtd.value === '∞' ? '1' : (inputPQtd.value || '1');
                inputPQtd.disabled = false;
            }
        });
    }

    function calcGanho() {
        const custoStr = inputPCusto.value;
        const vendaStr = inputPVenda.value;

        if (custoStr === '' || vendaStr === '') {
            divPGanho.textContent = 'R$ 0,00';
            divPGanho.style.color = 'var(--text-muted)';
            return;
        }

        const custo = parseFloat(custoStr) || 0;
        const venda = parseFloat(vendaStr) || 0;
        const ganho = venda - custo;
        
        divPGanho.textContent = formatMoney(ganho);
        if (ganho < 0) {
            divPGanho.style.color = '#ef4444';
        } else {
            divPGanho.style.color = '#22c55e';
        }
    }

    if (inputPCusto) inputPCusto.addEventListener('input', calcGanho);
    if (inputPVenda) inputPVenda.addEventListener('input', calcGanho);

    if (btnSalvarProduto) {
        btnSalvarProduto.addEventListener('click', async (e) => {
            e.preventDefault();
            const nome = inputPNome.value.trim();
            const custo = inputPCusto.value;
            const venda = inputPVenda.value;
            const qtd = inputPQtd.value;

            if (!nome || !custo || !venda || (inputPTipo && inputPTipo.value !== 'servico' && !qtd)) {
                window.customAlert('Preencha os campos obrigatórios (Nome, Custo, Venda e Quantidade).', 'warning');
                return;
            }

            const id = inputPId.value;
            
            const novoProduto = {
                tipo: inputPTipo ? inputPTipo.value : 'produto',
                ean: inputPEan.value.trim(),
                nome: nome,
                custo: parseFloat(custo),
                venda: parseFloat(venda),
                qtd: (inputPTipo && inputPTipo.value === 'servico') ? 999999 : parseInt(qtd)
            };

            const btnText = btnSalvarProduto.innerHTML;
            btnSalvarProduto.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
            btnSalvarProduto.disabled = true;

            try {
                if (id) { // Edição
                    const index = estoque.findIndex(p => p.id == id);
                    if(index >= 0) {
                        novoProduto.qtd_inicial = estoque[index].qtd_inicial || estoque[index].qtd;
                    }
                    await window.appwrite.databases.updateDocument(window.appwrite.DB_ID, window.appwrite.COL_ESTOQUE, id, novoProduto);
                    novoProduto.id = id;
                    if(index >= 0) estoque[index] = novoProduto;
                } else { // Novo
                    novoProduto.qtd_inicial = novoProduto.qtd;
                    const docId = window.appwrite.ID.unique();
                    const created = await window.appwrite.databases.createDocument(window.appwrite.DB_ID, window.appwrite.COL_ESTOQUE, docId, novoProduto);
                    novoProduto.id = created.$id;
                    estoque.push(novoProduto);
                }

                // Sincronia Local (Offline Fallback)
                localStorage.setItem('avence_estoque', JSON.stringify(estoque));
                renderEstoque(searchEstoque.value);
                closeModal(modalProduto);
                window.customAlert('Produto salvo com sucesso!', 'success');
            } catch (err) {
                console.error(err);
                window.customAlert('Erro ao salvar na nuvem: ' + err.message, 'warning');
            } finally {
                btnSalvarProduto.innerHTML = btnText;
                btnSalvarProduto.disabled = false;
            }
        });
    }

    // Removed old EAN listener from here as it was merged above

    if (searchEstoque) {
        searchEstoque.addEventListener('input', (e) => {
            renderEstoque(e.target.value);
        });
        
        // EAN scanner on search input
        searchEstoque.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                renderEstoque(e.target.value);
            }
        });
    }

    if (btnRelatorioCompras) {
        btnRelatorioCompras.addEventListener('click', () => {
            const faltando = estoque.filter(p => p.qtd <= 2);
            if (faltando.length === 0) {
                window.customAlert('Não há produtos precisando de reposição no momento.', 'success');
            } else {
                let msg = '<strong>Produtos para comprar:</strong><br><br>';
                faltando.forEach(p => {
                    msg += `- ${p.nome} (EAN: ${p.ean || 'N/A'}) - Restam: ${p.qtd}<br>`;
                });
                msg += '<br><br><em>(No futuro, esta lista será enviada para o seu e-mail)</em>';
                
                const modal = document.getElementById('modal-alerta');
                document.getElementById('alerta-mensagem').innerHTML = msg;
                document.getElementById('alerta-icon').className = 'ph ph-shopping-cart';
                document.getElementById('alerta-icon').style.color = '#3b82f6';
                document.getElementById('alerta-titulo').textContent = 'Relatório de Compras';
                modal.classList.add('active');
                
                document.getElementById('btn-fechar-alerta').onclick = () => {
                    modal.classList.remove('active');
                    // Reset to default alert styles for next alerts
                    document.getElementById('alerta-mensagem').textContent = '';
                };
            }
        });
    }

    // Initial render
    renderEstoque();
    // Lógica para abas (OS Intake)
    const osTabs = document.querySelectorAll('.os-tab');
    const osTabContents = document.querySelectorAll('.os-tab-content');

    if (osTabs.length > 0) {
        const lastOsTab = localStorage.getItem('avence_last_os_tab');

        osTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active classes
                osTabs.forEach(t => {
                    t.classList.remove('active');
                    t.style.border = '1px solid transparent';
                    t.style.borderBottom = 'none';
                    t.style.background = 'transparent';
                    t.style.color = 'var(--text-muted)';
                });
                osTabContents.forEach(c => {
                    c.classList.remove('active');
                    c.style.display = 'none';
                });

                // Add active to clicked tab
                tab.classList.add('active');
                tab.style.border = '1px solid var(--border)';
                tab.style.borderBottom = 'none';
                tab.style.background = 'var(--bg-surface)';
                tab.style.color = '#ef4444';

                // Show target content
                const target = document.getElementById(tab.getAttribute('data-target'));
                if (target) {
                    target.classList.add('active');
                    if (target.id === 'tab-aparelho') {
                        target.style.display = 'grid';
                    } else {
                        target.style.display = 'flex';
                    }
                }
            });
        });
    }

    // EAN Editor Logic
    // EAN Editor Logic
    document.getElementById('ean-tamanho')?.addEventListener('change', (e) => {
        if(e.target.value === 'pimaco-6180') {
            document.getElementById('ean-colunas').value = 5;
            document.getElementById('ean-linhas').value = 13;
        }
        window.updateEanPreview();
    });

    window.updateEanPreview = function() {
        const produto = window.currentEanProduct;
        if(!produto) return;
        const linhas = parseInt(document.getElementById('ean-linhas').value) || 10;
        const colunas = parseInt(document.getElementById('ean-colunas').value) || 3;
        const qtd = linhas * colunas;
        const tamanho = document.getElementById('ean-tamanho').value;
        
        const previewContainer = document.getElementById('ean-preview-container');
        const printBarcode = document.getElementById('print-barcode');
        
        previewContainer.innerHTML = '';
        previewContainer.className = (tamanho === 'pimaco-6180') ? 'pimaco-6180' : '';
        previewContainer.style.gridTemplateColumns = (tamanho === 'pimaco-6180') ? '' : `repeat(${colunas}, 1fr)`;
        
        printBarcode.innerHTML = '';
        printBarcode.className = (tamanho === 'pimaco-6180') ? 'pimaco-6180' : '';
        printBarcode.style.gridTemplateColumns = (tamanho === 'pimaco-6180') ? '' : `repeat(${colunas}, 1fr)`;
        
        const storeConfig = JSON.parse(localStorage.getItem('avence_config')) || { nome: 'Sua Loja' };
        
        let bcWidth = 2;
        let bcHeight = 50;
        let fontSize = 12;
        
        if(tamanho === 'pequeno') { bcWidth = 1; bcHeight = 30; fontSize = 10; }
        if(tamanho === 'grande') { bcWidth = 2; bcHeight = 70; fontSize = 16; }
        if(tamanho === 'pimaco-6180') { bcWidth = 1; bcHeight = 25; fontSize = 8; }
        
        for (let i = 0; i < qtd; i++) {
            const container = document.createElement('div');
            container.className = 'barcode-container';
            container.innerHTML = `<div class="store-name" style="font-size:${fontSize}px">${storeConfig.nome}</div>
                <div class="product-name" style="font-size:${fontSize-2}px">${produto.nome}</div>
                <svg class="barcode-svg-${i}"></svg>
                <div class="product-price" style="font-size:${fontSize+2}px">${formatMoney(produto.venda)}</div>`;
            
            previewContainer.appendChild(container.cloneNode(true));
            printBarcode.appendChild(container);
        }
        
        try {
            JsBarcode("[class^='barcode-svg-']", produto.ean, {
                format: "EAN13",
                lineColor: "#000",
                width: bcWidth,
                height: bcHeight,
                displayValue: true,
                fontSize: fontSize
            });
        } catch(err) {
            JsBarcode("[class^='barcode-svg-']", produto.ean, {
                format: "CODE128",
                lineColor: "#000",
                width: bcWidth,
                height: bcHeight,
                displayValue: true,
                fontSize: fontSize
            });
        }
    };
    
    document.getElementById('ean-linhas')?.addEventListener('input', window.updateEanPreview);
    document.getElementById('ean-colunas')?.addEventListener('change', window.updateEanPreview);
    document.getElementById('ean-tamanho')?.addEventListener('change', window.updateEanPreview);
    
    document.getElementById('btn-salvar-config-ean')?.addEventListener('click', () => {
        eanConfig = {
            linhas: parseInt(document.getElementById('ean-linhas').value) || 10,
            colunas: parseInt(document.getElementById('ean-colunas').value) || 3,
            tamanho: document.getElementById('ean-tamanho').value || 'medio'
        };
        localStorage.setItem('avence_ean_config', JSON.stringify(eanConfig));
        
        const modal = document.getElementById('modal-editar-ean');
        if(modal) closeModal(modal);
        
        window.customAlert('Configuração de impressão salva!', 'success');
    });
