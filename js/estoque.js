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
    try {
        estoque = JSON.parse(localStorage.getItem('avence_estoque') || '[]');
    } catch(e) {
        estoque = [];
    }
    
    document.addEventListener('appwriteReady', () => {
        if (window.globalData && window.globalData.estoque) {
            estoque = window.globalData.estoque;
            localStorage.setItem('avence_estoque', JSON.stringify(estoque));
            if (typeof renderEstoque === 'function') renderEstoque();
        }
    });
    
    let eanConfig = { linhas: 13, colunas: 5, tamanho: 'pimaco-6180' };
    try {
        const storedConfig = localStorage.getItem('avence_ean_config');
        if (storedConfig) {
            // Força o padrão Pimaco 6180 para todos
            eanConfig = { linhas: 13, colunas: 5, tamanho: 'pimaco-6180' };
            localStorage.setItem('avence_ean_config', JSON.stringify(eanConfig));
        }
    } catch(e) {}
    
    const btnConfigEan = document.getElementById('btn-config-ean');
    if (btnConfigEan) {
        btnConfigEan.addEventListener('click', () => {
            // Se a folha estiver vazia, seleciona um produto teste automaticamente
            if (!window.etiquetasFolha || window.etiquetasFolha.length === 0) {
                if (!estoque || estoque.length === 0) {
                    try { estoque = JSON.parse(localStorage.getItem('avence_estoque') || '[]'); } catch(e) { estoque = []; }
                }
                const primeiroProd = estoque.find(p => p && p.tipo !== 'servico');
                const produtoTeste = primeiroProd || {
                    id: 'teste_demo',
                    nome: 'Película 3D Premium (Produto Teste)',
                    ean: '7891234567890',
                    venda: 25.00,
                    qtd: 65,
                    qtdEstoque: 15
                };
                window.etiquetasFolha = [{
                    id: produtoTeste.id,
                    nome: produtoTeste.nome,
                    ean: String(produtoTeste.ean || '7891234567890'),
                    venda: parseFloat(produtoTeste.venda) || 0,
                    qtdEstoque: parseInt(produtoTeste.qtd) || 0,
                    qtd: 65 // Pega as 65 etiquetas para teste
                }];
            }
            if (typeof renderEstudioCards === 'function') renderEstudioCards();
            if (window.renderBuscaProdutos) window.renderBuscaProdutos();
            if (window.renderEsquemaBlocos) window.renderEsquemaBlocos();
            if (window.renderPreviewIndividual) window.renderPreviewIndividual();
            if (window.updateEanPreview) window.updateEanPreview();
            const modal = document.getElementById('modal-editar-ean');
            if(modal) {
                if (window.openModal) window.openModal(modal);
                else modal.classList.add('active');
            }
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
                e.preventDefault();
                e.stopPropagation();
                const id = e.currentTarget.getAttribute('data-id');
                const produto = estoque.find(p => p.id == id);
                if (!produto) return;

                // Se o produto não tiver EAN, gera um automaticamente
                if (!produto.ean) {
                    let base = '789' + Math.floor(100000000 + Math.random() * 900000000).toString();
                    let sum = 0;
                    for (let i = 0; i < 12; i++) sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
                    const check = (10 - (sum % 10)) % 10;
                    produto.ean = base + check;

                    localStorage.setItem('avence_estoque', JSON.stringify(estoque));
                    renderEstoque(searchEstoque ? searchEstoque.value : '');

                    if (window.appwrite && window.appwrite.databases) {
                        window.appwrite.databases.updateDocument(window.appwrite.DB_ID, window.appwrite.COL_ESTOQUE, id, { ean: produto.ean }).catch(console.error);
                    }
                }

                // Preenche as 65 etiquetas da folha com esse produto selecionado
                window.etiquetasFolha = [{
                    id: produto.id,
                    nome: produto.nome,
                    ean: String(produto.ean || '7890000000000'),
                    venda: parseFloat(produto.venda) || 0,
                    qtdEstoque: parseInt(produto.qtd) || 0,
                    qtd: 65 // Pega as 65 etiquetas daquele produto
                }];

                if (typeof renderEstudioCards === 'function') renderEstudioCards();
                if (window.renderBuscaProdutos) window.renderBuscaProdutos();
                if (window.renderEsquemaBlocos) window.renderEsquemaBlocos();
                if (window.renderPreviewIndividual) window.renderPreviewIndividual();
                if (window.updateEanPreview) window.updateEanPreview();

                // Abre diretamente na Aba 1 (Produtos da Folha) para ele poder alterar / diminuir a quantidade
                document.getElementById('tab-btn-produtos')?.click();

                // Abre o modal do estúdio
                const modal = document.getElementById('modal-editar-ean');
                if (modal) {
                    if (window.openModal) window.openModal(modal);
                    else modal.classList.add('active');
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

    // =========================================================================
    // ESTÚDIO AVANÇADO DE ETIQUETAS A4 (65 POR FOLHA - PIMACO 6180)
    // =========================================================================

    // Fila de produtos para a folha A4: [{ id, nome, ean, venda, qtdEstoque, qtd }]
    window.etiquetasFolha = [];

    // Esquema de Layout Visual (Ordem, Grid Box e Ajustes Finos em Pixels)
    const defaultEsquema = [
        {
            id: 'loja',
            nome: 'Nome da Loja',
            ativo: false,
            posicao: '100',
            larguraBox: 100, // 100, 75, 66, 50, 33, 25 (%)
            align: 'center', // 'left', 'center', 'right'
            fontFamily: 'Arial, sans-serif',
            fontSize: 6.5,
            fontWeight: '700',
            italic: false,
            uppercase: true,
            offsetX: 0, // Deslocamento em pixels (esquerda/direita)
            offsetY: 0, // Deslocamento em pixels (cima/baixo)
            textoPersonalizado: 'AVENCE CELL'
        },
        {
            id: 'nome',
            nome: 'Nome do Produto',
            ativo: true,
            posicao: '100',
            larguraBox: 100,
            align: 'center',
            fontFamily: 'Arial, sans-serif',
            fontSize: 7.5,
            fontWeight: '700',
            italic: false,
            uppercase: false,
            offsetX: 0,
            offsetY: 0
        },
        {
            id: 'barcode',
            nome: 'Código de Barras',
            ativo: true,
            posicao: '100',
            larguraBox: 100,
            align: 'center',
            altura: 22,
            mostrarNumero: true,
            offsetX: 0,
            offsetY: 0
        },
        {
            id: 'preco',
            nome: 'Preço de Venda',
            ativo: true,
            posicao: '50',
            larguraBox: 50,
            align: 'left',
            fontFamily: 'Arial, sans-serif',
            fontSize: 8.5,
            fontWeight: '700',
            italic: false,
            uppercase: false,
            offsetX: 0,
            offsetY: 0
        },
        {
            id: 'estoque',
            nome: 'Estoque / Quantidade',
            ativo: true,
            posicao: '50',
            larguraBox: 50,
            align: 'right',
            fontFamily: 'Arial, sans-serif',
            fontSize: 6.5,
            fontWeight: '500',
            italic: false,
            uppercase: false,
            textoTipo: 'qtd',
            offsetX: 0,
            offsetY: 0
        },
        {
            id: 'extra',
            nome: 'Texto Extra / Rodapé',
            ativo: false,
            posicao: '100',
            larguraBox: 100,
            align: 'center',
            fontFamily: 'Arial, sans-serif',
            fontSize: 6.0,
            fontWeight: '500',
            italic: false,
            uppercase: false,
            offsetX: 0,
            offsetY: 0,
            textoPersonalizado: 'Garantia 90 dias'
        }
    ];

    function carregarEsquemaSalvo() {
        try {
            const salvo = JSON.parse(localStorage.getItem('avence_etiqueta_esquema') || 'null');
            if (salvo && Array.isArray(salvo) && salvo.length > 0) {
                return salvo.map(item => {
                    const def = defaultEsquema.find(d => d.id === item.id) || {};
                    return {
                        ...def,
                        ...item,
                        larguraBox: item.larguraBox !== undefined ? parseInt(item.larguraBox) : (item.posicao === '50' ? 50 : 100),
                        fontFamily: item.fontFamily || def.fontFamily || 'Arial, sans-serif',
                        fontSize: item.fontSize !== undefined ? parseFloat(item.fontSize) : (def.fontSize || 7.5),
                        fontWeight: item.fontWeight || (item.bold ? '700' : (def.fontWeight || '500')),
                        italic: item.italic !== undefined ? Boolean(item.italic) : false,
                        uppercase: item.uppercase !== undefined ? Boolean(item.uppercase) : false,
                        offsetX: item.offsetX !== undefined ? parseFloat(item.offsetX) : 0,
                        offsetY: item.offsetY !== undefined ? parseFloat(item.offsetY) : 0
                    };
                });
            }
        } catch(e) {}
        return JSON.parse(JSON.stringify(defaultEsquema));
    }

    window.etiquetaEsquema = carregarEsquemaSalvo();
    window.mostrarGridGuia = false;

    // Listener para o botão de Grade / Grid Box na prévia
    document.getElementById('chk-mostrar-grid-box')?.addEventListener('change', (e) => {
        window.mostrarGridGuia = e.target.checked;
        window.renderPreviewIndividual();
    });

    // Configurações padrão de régua milimétrica
    const reguaSalva = JSON.parse(localStorage.getItem('avence_etiquetas_config') || '{}');
    window.etiquetasConfig = {
        margemSuperior: reguaSalva.margemSuperior !== undefined ? parseFloat(reguaSalva.margemSuperior) : 10.7,
        margemEsquerda: reguaSalva.margemEsquerda !== undefined ? parseFloat(reguaSalva.margemEsquerda) : 4.5,
        largura: reguaSalva.largura !== undefined ? parseFloat(reguaSalva.largura) : 38.2,
        altura: reguaSalva.altura !== undefined ? parseFloat(reguaSalva.altura) : 21.2,
        gapHorizontal: reguaSalva.gapHorizontal !== undefined ? parseFloat(reguaSalva.gapHorizontal) : 2.5,
        gapVertical: reguaSalva.gapVertical !== undefined ? parseFloat(reguaSalva.gapVertical) : 0.0,
        tipoCodigo: reguaSalva.tipoCodigo || 'EAN13',
        alturaCodigo: reguaSalva.alturaCodigo || 22,
        exibirGabarito: reguaSalva.exibirGabarito !== undefined ? reguaSalva.exibirGabarito : true
    };

    // Preenche os inputs da régua com as configurações carregadas
    function sincronizarInputsRegua() {
        const cfg = window.etiquetasConfig;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = Boolean(val); };

        setVal('regua-margem-superior', cfg.margemSuperior);
        setVal('regua-margem-esquerda', cfg.margemEsquerda);
        setVal('regua-largura', cfg.largura);
        setVal('regua-altura', cfg.altura);
        setVal('regua-gap-horizontal', cfg.gapHorizontal);
        setVal('regua-gap-vertical', cfg.gapVertical);
        setVal('layout-tipo-codigo', cfg.tipoCodigo);
        setVal('layout-altura-slider', cfg.alturaCodigo);
        
        const txtAlt = document.getElementById('layout-altura-val');
        if (txtAlt) txtAlt.textContent = cfg.alturaCodigo + 'px';

        setChk('layout-exibir-gabarito', cfg.exibirGabarito);

        aplicarVariaveisCssRegua();
    }

    // Atualiza as variáveis CSS no elemento de preview e na área de impressão
    function aplicarVariaveisCssRegua() {
        const cfg = window.etiquetasConfig;
        const targets = [
            document.getElementById('ean-preview-container'), 
            document.getElementById('print-barcode'),
            document.getElementById('esquema-preview-individual')
        ];
        targets.forEach(t => {
            if (!t) return;
            t.style.setProperty('--regua-topo', `${cfg.margemSuperior}mm`);
            t.style.setProperty('--regua-esq', `${cfg.margemEsquerda}mm`);
            t.style.setProperty('--regua-largura', `${cfg.largura}mm`);
            t.style.setProperty('--regua-altura', `${cfg.altura}mm`);
            t.style.setProperty('--regua-gap-h', `${cfg.gapHorizontal}mm`);
            t.style.setProperty('--regua-gap-v', `${cfg.gapVertical}mm`);
        });
    }

    // Alternância de Abas do Estúdio
    const eanTabs = [
        { btn: 'tab-btn-produtos', content: 'ean-tab-content-produtos' },
        { btn: 'tab-btn-regua', content: 'ean-tab-content-regua' },
        { btn: 'tab-btn-layout', content: 'ean-tab-content-layout' }
    ];

    eanTabs.forEach(({ btn, content }) => {
        document.getElementById(btn)?.addEventListener('click', () => {
            eanTabs.forEach(t => {
                document.getElementById(t.btn)?.classList.remove('active');
                const c = document.getElementById(t.content);
                if (c) c.style.display = 'none';
            });
            document.getElementById(btn)?.classList.add('active');
            const targetContent = document.getElementById(content);
            if (targetContent) targetContent.style.display = 'flex';
        });
    });

    // =========================================================================
    // GERADOR DE HTML DINÂMICO PARA CADA ETIQUETA (GRID BOX + OFFSET PX + TIPOGRAFIA)
    // =========================================================================
    window.esquemaElementoSelecionado = 'nome';

    // Move um elemento acima (-1) ou abaixo (+1) na ordem VISÍVEL / ATIVA do grid
    function moverElementoOrdem(id, direcao) {
        const esquema = window.etiquetaEsquema || [];
        const ativos = esquema.filter(b => b.ativo);
        const posAtivo = ativos.findIndex(b => b.id === id);
        if (posAtivo === -1) return;

        const novoPosAtivo = posAtivo + direcao;
        if (novoPosAtivo < 0 || novoPosAtivo >= ativos.length) return; // Limite atingido

        const vizinhoId = ativos[novoPosAtivo].id;

        const idxAlvo = esquema.findIndex(b => b.id === id);
        const idxVizinho = esquema.findIndex(b => b.id === vizinhoId);

        if (idxAlvo !== -1 && idxVizinho !== -1) {
            const temp = esquema[idxAlvo];
            esquema[idxAlvo] = esquema[idxVizinho];
            esquema[idxVizinho] = temp;
            salvarEAtualizarEsquema(true);
        }
    }

    function selecionarElementoEsquema(id) {
        window.esquemaElementoSelecionado = id;
        
        const preview = document.getElementById('esquema-preview-individual');
        if (preview) {
            preview.querySelectorAll('.grid-box-item').forEach(el => {
                if (el.getAttribute('data-id') === id) {
                    el.classList.add('selected');
                } else {
                    el.classList.remove('selected');
                }
            });
        }

        const container = document.getElementById('esquema-blocos-container');
        if (container) {
            container.querySelectorAll('.esquema-bloco-card').forEach(c => {
                if (c.getAttribute('data-id') === id) {
                    c.classList.add('card-em-foco');
                } else {
                    c.classList.remove('card-em-foco');
                }
            });
        }

        atualizarPainelQuickControle();
    }

    function atualizarPainelQuickControle() {
        initQuickControlPanel();
        const id = window.esquemaElementoSelecionado;
        const bloco = (window.etiquetaEsquema || []).find(b => b.id === id);
        if (!bloco) return;

        const nomeEl = document.getElementById('quick-ctrl-elem-nome');
        if (nomeEl) nomeEl.textContent = bloco.nome || id;

        const valX = document.getElementById('val-quick-x');
        const offX = Math.round(parseFloat(bloco.offsetX) || 0);
        if (valX) valX.textContent = `${offX > 0 ? '+' + offX : offX}px`;

        const valY = document.getElementById('val-quick-y');
        const offY = Math.round(parseFloat(bloco.offsetY) || 0);
        if (valY) valY.textContent = `${offY > 0 ? '+' + offY : offY}px`;

        const selAlign = document.getElementById('quick-align-select');
        if (selAlign) selAlign.value = bloco.align || 'center';

        // Desabilita subir/descer apenas se já estiver nos extremos dos elementos ATIVOS
        const ativos = (window.etiquetaEsquema || []).filter(b => b.ativo);
        const posAtivo = ativos.findIndex(b => b.id === id);
        const btnSubir = document.getElementById('btn-quick-subir');
        if (btnSubir) btnSubir.disabled = (posAtivo <= 0);
        const btnDescer = document.getElementById('btn-quick-descer');
        if (btnDescer) btnDescer.disabled = (posAtivo === -1 || posAtivo >= ativos.length - 1);

        // Pílulas do Grid Box
        const curLargura = bloco.larguraBox !== undefined ? bloco.larguraBox : (bloco.posicao === '50' ? 50 : 100);
        const pillsContainer = document.getElementById('quick-grid-pills');
        if (pillsContainer) {
            pillsContainer.innerHTML = [100, 75, 66, 50, 33, 25].map(pct => `
                <button type="button" class="grid-box-pill-btn ${curLargura == pct ? 'active' : ''}" data-pct="${pct}">${pct}%</button>
            `).join('');

            pillsContainer.querySelectorAll('.grid-box-pill-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const pct = parseInt(btn.getAttribute('data-pct'));
                    bloco.larguraBox = pct;
                    bloco.posicao = String(pct);
                    salvarEAtualizarEsquema(true);
                });
            });
        }
    }

    let quickPanelEventsBound = false;
    function initQuickControlPanel() {
        if (quickPanelEventsBound) return;
        quickPanelEventsBound = true;

        document.getElementById('btn-quick-subir')?.addEventListener('click', () => {
            moverElementoOrdem(window.esquemaElementoSelecionado, -1);
        });

        document.getElementById('btn-quick-descer')?.addEventListener('click', () => {
            moverElementoOrdem(window.esquemaElementoSelecionado, 1);
        });

        document.getElementById('btn-quick-x-minus')?.addEventListener('click', () => {
            const b = window.etiquetaEsquema.find(x => x.id === window.esquemaElementoSelecionado);
            if (b) { b.offsetX = (parseFloat(b.offsetX) || 0) - 1; salvarEAtualizarEsquema(true); }
        });
        document.getElementById('btn-quick-x-plus')?.addEventListener('click', () => {
            const b = window.etiquetaEsquema.find(x => x.id === window.esquemaElementoSelecionado);
            if (b) { b.offsetX = (parseFloat(b.offsetX) || 0) + 1; salvarEAtualizarEsquema(true); }
        });
        document.getElementById('btn-quick-y-minus')?.addEventListener('click', () => {
            const b = window.etiquetaEsquema.find(x => x.id === window.esquemaElementoSelecionado);
            if (b) { b.offsetY = (parseFloat(b.offsetY) || 0) - 1; salvarEAtualizarEsquema(true); }
        });
        document.getElementById('btn-quick-y-plus')?.addEventListener('click', () => {
            const b = window.etiquetaEsquema.find(x => x.id === window.esquemaElementoSelecionado);
            if (b) { b.offsetY = (parseFloat(b.offsetY) || 0) + 1; salvarEAtualizarEsquema(true); }
        });
        document.getElementById('btn-quick-reset-px')?.addEventListener('click', () => {
            const b = window.etiquetaEsquema.find(x => x.id === window.esquemaElementoSelecionado);
            if (b) { b.offsetX = 0; b.offsetY = 0; salvarEAtualizarEsquema(true); }
        });
        document.getElementById('quick-align-select')?.addEventListener('change', (e) => {
            const b = window.etiquetaEsquema.find(x => x.id === window.esquemaElementoSelecionado);
            if (b) { b.align = e.target.value; salvarEAtualizarEsquema(true); }
        });
    }

    function gerarHtmlEtiqueta(item, isPreviewIndividual = false) {
        if (!item) return '';

        const esquema = window.etiquetaEsquema || defaultEsquema;
        const blocosAtivos = esquema.filter(b => b.ativo);
        const mostrarGrid = Boolean(window.mostrarGridGuia && isPreviewIndividual);

        let innerHtml = '';
        blocosAtivos.forEach((bloco) => {
            const largura = bloco.larguraBox !== undefined ? bloco.larguraBox : (bloco.posicao === '50' ? 50 : 100);
            const flexBasis = `flex: 0 0 ${largura}%; max-width: ${largura}%; width: ${largura}%;`;
            const textAlign = bloco.align || 'center';
            const fSize = parseFloat(bloco.fontSize) || 7.5;
            const fFamily = bloco.fontFamily ? `font-family: ${bloco.fontFamily};` : '';
            const fWeight = bloco.fontWeight ? `font-weight: ${bloco.fontWeight};` : 'font-weight: 500;';
            const fStyle = bloco.italic ? 'font-style: italic;' : '';
            const fTransform = bloco.uppercase ? 'text-transform: uppercase;' : '';

            // Ajuste fino em pixels: 1:1 rigoroso em todas as telas e na impressão
            const curOffX = Math.round(parseFloat(bloco.offsetX) || 0);
            const curOffY = Math.round(parseFloat(bloco.offsetY) || 0);
            const posStyle = `position: relative; left: ${curOffX}px; top: ${curOffY}px;`;

            // Guia Visual de Grid Box (quando ativado na prévia)
            const gridGuiaStyle = mostrarGrid 
                ? `outline: 0.5px dashed rgba(56, 189, 248, 0.7); background: rgba(56, 189, 248, 0.08);` 
                : '';

            const isSelected = Boolean(isPreviewIndividual && bloco.id === window.esquemaElementoSelecionado);
            const itemClasses = `grid-box-item ${isSelected ? 'selected' : ''}`;

            const badgeHtml = (mostrarGrid || isSelected)
                ? `<span class="grid-item-badge" style="position: absolute; top: 0; right: 0; font-size: 7px; font-weight: 700; color: #0284c7; background: rgba(255,255,255,0.95); padding: 0 2px; border-radius: 2px; pointer-events: none; line-height: 1.1; z-index: 15;">${largura}%</span>` 
                : '';

            const resizeHandleHtml = isPreviewIndividual 
                ? `<div class="grid-resize-handle" data-id="${bloco.id}" title="Arraste para redimensionar no Grid (aumentar/diminuir)"></div>`
                : '';

            const wrapperStyle = `${flexBasis} ${posStyle} ${gridGuiaStyle} box-sizing: border-box;`;

            if (bloco.id === 'loja') {
                const texto = bloco.textoPersonalizado || 'AVENCE CELL';
                innerHtml += `<div class="${itemClasses}" data-id="${bloco.id}" style="${wrapperStyle} text-align: ${textAlign}; font-size: ${fSize}pt; ${fFamily} ${fWeight} ${fStyle} ${fTransform} line-height: 1.15; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #000;">${badgeHtml}${resizeHandleHtml}${texto}</div>`;
            } else if (bloco.id === 'nome') {
                innerHtml += `<div class="${itemClasses}" data-id="${bloco.id}" style="${wrapperStyle} text-align: ${textAlign}; font-size: ${fSize}pt; ${fFamily} ${fWeight} ${fStyle} ${fTransform} line-height: 1.15; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #000;" title="${item.nome}">${badgeHtml}${resizeHandleHtml}${item.nome}</div>`;
            } else if (bloco.id === 'barcode') {
                const alt = Math.round(window.etiquetasConfig.alturaCodigo || 22);
                const svgClass = isPreviewIndividual ? 'barcode-preview-svg' : 'barcode-item-svg';
                innerHtml += `
                    <div class="${itemClasses}" data-id="${bloco.id}" style="${wrapperStyle} display: flex; justify-content: ${textAlign === 'left' ? 'flex-start' : (textAlign === 'right' ? 'flex-end' : 'center')}; align-items: center; overflow: hidden; margin: 0.1mm 0;">
                        ${badgeHtml}${resizeHandleHtml}
                        <svg class="${svgClass}" data-ean="${item.ean}" data-altura="${alt}" data-mostrar-num="${bloco.mostrarNumero !== false}"></svg>
                    </div>
                `;
            } else if (bloco.id === 'preco') {
                innerHtml += `<div class="${itemClasses}" data-id="${bloco.id}" style="${wrapperStyle} text-align: ${textAlign}; font-size: ${fSize}pt; ${fFamily} ${fWeight} ${fStyle} ${fTransform} line-height: 1.15; overflow: hidden; white-space: nowrap; color: #000;">${badgeHtml}${resizeHandleHtml}${formatMoney(item.venda)}</div>`;
            } else if (bloco.id === 'estoque') {
                const texto = bloco.textoTipo === 'estoque' ? `Est.: ${item.qtdEstoque || 0}` : `Qtd: 1 un`;
                innerHtml += `<div class="${itemClasses}" data-id="${bloco.id}" style="${wrapperStyle} text-align: ${textAlign}; font-size: ${fSize}pt; ${fFamily} ${fWeight} ${fStyle} ${fTransform} line-height: 1.15; overflow: hidden; white-space: nowrap; color: #000;">${badgeHtml}${resizeHandleHtml}${texto}</div>`;
            } else if (bloco.id === 'extra') {
                const texto = bloco.textoPersonalizado || '';
                innerHtml += `<div class="${itemClasses}" data-id="${bloco.id}" style="${wrapperStyle} text-align: ${textAlign}; font-size: ${fSize}pt; ${fFamily} ${fWeight} ${fStyle} ${fTransform} line-height: 1.15; overflow: hidden; white-space: nowrap; color: #000;">${badgeHtml}${resizeHandleHtml}${texto}</div>`;
            }
        });

        return `<div class="etiqueta-layout-flow" style="display: flex; flex-wrap: wrap; width: 100%; height: 100%; align-content: space-between; justify-content: space-between; box-sizing: border-box; overflow: ${isPreviewIndividual ? 'visible' : 'hidden'}; position: relative; padding: 0; margin: 0;">${innerHtml}</div>`;
    }

    // Renderiza com JsBarcode os SVGs dentro de um elemento alvo de forma 100% uniforme
    function renderizarBarcodesEm(container) {
        if (!container) return;
        const svgs = container.querySelectorAll('svg.barcode-item-svg, svg.barcode-preview-svg');
        const formato = window.etiquetasConfig.tipoCodigo || 'EAN13';

        svgs.forEach(svg => {
            const ean = svg.getAttribute('data-ean') || '7890000000000';
            const alt = parseInt(svg.getAttribute('data-altura')) || 22;
            const mostrarNum = svg.getAttribute('data-mostrar-num') !== 'false';
            const isEan13 = formato === 'EAN13' && /^\d{12,13}$/.test(ean);

            const options = {
                format: isEan13 ? "EAN13" : (formato === 'CODE39' ? "CODE39" : "CODE128"),
                lineColor: "#000",
                width: 1.15,
                height: alt,
                displayValue: mostrarNum,
                fontSize: 8,
                fontOptions: "bold",
                font: "Arial",
                margin: 0,
                textMargin: 1
            };

            try {
                JsBarcode(svg, ean, options);
            } catch(e) {
                try {
                    options.format = "CODE128";
                    JsBarcode(svg, ean, options);
                } catch(err) {
                    console.warn('Erro JsBarcode:', err);
                }
            }
        });
    }

    // =========================================================================
    // CONTROLES INTERATIVOS DIRETOS NA PRÉVIA (ARRASTAR PX + REDIMENSIONAR NO GRID)
    // =========================================================================
    function initInteractivePreview(preview) {
        if (!preview) return;

        const gridStops = [25, 33, 50, 66, 75, 100];
        const SCALE = 1.85; // Fator de escala do scaler CSS

        // 1. Clique para selecionar e arrastar para mover em pixels (X / Y)
        preview.querySelectorAll('.grid-box-item').forEach(itemEl => {
            const id = itemEl.getAttribute('data-id');

            itemEl.addEventListener('click', (e) => {
                if (e.target.closest('.grid-resize-handle')) return;
                selecionarElementoEsquema(id);
            });

            itemEl.addEventListener('mousedown', (e) => {
                if (e.target.closest('.grid-resize-handle')) return;

                selecionarElementoEsquema(id);

                const bloco = window.etiquetaEsquema.find(b => b.id === id);
                if (!bloco) return;

                e.preventDefault();

                const startX = e.clientX;
                const startY = e.clientY;
                const initOffX = parseFloat(bloco.offsetX) || 0;
                const initOffY = parseFloat(bloco.offsetY) || 0;
                let moved = false;

                itemEl.classList.add('is-dragging');

                function onDragMove(ev) {
                    const dx = (ev.clientX - startX) / SCALE;
                    const dy = (ev.clientY - startY) / SCALE;
                    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) moved = true;

                    const newX = Math.round(initOffX + dx);
                    const newY = Math.round(initOffY + dy);
                    bloco.offsetX = newX;
                    bloco.offsetY = newY;

                    itemEl.style.left = newX + 'px';
                    itemEl.style.top = newY + 'px';

                    const valX = document.getElementById('val-quick-x');
                    if (valX) valX.textContent = `${newX > 0 ? '+' + newX : newX}px`;
                    const valY = document.getElementById('val-quick-y');
                    if (valY) valY.textContent = `${newY > 0 ? '+' + newY : newY}px`;
                }

                function onDragEnd() {
                    window.removeEventListener('mousemove', onDragMove);
                    window.removeEventListener('mouseup', onDragEnd);
                    itemEl.classList.remove('is-dragging');

                    if (moved) {
                        salvarEAtualizarEsquema(false);
                    }
                }

                window.addEventListener('mousemove', onDragMove);
                window.addEventListener('mouseup', onDragEnd);
            });
        });

        // 2. Alça Lateral Direita para Redimensionar Largura no Grid (Aumentar / Diminuir)
        preview.querySelectorAll('.grid-resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const id = handle.getAttribute('data-id');
                selecionarElementoEsquema(id);

                const bloco = window.etiquetaEsquema.find(b => b.id === id);
                const itemEl = handle.closest('.grid-box-item');
                if (!bloco || !itemEl) return;

                handle.classList.add('is-resizing');

                const flowContainer = preview.querySelector('.etiqueta-layout-flow') || preview;
                const flowWidth = flowContainer.clientWidth;
                const startX = e.clientX;
                const startWidthPx = itemEl.getBoundingClientRect().width / SCALE;

                function onResizeMove(ev) {
                    const dx = (ev.clientX - startX) / SCALE;
                    const newWidthPx = Math.max(20, Math.min(flowWidth, startWidthPx + dx));
                    const rawPct = (newWidthPx / flowWidth) * 100;

                    let chosen = Math.round(rawPct);
                    for (const stop of gridStops) {
                        if (Math.abs(rawPct - stop) <= 4.5) {
                            chosen = stop;
                            break;
                        }
                    }

                    bloco.larguraBox = chosen;
                    bloco.posicao = String(chosen);

                    itemEl.style.flex = `0 0 ${chosen}%`;
                    itemEl.style.maxWidth = `${chosen}%`;
                    itemEl.style.width = `${chosen}%`;

                    const badge = itemEl.querySelector('.grid-item-badge');
                    if (badge) badge.textContent = `${chosen}%`;
                }

                function onResizeEnd() {
                    window.removeEventListener('mousemove', onResizeMove);
                    window.removeEventListener('mouseup', onResizeEnd);
                    handle.classList.remove('is-resizing');
                    salvarEAtualizarEsquema(true);
                }

                window.addEventListener('mousemove', onResizeMove);
                window.addEventListener('mouseup', onResizeEnd);
            });
        });
    }

    // Teclas de Atalho de Teclado (Setas para mover 1px ou 5px com Shift)
    window.addEventListener('keydown', (e) => {
        const layoutTab = document.getElementById('ean-tab-content-layout');
        if (!layoutTab || layoutTab.style.display === 'none') return;
        if (!window.esquemaElementoSelecionado) return;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

        const bloco = window.etiquetaEsquema.find(b => b.id === window.esquemaElementoSelecionado);
        if (!bloco) return;

        const delta = e.shiftKey ? 5 : 1;
        let handled = false;

        if (e.key === 'ArrowLeft') {
            bloco.offsetX = (parseFloat(bloco.offsetX) || 0) - delta;
            handled = true;
        } else if (e.key === 'ArrowRight') {
            bloco.offsetX = (parseFloat(bloco.offsetX) || 0) + delta;
            handled = true;
        } else if (e.key === 'ArrowUp') {
            bloco.offsetY = (parseFloat(bloco.offsetY) || 0) - delta;
            handled = true;
        } else if (e.key === 'ArrowDown') {
            bloco.offsetY = (parseFloat(bloco.offsetY) || 0) + delta;
            handled = true;
        }

        if (handled) {
            e.preventDefault();
            salvarEAtualizarEsquema(false);
            window.renderPreviewIndividual();
        }
    });

    // =========================================================================
    // CONSTRUTOR INTERATIVO DE ESQUEMA / LAYOUT (GRID BOX + PX + TIPOGRAFIA)
    // =========================================================================
    window.renderEsquemaBlocos = function() {
        const container = document.getElementById('esquema-blocos-container');
        if (!container) return;

        container.innerHTML = '';
        const esquema = window.etiquetaEsquema;

        esquema.forEach((bloco, idx) => {
            const card = document.createElement('div');
            const isFoco = bloco.id === window.esquemaElementoSelecionado;
            card.className = `esquema-bloco-card ${bloco.ativo ? '' : 'inativo'} ${isFoco ? 'card-em-foco' : ''}`;
            card.setAttribute('data-id', bloco.id);
            card.setAttribute('data-idx', idx);

            card.addEventListener('click', (e) => {
                if (e.target.closest('button, input, select, label')) return;
                selecionarElementoEsquema(bloco.id);
            });

            const iconMap = {
                loja: 'ph-storefront',
                nome: 'ph-package',
                barcode: 'ph-barcode',
                preco: 'ph-currency-circle-dollar',
                estoque: 'ph-archive-box',
                extra: 'ph-notepad'
            };
            const iconClass = iconMap[bloco.id] || 'ph-squares-four';

            const curLargura = bloco.larguraBox !== undefined ? bloco.larguraBox : (bloco.posicao === '50' ? 50 : 100);
            const curOffX = Math.round(parseFloat(bloco.offsetX) || 0);
            const curOffY = Math.round(parseFloat(bloco.offsetY) || 0);

            const ativos = esquema.filter(b => b.ativo);
            const posAtivo = ativos.findIndex(b => b.id === bloco.id);
            const podeSubir = bloco.ativo && posAtivo > 0;
            const podeDescer = bloco.ativo && posAtivo !== -1 && posAtivo < (ativos.length - 1);

            card.innerHTML = `
                <div class="esquema-bloco-header">
                    <label class="esquema-bloco-title">
                        <input type="checkbox" class="chk-bloco-ativo" data-idx="${idx}" ${bloco.ativo ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px; accent-color: var(--primary);">
                        <i class="ph ${iconClass}" style="color: ${bloco.ativo ? '#38bdf8' : 'var(--text-muted)'}; font-size: 16px;"></i>
                        <span>${bloco.nome}</span>
                    </label>
                    <div class="esquema-bloco-nav">
                        <button type="button" class="esquema-nav-btn btn-mover-sobe" data-idx="${idx}" title="Mover para cima (mais ao topo)" ${podeSubir ? '' : 'disabled'}>▲</button>
                        <button type="button" class="esquema-nav-btn btn-mover-desce" data-idx="${idx}" title="Mover para baixo (mais à base)" ${podeDescer ? '' : 'disabled'}>▼</button>
                    </div>
                </div>

                <div class="esquema-bloco-controls" style="${bloco.ativo ? '' : 'display: none;'}">
                    <!-- LINHA 1: GRID BOX (LARGURA DA CAIXA) & ALINHAMENTO -->
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 6px;">
                        <div class="esquema-ctrl-group">
                            <span class="esquema-ctrl-label" title="Tamanho / largura da caixa na linha da etiqueta"><i class="ph ph-grid-four"></i> Grid Box:</span>
                            <div class="grid-box-pills">
                                ${[100, 75, 66, 50, 33, 25].map(pct => `
                                    <button type="button" class="grid-box-pill-btn ${curLargura == pct ? 'active' : ''}" data-idx="${idx}" data-val="${pct}">${pct}%</button>
                                `).join('')}
                            </div>
                        </div>

                        <div class="esquema-ctrl-group">
                            <span class="esquema-ctrl-label">Alinhar:</span>
                            <select class="esquema-ctrl-select sel-bloco-align" data-idx="${idx}">
                                <option value="left" ${bloco.align === 'left' ? 'selected' : ''}>⬅ Esq</option>
                                <option value="center" ${bloco.align === 'center' ? 'selected' : ''}>⏺ Centro</option>
                                <option value="right" ${bloco.align === 'right' ? 'selected' : ''}>➡ Dir</option>
                            </select>
                        </div>
                    </div>

                    <!-- LINHA 2: AJUSTE FINO EM PIXELS (DESLOCAMENTO X E Y) -->
                    <div style="display: flex; align-items: center; width: 100%; flex-wrap: wrap; gap: 8px; background: rgba(0,0,0,0.25); padding: 5px 8px; border-radius: 5px; border: 1px dashed rgba(255,255,255,0.08);">
                        <span class="esquema-ctrl-label" style="color: #38bdf8;"><i class="ph ph-arrows-out-cardinal"></i> Ajuste Fino (px):</span>
                        
                        <!-- Posição X (Esq/Dir) -->
                        <div class="esquema-ctrl-group" title="Mover em pixels para esquerda ou direita">
                            <span class="esquema-ctrl-label">X:</span>
                            <div class="px-stepper-container">
                                <button type="button" class="px-stepper-btn btn-step-px" data-idx="${idx}" data-prop="offsetX" data-delta="-1">◀</button>
                                <span class="px-stepper-val">${curOffX > 0 ? '+' + curOffX : curOffX}px</span>
                                <button type="button" class="px-stepper-btn btn-step-px" data-idx="${idx}" data-prop="offsetX" data-delta="1">▶</button>
                            </div>
                        </div>

                        <!-- Posição Y (Cima/Baixo) -->
                        <div class="esquema-ctrl-group" title="Mover em pixels para cima ou para baixo">
                            <span class="esquema-ctrl-label">Y:</span>
                            <div class="px-stepper-container">
                                <button type="button" class="px-stepper-btn btn-step-px" data-idx="${idx}" data-prop="offsetY" data-delta="-1">▲</button>
                                <span class="px-stepper-val">${curOffY > 0 ? '+' + curOffY : curOffY}px</span>
                                <button type="button" class="px-stepper-btn btn-step-px" data-idx="${idx}" data-prop="offsetY" data-delta="1">▼</button>
                            </div>
                        </div>

                        ${(curOffX !== 0 || curOffY !== 0) ? `
                            <button type="button" class="btn-reset-px" data-idx="${idx}" title="Zerar deslocamentos (0px)" style="background: transparent; border: none; color: #94a3b8; font-size: 10px; cursor: pointer; text-decoration: underline; padding: 0 4px;">
                                Zerar (0px)
                            </button>
                        ` : ''}
                    </div>

                    <!-- LINHA 3: TIPOGRAFIA AVANÇADA (FONTES, TAMANHO FINO, PESO, ITÁLICO) -->
                    ${bloco.id !== 'barcode' ? `
                        <div style="display: flex; align-items: center; width: 100%; flex-wrap: wrap; gap: 8px;">
                            <!-- Família da Fonte -->
                            <div class="esquema-ctrl-group">
                                <span class="esquema-ctrl-label">Fonte:</span>
                                <select class="esquema-ctrl-select sel-bloco-family" data-idx="${idx}" style="max-width: 105px;">
                                    <option value="Arial, sans-serif" ${bloco.fontFamily === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
                                    <option value="'Segoe UI', sans-serif" ${bloco.fontFamily === "'Segoe UI', sans-serif" ? 'selected' : ''}>Segoe UI</option>
                                    <option value="'Montserrat', sans-serif" ${bloco.fontFamily === "'Montserrat', sans-serif" ? 'selected' : ''}>Montserrat</option>
                                    <option value="'Roboto', sans-serif" ${bloco.fontFamily === "'Roboto', sans-serif" ? 'selected' : ''}>Roboto</option>
                                    <option value="'Courier New', monospace" ${bloco.fontFamily === "'Courier New', monospace" ? 'selected' : ''}>Courier (Mono)</option>
                                    <option value="'Impact', sans-serif" ${bloco.fontFamily === "'Impact', sans-serif" ? 'selected' : ''}>Impact (Forte)</option>
                                    <option value="'Trebuchet MS', sans-serif" ${bloco.fontFamily === "'Trebuchet MS', sans-serif" ? 'selected' : ''}>Trebuchet</option>
                                </select>
                            </div>

                            <!-- Tamanho da Fonte (Ajuste Fino 5.0pt a 14.0pt) -->
                            <div class="esquema-ctrl-group">
                                <span class="esquema-ctrl-label">Tam:</span>
                                <select class="esquema-ctrl-select sel-bloco-font" data-idx="${idx}">
                                    ${[5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 11.0, 12.0, 13.0, 14.0].map(pt => `
                                        <option value="${pt}" ${parseFloat(bloco.fontSize) == pt ? 'selected' : ''}>${pt}pt</option>
                                    `).join('')}
                                </select>
                            </div>

                            <!-- Peso da Fonte -->
                            <div class="esquema-ctrl-group">
                                <span class="esquema-ctrl-label">Peso:</span>
                                <select class="esquema-ctrl-select sel-bloco-weight" data-idx="${idx}">
                                    <option value="400" ${bloco.fontWeight == '400' ? 'selected' : ''}>Normal</option>
                                    <option value="600" ${bloco.fontWeight == '600' ? 'selected' : ''}>Semibold</option>
                                    <option value="700" ${bloco.fontWeight == '700' ? 'selected' : ''}>Negrito</option>
                                    <option value="800" ${bloco.fontWeight == '800' ? 'selected' : ''}>Extra Forte</option>
                                </select>
                            </div>

                            <!-- Itálico & Maiúsculas -->
                            <div class="esquema-ctrl-group" style="gap: 6px;">
                                <label style="display: flex; align-items: center; gap: 3px; font-size: 11px; cursor: pointer;" title="Texto em Itálico">
                                    <input type="checkbox" class="chk-bloco-italic" data-idx="${idx}" ${bloco.italic ? 'checked' : ''}>
                                    <em>I</em>
                                </label>
                                <label style="display: flex; align-items: center; gap: 3px; font-size: 11px; cursor: pointer;" title="Tudo em Maiúsculas">
                                    <input type="checkbox" class="chk-bloco-uppercase" data-idx="${idx}" ${bloco.uppercase ? 'checked' : ''}>
                                    AA
                                </label>
                            </div>
                        </div>
                    ` : `
                        <!-- Opções do Barcode -->
                        <div class="esquema-ctrl-group">
                            <span class="esquema-ctrl-label">Números:</span>
                            <label style="display: flex; align-items: center; gap: 4px; font-size: 11px; cursor: pointer;">
                                <input type="checkbox" class="chk-bloco-nums" data-idx="${idx}" ${bloco.mostrarNumero ? 'checked' : ''}>
                                Exibir dígitos sob as barras
                            </label>
                        </div>
                    `}

                    ${(bloco.id === 'loja' || bloco.id === 'extra') ? `
                        <div class="esquema-ctrl-group" style="flex: 1 1 100%; margin-top: 2px;">
                            <span class="esquema-ctrl-label">Texto:</span>
                            <input type="text" class="esquema-ctrl-input inp-bloco-texto" data-idx="${idx}" value="${bloco.textoPersonalizado || ''}" placeholder="Digite o texto..." style="flex: 1;">
                        </div>
                    ` : ''}

                    ${bloco.id === 'estoque' ? `
                        <div class="esquema-ctrl-group">
                            <span class="esquema-ctrl-label">Formato:</span>
                            <select class="esquema-ctrl-select sel-bloco-tipo-estoque" data-idx="${idx}">
                                <option value="qtd" ${bloco.textoTipo === 'qtd' ? 'selected' : ''}>"Qtd: 1 un"</option>
                                <option value="estoque" ${bloco.textoTipo === 'estoque' ? 'selected' : ''}>"Estoque: {X}"</option>
                            </select>
                        </div>
                    ` : ''}
                </div>
            `;

            container.appendChild(card);
        });

        // Eventos dos botões de ordenação
        container.querySelectorAll('.btn-mover-sobe').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const i = parseInt(btn.getAttribute('data-idx'));
                const bloco = window.etiquetaEsquema[i];
                if (bloco) moverElementoOrdem(bloco.id, -1);
            });
        });

        container.querySelectorAll('.btn-mover-desce').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const i = parseInt(btn.getAttribute('data-idx'));
                const bloco = window.etiquetaEsquema[i];
                if (bloco) moverElementoOrdem(bloco.id, 1);
            });
        });

        // Checkbox ativar/desativar bloco
        container.querySelectorAll('.chk-bloco-ativo').forEach(chk => {
            chk.addEventListener('change', () => {
                const i = parseInt(chk.getAttribute('data-idx'));
                window.etiquetaEsquema[i].ativo = chk.checked;
                salvarEAtualizarEsquema();
            });
        });

        // Pílulas de Grid Box (Largura %)
        container.querySelectorAll('.grid-box-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.getAttribute('data-idx'));
                const val = parseInt(btn.getAttribute('data-val'));
                window.etiquetaEsquema[i].larguraBox = val;
                window.etiquetaEsquema[i].posicao = String(val);
                salvarEAtualizarEsquema();
            });
        });

        // Alinhamento
        container.querySelectorAll('.sel-bloco-align').forEach(sel => {
            sel.addEventListener('change', () => {
                const i = parseInt(sel.getAttribute('data-idx'));
                window.etiquetaEsquema[i].align = sel.value;
                salvarEAtualizarEsquema();
            });
        });

        // Ajuste fino em Pixels (Offset X e Y)
        container.querySelectorAll('.btn-step-px').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.getAttribute('data-idx'));
                const prop = btn.getAttribute('data-prop');
                const delta = parseInt(btn.getAttribute('data-delta'));
                window.etiquetaEsquema[i][prop] = (parseFloat(window.etiquetaEsquema[i][prop]) || 0) + delta;
                salvarEAtualizarEsquema();
            });
        });

        // Zerar Offset
        container.querySelectorAll('.btn-reset-px').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.getAttribute('data-idx'));
                window.etiquetaEsquema[i].offsetX = 0;
                window.etiquetaEsquema[i].offsetY = 0;
                salvarEAtualizarEsquema();
            });
        });

        // Família da Fonte
        container.querySelectorAll('.sel-bloco-family').forEach(sel => {
            sel.addEventListener('change', () => {
                const i = parseInt(sel.getAttribute('data-idx'));
                window.etiquetaEsquema[i].fontFamily = sel.value;
                salvarEAtualizarEsquema();
            });
        });

        // Tamanho da Fonte
        container.querySelectorAll('.sel-bloco-font').forEach(sel => {
            sel.addEventListener('change', () => {
                const i = parseInt(sel.getAttribute('data-idx'));
                window.etiquetaEsquema[i].fontSize = parseFloat(sel.value);
                salvarEAtualizarEsquema();
            });
        });

        // Peso da Fonte
        container.querySelectorAll('.sel-bloco-weight').forEach(sel => {
            sel.addEventListener('change', () => {
                const i = parseInt(sel.getAttribute('data-idx'));
                window.etiquetaEsquema[i].fontWeight = sel.value;
                salvarEAtualizarEsquema();
            });
        });

        // Itálico
        container.querySelectorAll('.chk-bloco-italic').forEach(chk => {
            chk.addEventListener('change', () => {
                const i = parseInt(chk.getAttribute('data-idx'));
                window.etiquetaEsquema[i].italic = chk.checked;
                salvarEAtualizarEsquema();
            });
        });

        // Maiúsculas
        container.querySelectorAll('.chk-bloco-uppercase').forEach(chk => {
            chk.addEventListener('change', () => {
                const i = parseInt(chk.getAttribute('data-idx'));
                window.etiquetaEsquema[i].uppercase = chk.checked;
                salvarEAtualizarEsquema();
            });
        });

        // Números no Barcode
        container.querySelectorAll('.chk-bloco-nums').forEach(chk => {
            chk.addEventListener('change', () => {
                const i = parseInt(chk.getAttribute('data-idx'));
                window.etiquetaEsquema[i].mostrarNumero = chk.checked;
                salvarEAtualizarEsquema();
            });
        });

        // Texto Personalizado
        container.querySelectorAll('.inp-bloco-texto').forEach(inp => {
            inp.addEventListener('input', () => {
                const i = parseInt(inp.getAttribute('data-idx'));
                window.etiquetaEsquema[i].textoPersonalizado = inp.value;
                salvarEAtualizarEsquema(false);
            });
        });

        // Tipo de Estoque
        container.querySelectorAll('.sel-bloco-tipo-estoque').forEach(sel => {
            sel.addEventListener('change', () => {
                const i = parseInt(sel.getAttribute('data-idx'));
                window.etiquetaEsquema[i].textoTipo = sel.value;
                salvarEAtualizarEsquema();
            });
        });
    };

    function salvarEAtualizarEsquema(reRenderBlocos = true) {
        localStorage.setItem('avence_etiqueta_esquema', JSON.stringify(window.etiquetaEsquema));
        if (reRenderBlocos) {
            window.renderEsquemaBlocos();
        }
        window.renderPreviewIndividual();
        window.updateEanPreview();
        atualizarPainelQuickControle();
    }

    // Botão Restaurar Esquema Padrão
    document.getElementById('btn-restaurar-esquema-padrao')?.addEventListener('click', () => {
        window.etiquetaEsquema = JSON.parse(JSON.stringify(defaultEsquema));
        salvarEAtualizarEsquema();
        if (window.customAlert) window.customAlert('Esquema restaurado para o formato padrão!', 'success');
    });

    // =========================================================================
    // PRÉVIA INDIVIDUAL AMPLIADA (ZOOM 3X)
    // =========================================================================
    window.renderPreviewIndividual = function() {
        const preview = document.getElementById('esquema-preview-individual');
        if (!preview) return;

        aplicarVariaveisCssRegua();

        // Pega o primeiro item adicionado ou um produto exemplo
        const exemploItem = window.etiquetasFolha.length > 0 ? window.etiquetasFolha[0] : {
            id: 'exemplo',
            nome: 'Película de Vidro 3D Premium',
            ean: '7891234567890',
            venda: 25.00,
            qtdEstoque: 15,
            qtd: 1
        };

        preview.innerHTML = gerarHtmlEtiqueta(exemploItem, true);
        renderizarBarcodesEm(preview);
        initInteractivePreview(preview);
    };

    // =========================================================================
    // BUSCA RÁPIDA E SELEÇÃO DE PRODUTOS DO ESTOQUE (ABA 1)
    // =========================================================================
    window.renderBuscaProdutos = function(filtro = '') {
        const container = document.getElementById('ean-busca-resultados');
        if (!container) return;

        if (!estoque || estoque.length === 0) {
            try {
                estoque = JSON.parse(localStorage.getItem('avence_estoque') || '[]');
            } catch(e) {
                estoque = [];
            }
        }

        const termo = (filtro || '').toLowerCase().trim();
        let prods = estoque.filter(p => p && p.tipo !== 'servico');
        if (termo) {
            prods = prods.filter(p => 
                (p.nome && p.nome.toLowerCase().includes(termo)) ||
                (p.ean && p.ean.toLowerCase().includes(termo))
            );
        }

        container.innerHTML = '';
        if (prods.length === 0) {
            container.innerHTML = `
                <div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 12px;">
                    <i class="ph ph-magnifying-glass" style="font-size: 20px; display: block; margin-bottom: 4px; opacity: 0.5;"></i>
                    ${termo ? `Nenhum produto encontrado para "<strong>${termo}</strong>".` : 'Nenhum produto físico cadastrado no estoque ainda.'}
                </div>
            `;
            return;
        }

        prods.slice(0, 40).forEach(p => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'ean-busca-item';
            const jaAdicionado = window.etiquetasFolha.find(f => f.id == p.id);
            const qtdNaFolha = jaAdicionado ? jaAdicionado.qtd : 0;
            const estoqueNum = parseInt(p.qtd) || 0;

            let actionHtml = '';
            if (qtdNaFolha > 0) {
                // Produto já adicionado: exibe botão [-], indicador de quantidade e botão [+]
                actionHtml = `
                    <div class="ean-busca-qtd-control" style="display: flex; align-items: center; gap: 4px;">
                        <button type="button" class="ean-qtd-btn btn-busca-diminuir" data-id="${p.id}" title="Diminuir quantidade" style="width: 28px; height: 28px; font-size: 15px; font-weight: bold; color: #ef4444; border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.12); cursor: pointer; border-radius: 4px;">-</button>
                        <span style="font-size: 12px; font-weight: 700; color: #22c55e; background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); padding: 4px 8px; border-radius: 4px; min-width: 32px; text-align: center;">${qtdNaFolha}</span>
                        <button type="button" class="ean-qtd-btn btn-busca-aumentar" data-id="${p.id}" title="Aumentar quantidade" style="width: 28px; height: 28px; font-size: 15px; font-weight: bold; color: #22c55e; border-color: rgba(34,197,94,0.4); background: rgba(34,197,94,0.12); cursor: pointer; border-radius: 4px;">+</button>
                    </div>
                `;
            } else {
                // Bateu 0 ou não adicionado: aparece somente o botão Adicionar normal
                actionHtml = `
                    <button type="button" class="btn btn-secondary btn-busca-adicionar" data-id="${p.id}" style="padding: 6px 12px; font-size: 12px; font-weight: 600; color: #22c55e; border-color: rgba(34,197,94,0.3); background: rgba(34,197,94,0.1); border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        <i class="ph ph-plus"></i> Adicionar
                    </button>
                `;
            }

            itemDiv.innerHTML = `
                <div class="ean-busca-item-info">
                    <span class="ean-busca-item-nome" title="${p.nome}">${p.nome}</span>
                    <div class="ean-busca-item-meta">
                        <span>EAN: <strong style="color: #38bdf8;">${p.ean || 'Sem EAN'}</strong></span>
                        <span>Preço: <strong style="color: #22c55e;">${formatMoney(p.venda)}</strong></span>
                        <span>Estoque: <strong style="color: ${estoqueNum > 0 ? '#e2e8f0' : '#ef4444'};">${estoqueNum} un</strong></span>
                    </div>
                </div>
                ${actionHtml}
            `;

            // Botão Adicionar (quando qtd == 0)
            const btnAdd = itemDiv.querySelector('.btn-busca-adicionar');
            if (btnAdd) {
                btnAdd.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.adicionarProdutoFolha(p, 1);
                    window.renderBuscaProdutos(document.getElementById('ean-busca-produto-input')?.value || '');
                });
            }

            // Botão Diminuir [-]
            const btnDim = itemDiv.querySelector('.btn-busca-diminuir');
            if (btnDim) {
                btnDim.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const item = window.etiquetasFolha.find(f => f.id == p.id);
                    if (item) {
                        item.qtd--;
                        // Não pode ser número negativo: bateu 0, remove da folha
                        if (item.qtd <= 0) {
                            window.etiquetasFolha = window.etiquetasFolha.filter(f => f.id != p.id);
                        }
                        renderEstudioCards();
                        window.updateEanPreview();
                        window.renderBuscaProdutos(document.getElementById('ean-busca-produto-input')?.value || '');
                    }
                });
            }

            // Botão Aumentar [+]
            const btnAum = itemDiv.querySelector('.btn-busca-aumentar');
            if (btnAum) {
                btnAum.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const item = window.etiquetasFolha.find(f => f.id == p.id);
                    if (item && item.qtd < 65) {
                        item.qtd++;
                        renderEstudioCards();
                        window.updateEanPreview();
                        window.renderBuscaProdutos(document.getElementById('ean-busca-produto-input')?.value || '');
                    }
                });
            }

            // Se clicar no item e ainda não estiver na folha, adiciona 1
            itemDiv.addEventListener('click', () => {
                if (qtdNaFolha === 0) {
                    window.adicionarProdutoFolha(p, 1);
                    window.renderBuscaProdutos(document.getElementById('ean-busca-produto-input')?.value || '');
                }
            });

            container.appendChild(itemDiv);
        });
    };

    // Evento de digitação na busca
    const inpBuscaProd = document.getElementById('ean-busca-produto-input');
    if (inpBuscaProd) {
        inpBuscaProd.addEventListener('input', (e) => {
            window.renderBuscaProdutos(e.target.value);
        });
    }

    // Adicionar Item Avulso / Personalizado à Folha
    document.getElementById('btn-adicionar-avulso-folha')?.addEventListener('click', () => {
        const nome = prompt('Nome do Produto na Etiqueta:', 'Produto Personalizado');
        if (!nome) return;
        const ean = prompt('Código EAN / Barras (13 dígitos ou alfanumérico):', '789' + Math.floor(1000000000 + Math.random() * 9000000000)) || '7890000000000';
        const precoStr = prompt('Preço de Venda (ex: 29.90):', '0.00');
        const preco = parseFloat(precoStr?.replace(',', '.') || '0') || 0;
        const qtdStr = prompt('Quantidade de etiquetas a imprimir (1 a 65):', '1');
        const qtd = Math.max(1, Math.min(65, parseInt(qtdStr) || 1));

        window.adicionarProdutoFolha({
            id: 'avulso_' + Date.now(),
            nome: nome,
            ean: ean,
            venda: preco,
            qtd: qtd,
            qtdEstoque: qtd
        }, qtd);
    });

    // Adiciona produto à lista da folha
    window.adicionarProdutoFolha = function(produto, qtdDesejada = null) {
        if (!produto) return;
        
        sincronizarInputsRegua();

        const existente = window.etiquetasFolha.find(item => item.id == produto.id);
        const qtdEstoque = parseInt(produto.qtd) || 0;
        
        let qtd = qtdDesejada;
        if (qtd === null) {
            qtd = (qtdEstoque > 0 && qtdEstoque <= 65) ? qtdEstoque : (qtdEstoque > 65 ? 65 : 1);
        }

        if (existente) {
            existente.qtd = Math.min(65, existente.qtd + qtd);
        } else {
            window.etiquetasFolha.push({
                id: produto.id,
                nome: produto.nome,
                ean: String(produto.ean || '7890000000000'),
                venda: parseFloat(produto.venda) || 0,
                qtdEstoque: qtdEstoque,
                qtd: Math.max(1, Math.min(65, qtd))
            });
        }

        renderEstudioCards();
        window.updateEanPreview();
    };

    // Renderiza os cards dos produtos adicionados na folha
    function renderEstudioCards() {
        const container = document.getElementById('ean-produtos-cards-container');
        if (!container) return;

        container.innerHTML = '';

        if (window.etiquetasFolha.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 24px 16px; color: var(--text-muted); background: var(--bg-surface-light); border-radius: 8px; border: 1px dashed var(--border);">
                    <i class="ph ph-package" style="font-size: 32px; display: block; margin-bottom: 8px; opacity: 0.5;"></i>
                    <strong style="display: block; font-size: 14px; margin-bottom: 4px; color: var(--text-main);">Nenhum produto adicionado à folha</strong>
                    <span style="font-size: 12px;">Busque e clique em um produto acima ou clique no botão de código de barras (<i class="ph ph-barcode"></i>) de qualquer produto da tabela.</span>
                </div>`;
            atualizarBarraOcupacao();
            return;
        }

        window.etiquetasFolha.forEach(item => {
            const card = document.createElement('div');
            card.className = 'ean-prod-card';
            card.innerHTML = `
                <div class="ean-prod-card-header">
                    <div>
                        <div class="ean-prod-card-title">${item.nome}</div>
                        <div class="ean-prod-card-info" style="margin-top: 4px;">
                            <span>EAN: <strong style="color: var(--primary);">${item.ean}</strong></span>
                            <span>Preço: <strong style="color: #22c55e;">${formatMoney(item.venda)}</strong></span>
                            <span style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px;">Estoque: <strong>${item.qtdEstoque} un</strong></span>
                        </div>
                    </div>
                    <button type="button" class="btn btn-secondary btn-remover-item-folha" data-id="${item.id}" title="Remover da Folha" style="padding: 4px 6px; color: #ef4444; font-size: 14px; background: transparent; border: none; cursor: pointer;">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
                <div class="ean-prod-card-actions">
                    <span style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Qtd de Etiquetas:</span>
                    <div class="ean-qtd-control">
                        <button type="button" class="ean-qtd-btn btn-diminuir-qtd" data-id="${item.id}">-</button>
                        <input type="number" min="1" max="65" class="ean-qtd-input" data-id="${item.id}" value="${item.qtd}">
                        <button type="button" class="ean-qtd-btn btn-aumentar-qtd" data-id="${item.id}">+</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        // Eventos dos botões do card
        container.querySelectorAll('.btn-remover-item-folha').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                window.etiquetasFolha = window.etiquetasFolha.filter(p => p.id != id);
                renderEstudioCards();
                window.updateEanPreview();
                window.renderBuscaProdutos(document.getElementById('ean-busca-produto-input')?.value || '');
            });
        });

        container.querySelectorAll('.btn-diminuir-qtd').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const item = window.etiquetasFolha.find(p => p.id == id);
                if (item) {
                    item.qtd--;
                    if (item.qtd <= 0) {
                        // Bateu 0: remove da folha
                        window.etiquetasFolha = window.etiquetasFolha.filter(p => p.id != id);
                    }
                    renderEstudioCards();
                    window.updateEanPreview();
                    window.renderBuscaProdutos(document.getElementById('ean-busca-produto-input')?.value || '');
                }
            });
        });

        container.querySelectorAll('.btn-aumentar-qtd').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const item = window.etiquetasFolha.find(p => p.id == id);
                if (item && item.qtd < 65) {
                    item.qtd++;
                    renderEstudioCards();
                    window.updateEanPreview();
                    window.renderBuscaProdutos(document.getElementById('ean-busca-produto-input')?.value || '');
                }
            });
        });

        container.querySelectorAll('.ean-qtd-input').forEach(inp => {
            inp.addEventListener('change', () => {
                const id = inp.getAttribute('data-id');
                const item = window.etiquetasFolha.find(p => p.id == id);
                let val = parseInt(inp.value);
                if (isNaN(val) || val <= 0) {
                    window.etiquetasFolha = window.etiquetasFolha.filter(p => p.id != id);
                } else {
                    if (val > 65) val = 65;
                    if (item) item.qtd = val;
                }
                renderEstudioCards();
                window.updateEanPreview();
                window.renderBuscaProdutos(document.getElementById('ean-busca-produto-input')?.value || '');
            });
        });

        atualizarBarraOcupacao();
    }

    // Atualiza barra de ocupação da folha (65 posições)
    function atualizarBarraOcupacao() {
        const total = window.etiquetasFolha.reduce((sum, item) => sum + (parseInt(item.qtd) || 0), 0);
        const max = 65;
        const restantes = Math.max(0, max - total);
        const perc = Math.min(100, Math.round((total / max) * 100));

        const txtTotal = document.getElementById('ean-status-folha-txt');
        const txtVagas = document.getElementById('ean-vagas-restantes-txt');
        const barra = document.getElementById('ean-barra-progresso');

        if (txtTotal) txtTotal.textContent = `${total} / ${max} etiquetas preenchidas`;
        if (txtVagas) {
            if (total > max) {
                txtVagas.textContent = `Atenção: +${total - max} etiquetas irão para a 2ª folha`;
                txtVagas.style.color = '#f59e0b';
            } else {
                txtVagas.textContent = `${restantes} vagas livres`;
                txtVagas.style.color = 'var(--text-muted)';
            }
        }
        if (barra) {
            barra.style.width = `${perc}%`;
            barra.style.background = total > max ? '#f59e0b' : '#22c55e';
        }
    }

    // Botão Preencher Restante com Último Produto
    document.getElementById('btn-preencher-restante-folha')?.addEventListener('click', () => {
        if (window.etiquetasFolha.length === 0) {
            if (window.customAlert) window.customAlert('Adicione ao menos um produto à folha primeiro.', 'warning');
            return;
        }
        const totalAtual = window.etiquetasFolha.reduce((sum, item) => sum + (parseInt(item.qtd) || 0), 0);
        const vagas = 65 - totalAtual;
        if (vagas <= 0) {
            if (window.customAlert) window.customAlert('A folha de 65 etiquetas já está 100% preenchida!', 'warning');
            return;
        }
        const ultimo = window.etiquetasFolha[window.etiquetasFolha.length - 1];
        ultimo.qtd += vagas;
        renderEstudioCards();
        window.updateEanPreview();
    });

    // Botão Limpar Folha
    document.getElementById('btn-limpar-folha-etiquetas')?.addEventListener('click', () => {
        window.etiquetasFolha = [];
        renderEstudioCards();
        window.updateEanPreview();
        window.renderBuscaProdutos(document.getElementById('ean-busca-produto-input')?.value || '');
    });

    // Eventos da Régua milimétrica (Aba 2)
    const reguaInputs = [
        { id: 'regua-margem-superior', prop: 'margemSuperior' },
        { id: 'regua-margem-esquerda', prop: 'margemEsquerda' },
        { id: 'regua-largura', prop: 'largura' },
        { id: 'regua-altura', prop: 'altura' },
        { id: 'regua-gap-horizontal', prop: 'gapHorizontal' },
        { id: 'regua-gap-vertical', prop: 'gapVertical' }
    ];

    reguaInputs.forEach(({ id, prop }) => {
        document.getElementById(id)?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) {
                window.etiquetasConfig[prop] = val;
                aplicarVariaveisCssRegua();
                window.updateEanPreview();
            }
        });
    });

    // Tipo de código e altura
    document.getElementById('layout-tipo-codigo')?.addEventListener('change', (e) => {
        window.etiquetasConfig.tipoCodigo = e.target.value;
        window.updateEanPreview();
    });

    document.getElementById('layout-altura-slider')?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        window.etiquetasConfig.alturaCodigo = val;
        const txt = document.getElementById('layout-altura-val');
        if (txt) txt.textContent = val + 'px';
        window.updateEanPreview();
    });

    document.getElementById('layout-exibir-gabarito')?.addEventListener('change', (e) => {
        window.etiquetasConfig.exibirGabarito = e.target.checked;
        window.updateEanPreview();
    });

    // Salvar Calibração de Régua como Padrão
    document.getElementById('btn-salvar-regua-padrao')?.addEventListener('click', () => {
        localStorage.setItem('avence_etiquetas_config', JSON.stringify(window.etiquetasConfig));
        if (window.customAlert) window.customAlert('Calibração de régua salva com sucesso!', 'success');
    });

    // Restaurar Régua para o Padrão Pimaco 6180
    document.getElementById('btn-restaurar-regua-padrao')?.addEventListener('click', () => {
        window.etiquetasConfig = {
            margemSuperior: 10.7,
            margemEsquerda: 4.5,
            largura: 38.2,
            altura: 21.2,
            gapHorizontal: 2.5,
            gapVertical: 0.0,
            tipoCodigo: 'EAN13',
            alturaCodigo: 22,
            exibirGabarito: true
        };
        localStorage.setItem('avence_etiquetas_config', JSON.stringify(window.etiquetasConfig));
        sincronizarInputsRegua();
        window.updateEanPreview();
        if (window.customAlert) window.customAlert('Medidas restauradas para o padrão oficial Pimaco 6180!', 'success');
    });

    // =========================================================================
    // RENDERIZAÇÃO REALISTA DA PRÉVIA DA FOLHA A4 (65 ETIQUETAS)
    // =========================================================================
    window.updateEanPreview = function() {
        const previewContainer = document.getElementById('ean-preview-container');
        const printBarcode = document.getElementById('print-barcode');
        
        if (previewContainer) previewContainer.innerHTML = '';
        if (printBarcode) printBarcode.innerHTML = '';

        aplicarVariaveisCssRegua();

        const cfg = window.etiquetasConfig;

        // Monta a sequência plana de produtos a imprimir
        const listaParaImprimir = [];
        window.etiquetasFolha.forEach(item => {
            const count = parseInt(item.qtd) || 0;
            for (let i = 0; i < count; i++) {
                listaParaImprimir.push(item);
            }
        });

        // Folha padrão tem 65 posições (5 colunas x 13 linhas)
        const totalCelulas = Math.max(65, listaParaImprimir.length);

        for (let idx = 0; idx < totalCelulas; idx++) {
            const item = listaParaImprimir[idx];
            const tag = document.createElement('div');

            if (item) {
                tag.className = 'barcode-container';
                tag.innerHTML = gerarHtmlEtiqueta(item, false);
            } else {
                tag.className = 'barcode-container empty-slot';
                tag.innerHTML = cfg.exibirGabarito ? `<span>#${idx + 1}</span>` : ``;
            }

            if (printBarcode) printBarcode.appendChild(tag.cloneNode(true));
            if (previewContainer) previewContainer.appendChild(tag);
        }

        // Renderiza todos os códigos de barras da folha
        if (previewContainer) renderizarBarcodesEm(previewContainer);
        if (printBarcode) renderizarBarcodesEm(printBarcode);

        // Atualiza também a prévia individual ampliada
        window.renderPreviewIndividual();
    };

    // Botão Principal: Imprimir Folha A4
    document.getElementById('btn-imprimir-ean-agora')?.addEventListener('click', () => {
        if (window.etiquetasFolha.length === 0) {
            if (window.customAlert) window.customAlert('Adicione ao menos um produto à folha antes de imprimir.', 'warning');
            return;
        }
        
        window.updateEanPreview();
        aplicarVariaveisCssRegua();

        document.body.classList.add('printing-ean');
        window.print();
        setTimeout(() => { document.body.classList.remove('printing-ean'); }, 1200);
    });

    // Inicialização ao carregar a página
    window.addEventListener('DOMContentLoaded', () => {
        sincronizarInputsRegua();
        if (window.renderBuscaProdutos) window.renderBuscaProdutos();
        if (window.renderEsquemaBlocos) window.renderEsquemaBlocos();
        if (window.renderPreviewIndividual) window.renderPreviewIndividual();
    });
