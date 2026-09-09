    // --- PDV LOGIC ---
    let pdvCart = [];
    const pdvSearch = document.getElementById('pdv-search');
    const pdvTbody = document.getElementById('pdv-tbody');
    const pdvSubtotal = document.getElementById('pdv-subtotal');
    const pdvTotal = document.getElementById('pdv-total');
    const pdvDescontoInput = document.getElementById('pdv-input-desconto');
    const btnFinalizarVenda = document.getElementById('btn-finalizar-venda');
    const btnCancelarVenda = document.getElementById('btn-cancelar-venda');

    const pdvClienteTelefone = document.getElementById('pdv-cliente-telefone');
    if (pdvClienteTelefone) {
        pdvClienteTelefone.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 11) v = v.substring(0, 11);
            v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
            v = v.replace(/(\d)(\d{4})$/, "$1-$2");
            e.target.value = v;
        });
    }

    function renderPdvCart() {
        if (!pdvTbody) return;
        pdvTbody.innerHTML = '';
        let subtotal = 0;

        pdvCart.forEach((item, index) => {
            const tr = document.createElement('tr');
            const totalItem = item.venda * item.qtd;
            subtotal += totalItem;

            tr.innerHTML = `
                <td>${item.ean || '-'}</td>
                <td style="font-weight: 500;">${item.nome} ${item.tipo === 'servico' ? '<span style="font-size:10px; background:var(--primary); color:#fff; padding:2px 4px; border-radius:4px; margin-left:8px;">Serviço</span>' : ''}</td>
                <td style="text-align: right;">${formatMoney(item.venda)}</td>
                <td style="text-align: center;">
                    <div style="display: inline-flex; align-items: center; gap: 8px;">
                        <button class="btn btn-secondary btn-pdv-minus" data-index="${index}" style="padding: 2px 8px;">-</button>
                        <span style="display: inline-block; width: 28px; text-align: center; font-weight: bold;">${item.qtd}</span>
                        <button class="btn btn-secondary btn-pdv-plus" data-index="${index}" style="padding: 2px 8px;">+</button>
                    </div>
                </td>
                <td style="text-align: right; font-weight: bold; color: var(--primary);">${formatMoney(totalItem)}</td>
                <td style="text-align: center;">
                    <button class="btn btn-danger btn-pdv-excluir" data-index="${index}" style="padding: 6px;"><i class="ph ph-trash"></i></button>
                </td>
            `;
            pdvTbody.appendChild(tr);
        });

        const tipoDescontoEl = document.getElementById('pdv-tipo-desconto');
        const tipoDesconto = tipoDescontoEl ? tipoDescontoEl.value : 'rs';
        let descontoInputVal = parseFloat(pdvDescontoInput.value) || 0;
        let descontoValue = 0;
        
        if (tipoDesconto === 'perc') {
            descontoValue = subtotal * (descontoInputVal / 100);
        } else {
            descontoValue = descontoInputVal;
        }

        let baseTotal = subtotal - descontoValue;
        if (baseTotal < 0) baseTotal = 0;

        const formaPgtoEl = document.getElementById('pdv-forma-pgto');
        const formaPgto = formaPgtoEl ? formaPgtoEl.value : 'dinheiro';
        
        let jurosValor = 0;
        let finalTotal = baseTotal;

        const containerDinheiro = document.getElementById('pdv-opcoes-dinheiro');
        const containerParcelado = document.getElementById('pdv-opcoes-parcelado');

        if (containerDinheiro) containerDinheiro.style.display = 'none';
        if (containerParcelado) containerParcelado.style.display = 'none';

        if (formaPgto === 'dinheiro') {
            if (containerDinheiro) containerDinheiro.style.display = 'flex';
            
            const valorRecebido = parseFloat(document.getElementById('pdv-valor-recebido')?.value) || 0;
            const trocoEl = document.getElementById('pdv-troco');
            if (trocoEl) {
                const troco = valorRecebido - finalTotal;
                trocoEl.textContent = troco >= 0 ? formatMoney(troco) : 'R$ 0,00';
            }
        } else if (formaPgto === 'credito_vista') {
            jurosValor = 0;
            finalTotal = baseTotal;
        } else if (formaPgto === 'credito_parcelado') {
            if (containerParcelado) containerParcelado.style.display = 'flex';
            
            const parcelas = parseInt(document.getElementById('pdv-parcelas')?.value) || 2;
            const taxasMaquininha = {
                2: 0.0570,
                3: 0.0652,
                4: 0.07355,
                5: 0.0819,
                6: 0.09033,
                7: 0.09877,
                8: 0.10733,
                9: 0.11588,
                10: 0.12444
            };
            jurosValor = baseTotal * (taxasMaquininha[parcelas] || 0);
            finalTotal = baseTotal + jurosValor;
            
            const valorParcelaEl = document.getElementById('pdv-valor-parcela');
            if (valorParcelaEl) {
                valorParcelaEl.textContent = formatMoney(finalTotal / parcelas);
            }
        }

        pdvSubtotal.textContent = formatMoney(subtotal);
        pdvTotal.textContent = formatMoney(finalTotal);

        // Bind events
        document.querySelectorAll('.btn-pdv-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.getAttribute('data-index');
                if (pdvCart[idx].qtd > 1) {
                    pdvCart[idx].qtd--;
                    renderPdvCart();
                }
            });
        });

        document.querySelectorAll('.btn-pdv-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                const item = pdvCart[idx];
                const conf = window.lojaConfig || {};
                if (conf.bloquearVendaSemEstoque && item && item.tipo !== 'servico' && item.tipo !== 'Serviço') {
                    const maxQtd = item.estoqueMax !== undefined ? item.estoqueMax : (item.qtd !== undefined ? item.qtd : 999999);
                    if (item.qtd + 1 > maxQtd) {
                        window.customAlert(`Estoque insuficiente! Saldo disponível: ${maxQtd}`, 'warning');
                        return;
                    }
                }
                pdvCart[idx].qtd++;
                renderPdvCart();
            });
        });

        document.querySelectorAll('.btn-pdv-excluir').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.getAttribute('data-index');
                pdvCart.splice(idx, 1);
                renderPdvCart();
            });
        });
    }

    if (pdvDescontoInput) {
        pdvDescontoInput.addEventListener('input', renderPdvCart);
    }
    
    const pdvTipoDesconto = document.getElementById('pdv-tipo-desconto');
    if (pdvTipoDesconto) {
        pdvTipoDesconto.addEventListener('change', renderPdvCart);
    }
    
    const pdvFormaPgto = document.getElementById('pdv-forma-pgto');
    if (pdvFormaPgto) {
        pdvFormaPgto.addEventListener('change', renderPdvCart);
    }
    
    const pdvValorRecebido = document.getElementById('pdv-valor-recebido');
    if (pdvValorRecebido) {
        pdvValorRecebido.addEventListener('input', renderPdvCart);
    }
    
    const pdvParcelas = document.getElementById('pdv-parcelas');
    if (pdvParcelas) {
        pdvParcelas.addEventListener('change', renderPdvCart);
    }

    function processarItemPdv() {
        if (!pdvSearch) return;
        const rawVal = pdvSearch.value.trim();
        if (!rawVal) return;

        const term = rawVal.toLowerCase();
        const numOnly = rawVal.replace(/\D/g, '');

        // Obter lista atualizada do estoque de forma segura
        let listaEstoque = [];
        if (Array.isArray(window.estoque) && window.estoque.length > 0) {
            listaEstoque = window.estoque;
        } else {
            try {
                if (typeof estoque !== 'undefined' && Array.isArray(estoque)) listaEstoque = estoque;
            } catch(err) {}
            if (!listaEstoque || listaEstoque.length === 0) {
                try {
                    listaEstoque = JSON.parse(localStorage.getItem('avence_estoque') || '[]');
                } catch(err) {
                    listaEstoque = [];
                }
            }
        }

        // 1. Tentar EAN exato (string exata ou dígitos puros)
        let produto = listaEstoque.find(p => {
            if (!p.ean) return false;
            const pEanStr = String(p.ean).trim();
            const pEanDigits = pEanStr.replace(/\D/g, '');
            if (pEanStr.toLowerCase() === term) return true;
            if (numOnly && pEanDigits === numOnly) return true;
            return false;
        });

        // 2. Tentar EAN parcial (caso leitor corte ou complete) ou nome exato
        if (!produto) {
            produto = listaEstoque.find(p => {
                const pNome = (p.nome || '').trim().toLowerCase();
                const pEanStr = String(p.ean || '').trim().toLowerCase();
                const pEanDigits = pEanStr.replace(/\D/g, '');
                if (pNome === term) return true;
                if (numOnly && numOnly.length >= 4 && pEanDigits.includes(numOnly)) return true;
                if (pEanStr && term.length >= 4 && pEanStr.includes(term)) return true;
                return false;
            });
        }

        // 3. Tentar busca parcial de nome (apenas se achar 1 resultado claro, senão alerta)
        if (!produto) {
            const matches = listaEstoque.filter(p => (p.nome || '').toLowerCase().includes(term));
            if (matches.length === 1) {
                produto = matches[0];
            } else if (matches.length > 1) {
                window.customAlert('Múltiplos produtos encontrados. Digite o EAN ou nome mais específico.', 'warning');
                return;
            }
        }

        if (produto) {
            const conf = window.lojaConfig || {};
            const qtdDisp = Number(produto.qtd !== undefined ? produto.qtd : 0);
            
            // Verificar regra de bloquear venda sem estoque se ativada
            if (conf.bloquearVendaSemEstoque && produto.tipo !== 'servico' && produto.tipo !== 'Serviço') {
                const existItem = pdvCart.find(item => item.id === produto.id);
                const qtdNoCarrinho = existItem ? existItem.qtd : 0;
                if (qtdNoCarrinho + 1 > qtdDisp) {
                    window.customAlert(`Estoque insuficiente para "${produto.nome}"! Saldo disponível: ${qtdDisp}`, 'warning');
                    return;
                }
            }

            // Adicionar ou incrementar no carrinho
            const existIdx = pdvCart.findIndex(item => item.id === produto.id);
            if (existIdx >= 0) {
                pdvCart[existIdx].qtd++;
                if (pdvCart[existIdx].estoqueMax === undefined) {
                    pdvCart[existIdx].estoqueMax = qtdDisp;
                }
            } else {
                pdvCart.push({ ...produto, qtd: 1, estoqueMax: qtdDisp });
            }
            pdvSearch.value = '';
            renderPdvCart();
            setTimeout(() => {
                if (pdvSearch) pdvSearch.focus();
            }, 80);
        } else {
            window.customAlert('Produto não encontrado no estoque.', 'warning');
        }
    }

    const btnPdvSearchAdd = document.getElementById('btn-pdv-search-add');
    if (btnPdvSearchAdd) {
        btnPdvSearchAdd.addEventListener('click', (e) => {
            e.preventDefault();
            processarItemPdv();
        });
    }

    if (pdvSearch) {
        pdvSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === 'Tab' || e.keyCode === 13 || e.keyCode === 9) {
                e.preventDefault();
                processarItemPdv();
            }
        });

        pdvSearch.addEventListener('change', () => {
            if (pdvSearch.value.trim()) {
                processarItemPdv();
            }
        });
    }

    if (pdvDescontoInput) {
        pdvDescontoInput.addEventListener('input', renderPdvCart);
    }

    const pdvClienteNome = document.getElementById('pdv-cliente-nome');
    const pdvClienteDropdown = document.getElementById('pdv-cliente-dropdown');
    
    if (pdvClienteNome && pdvClienteDropdown) {
        let currentPdvClienteIndex = -1;
        
        function updatePdvClienteSelection() {
            const items = pdvClienteDropdown.querySelectorAll('.pdv-cliente-item');
            items.forEach((item, index) => {
                if (index === currentPdvClienteIndex) {
                    item.style.background = 'var(--bg-surface)';
                } else {
                    item.style.background = 'transparent';
                }
            });
        }

        pdvClienteNome.addEventListener('keydown', (e) => {
            if (pdvClienteDropdown.style.display === 'none') return;
            const items = pdvClienteDropdown.querySelectorAll('.pdv-cliente-item');
            if (!items.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentPdvClienteIndex++;
                if (currentPdvClienteIndex >= items.length) currentPdvClienteIndex = items.length - 1;
                updatePdvClienteSelection();
                items[currentPdvClienteIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentPdvClienteIndex--;
                if (currentPdvClienteIndex < 0) currentPdvClienteIndex = 0;
                updatePdvClienteSelection();
                items[currentPdvClienteIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentPdvClienteIndex >= 0 && items[currentPdvClienteIndex]) {
                    items[currentPdvClienteIndex].click();
                }
            }
        });

        pdvClienteNome.addEventListener('input', (e) => {
            currentPdvClienteIndex = -1;
            const val = e.target.value.toLowerCase().trim();
            pdvClienteDropdown.innerHTML = '';
            
            const telEl = document.getElementById('pdv-cliente-telefone');
            const docEl = document.getElementById('pdv-cliente-doc');
            const endEl = document.getElementById('pdv-cliente-endereco');
            const idEl = document.getElementById('pdv-cliente-id');

            if (!val) {
                pdvClienteDropdown.style.display = 'none';
                if (telEl) telEl.value = '';
                if (docEl) docEl.value = '';
                if (endEl) endEl.value = '';
                if (idEl) idEl.value = '';
                return;
            }
            
            // Verify window.clientes exists
            if (!window.clientes) window.clientes = [];
            
            try {
                const matches = window.clientes.filter(c => (c.nome && c.nome.toLowerCase().includes(val)) || (c.documento && c.documento.includes(val)));
                if (matches.length > 0) {
                    pdvClienteDropdown.style.display = 'block';
                    matches.slice(0, 5).forEach(c => {
                        const div = document.createElement('div');
                        div.className = 'pdv-cliente-item';
                        div.style.padding = '8px 12px';
                        div.style.cursor = 'pointer';
                        div.style.borderBottom = '1px solid var(--border)';
                        div.innerHTML = `<strong>${c.nome || 'Sem Nome'}</strong><br><small style="color: var(--text-muted);">${c.documento || c.cpf || 'Sem doc'}</small>`;
                        
                        div.addEventListener('mouseover', () => {
                            const items = Array.from(pdvClienteDropdown.querySelectorAll('.pdv-cliente-item'));
                            currentPdvClienteIndex = items.indexOf(div);
                            updatePdvClienteSelection();
                        });
                        
                        div.addEventListener('click', () => {
                            pdvClienteNome.value = c.nome || '';
                            if (telEl) telEl.value = c.celular || c.telefone || '';
                            if (docEl) docEl.value = c.documento || c.cpf || '';
                            let enderecoCompleto = c.endereco || '';
                            if (c.numero) enderecoCompleto += `, ${c.numero}`;
                            if (c.bairro) enderecoCompleto += ` - ${c.bairro}`;
                            if (endEl) endEl.value = enderecoCompleto;
                            if (idEl) idEl.value = c.id || '';
                            pdvClienteDropdown.style.display = 'none';
                        });
                        pdvClienteDropdown.appendChild(div);
                    });
                } else {
                    pdvClienteDropdown.style.display = 'none';
                }
            } catch (err) {
                console.error("Erro na busca de clientes:", err);
            }
        });

        document.addEventListener('click', (e) => {
            if (!pdvClienteNome.contains(e.target) && !pdvClienteDropdown.contains(e.target)) {
                pdvClienteDropdown.style.display = 'none';
            }
        });
    }

    if (btnCancelarVenda) {
        btnCancelarVenda.addEventListener('click', () => {
            if (pdvCart.length === 0) return;
            window.customAlert('Deseja realmente cancelar esta venda?', 'warning', true, () => {
                pdvCart = [];
                pdvDescontoInput.value = '0.00';
                if (document.getElementById('pdv-cliente-nome')) document.getElementById('pdv-cliente-nome').value = '';
                if (document.getElementById('pdv-cliente-nome')) document.getElementById('pdv-cliente-nome').value = '';
                if (document.getElementById('pdv-cliente-telefone')) document.getElementById('pdv-cliente-telefone').value = '';
                if (document.getElementById('pdv-cliente-doc')) document.getElementById('pdv-cliente-doc').value = '';
                if (document.getElementById('pdv-cliente-endereco')) document.getElementById('pdv-cliente-endereco').value = '';
                if (document.getElementById('pdv-cliente-id')) document.getElementById('pdv-cliente-id').value = '';
                
                renderPdvCart();
            });
        });
    }

    let isFinalizandoVenda = false;
    if (btnFinalizarVenda) {
        btnFinalizarVenda.addEventListener('click', async () => {
            if (isFinalizandoVenda) {
                console.warn('[PDV] Finalização já em andamento, ignorando clique duplicado.');
                return;
            }

            if (pdvCart.length === 0) {
                window.customAlert('Adicione produtos ao carrinho primeiro.', 'warning');
                return;
            }

            const valNomeCli = document.getElementById('pdv-cliente-nome')?.value.trim();
            const valTelCli = document.getElementById('pdv-cliente-telefone')?.value.trim();
            const valDocCli = document.getElementById('pdv-cliente-doc')?.value.trim();
            const valEndCli = document.getElementById('pdv-cliente-endereco')?.value.trim();
            
            if (!valNomeCli || !valTelCli) {
                window.customAlert('O Nome e o Telefone do cliente são obrigatórios para finalizar a venda.', 'warning');
                return;
            }

            isFinalizandoVenda = true;
            const btnText = btnFinalizarVenda.innerHTML;
            btnFinalizarVenda.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Finalizando...';
            btnFinalizarVenda.disabled = true;

            try {
                if (!window.clientes) window.clientes = [];
                let clienteExiste = window.clientes.find(c => c.nome.toLowerCase() === valNomeCli.toLowerCase());
                if (!clienteExiste) {
                    const novoCliente = {
                        nome: valNomeCli,
                        telefone: valTelCli,
                        celular: valTelCli,
                        documento: valDocCli,
                        cpf: valDocCli,
                        endereco: valEndCli
                    };
                    const docId = window.appwrite.ID.unique();
                    const createdCli = await window.appwrite.databases.createDocument(window.appwrite.DB_ID, window.appwrite.COL_CLIENTES, docId, novoCliente);
                    novoCliente.id = createdCli.$id;
                    window.clientes.push(novoCliente);
                    localStorage.setItem('avence_clientes', JSON.stringify(window.clientes));
                    if (typeof window.renderClientes === 'function') window.renderClientes();
                }

                // Abater do estoque físico na nuvem (serviço não abate)
                let alterouEstoque = false;
                for (let itemCart of pdvCart) {
                    if (itemCart.tipo !== 'servico') {
                        const estItem = estoque.find(p => p.id === itemCart.id);
                        if (estItem) {
                            estItem.qtd -= itemCart.qtd;
                            alterouEstoque = true;
                            // Update cloud stock
                            try {
                                await window.appwrite.databases.updateDocument(window.appwrite.DB_ID, window.appwrite.COL_ESTOQUE, estItem.id, {
                                    qtd: estItem.qtd
                                });
                            } catch (stockErr) {
                                console.warn('[PDV] Aviso ao sincronizar estoque na nuvem para', estItem.id, stockErr);
                            }
                        }
                    }
                }

                if (alterouEstoque) {
                    localStorage.setItem('avence_estoque', JSON.stringify(estoque));
                    if(typeof renderEstoque === 'function') renderEstoque();
                }
            } catch(err) {
                console.error(err);
                window.customAlert('Erro ao atualizar dados na nuvem: ' + err.message, 'warning');
                btnFinalizarVenda.innerHTML = btnText;
                btnFinalizarVenda.disabled = false;
                isFinalizandoVenda = false;
                return;
            }

            // Save items history for reports
            let historicoItens = JSON.parse(localStorage.getItem('avence_historico_vendas_itens')) || [];
            pdvCart.forEach(itemCart => {
                if (itemCart.tipo !== 'servico') {
                    historicoItens.push({
                        id: itemCart.id,
                        nome: itemCart.nome,
                        qtd: itemCart.qtd,
                        data: new Date().toISOString()
                    });
                }
            });
            localStorage.setItem('avence_historico_vendas_itens', JSON.stringify(historicoItens));

            // Cálculo do Total
            let subtotal = 0;
            pdvCart.forEach(item => { subtotal += item.venda * item.qtd; });
            
            const tipoDescontoEl = document.getElementById('pdv-tipo-desconto');
            const tipoDesconto = tipoDescontoEl ? tipoDescontoEl.value : 'rs';
            let descontoInputVal = parseFloat(pdvDescontoInput.value) || 0;
            let descontoValue = 0;
            if (tipoDesconto === 'perc') {
                descontoValue = subtotal * (descontoInputVal / 100);
            } else {
                descontoValue = descontoInputVal;
            }
            
            let baseTotal = subtotal - descontoValue;
            if (baseTotal < 0) baseTotal = 0;

            const formaPgtoEl = document.getElementById('pdv-forma-pgto');
            const formaPgto = formaPgtoEl ? formaPgtoEl.value : 'dinheiro';
            
            let jurosValor = 0;
            let finalTotal = baseTotal;
            
            if (formaPgto === 'credito_vista') {
                jurosValor = 0;
                finalTotal = baseTotal;
            } else if (formaPgto === 'credito_parcelado') {
                const parcelas = parseInt(document.getElementById('pdv-parcelas')?.value) || 2;
                const taxasMaquininha = {
                    2: 0.0570,
                    3: 0.0652,
                    4: 0.07355,
                    5: 0.0819,
                    6: 0.09033,
                    7: 0.09877,
                    8: 0.10733,
                    9: 0.11588,
                    10: 0.12444
                };
                jurosValor = baseTotal * (taxasMaquininha[parcelas] || 0);
                finalTotal = baseTotal + jurosValor;
            }

            // Preencher Recibo
            const reciboLojaNome = document.getElementById('recibo-loja-nome');
            if (reciboLojaNome) reciboLojaNome.textContent = window.lojaConfig?.nome || 'NOME DA LOJA';
            const reciboLojaEnd = document.getElementById('recibo-loja-end');
            if (reciboLojaEnd) reciboLojaEnd.textContent = window.lojaConfig?.endereco || '';
            const reciboLojaTel = document.getElementById('recibo-loja-tel');
            if (reciboLojaTel) reciboLojaTel.textContent = 'Tel: ' + (window.lojaConfig?.telefone || '');

            const reciboData = document.getElementById('recibo-data');
            if (reciboData) reciboData.textContent = new Date().toLocaleString('pt-BR');

            // Número sequencial da Venda / O.S. (iniciando em 0)
            let vendaSeq = 0;
            const savedVendaSeq = localStorage.getItem('avence_numero_venda_pdv');
            if (savedVendaSeq !== null && !isNaN(parseInt(savedVendaSeq))) {
                vendaSeq = parseInt(savedVendaSeq);
            } else {
                vendaSeq = 0;
            }

            const reciboNumero = document.getElementById('recibo-numero');
            if (reciboNumero) {
                reciboNumero.textContent = String(vendaSeq);
            }

            // Atualiza para o próximo sequencial
            localStorage.setItem('avence_numero_venda_pdv', String(vendaSeq + 1));

            const nomeVendedorUi = document.getElementById('pdv-vendedor')?.value.trim();
            const reciboVendedorNome = document.getElementById('recibo-vendedor');
            if (reciboVendedorNome) {
                reciboVendedorNome.textContent = nomeVendedorUi || 'Não informado';
            }
            const nomeCliente = document.getElementById('pdv-cliente-nome')?.value.trim();
            const docCliente = document.getElementById('pdv-cliente-doc')?.value.trim();
            const telCliente = document.getElementById('pdv-cliente-telefone')?.value.trim();
            const endCliente = document.getElementById('pdv-cliente-endereco')?.value.trim();
            
            const rInfo = document.getElementById('recibo-cliente-info');
            if (rInfo) {
                if (!nomeCliente && !docCliente && !telCliente && !endCliente) {
                    rInfo.style.display = 'none';
                } else {
                    rInfo.style.display = 'block';
                    const rNome = document.getElementById('recibo-cliente-nome');
                    const rDoc = document.getElementById('recibo-cliente-doc');
                    const rEnd = document.getElementById('recibo-cliente-end');
                    const rTel = document.getElementById('recibo-cliente-tel');
                    const rDocLinha = document.getElementById('recibo-cliente-doc-linha');
                    const rTelLinha = document.getElementById('recibo-cliente-tel-linha');
                    const rEndLinha = document.getElementById('recibo-cliente-end-linha');
                    
                    if (rNome) rNome.textContent = nomeCliente || 'Consumidor Final';
                    if (rDoc) rDoc.textContent = docCliente || '';
                    if (rTel) rTel.textContent = telCliente || '';
                    if (rEnd) rEnd.textContent = endCliente || '';

                    if (rDocLinha) rDocLinha.style.display = docCliente ? 'block' : 'none';
                    if (rTelLinha) rTelLinha.style.display = telCliente ? 'block' : 'none';
                    if (rEndLinha) rEndLinha.style.display = endCliente ? 'block' : 'none';
                }
            }

            const reciboItens = document.getElementById('recibo-itens');
            if (reciboItens) {
                reciboItens.innerHTML = '';
                pdvCart.forEach(item => {
                    const tr = document.createElement('tr');
                    const codTxt = item.ean ? `EAN: ${item.ean}` : `Cód: ${String(item.id || '').substring(0, 8)}`;
                    tr.innerHTML = `
                        <td style="word-break: break-word; padding: 4px 2px;">
                            <strong style="font-size: 11px;">${item.nome}</strong>
                            <div style="font-size: 9px; color: #444;">${codTxt}</div>
                        </td>
                        <td class="center" style="padding: 4px 2px; vertical-align: top; font-size: 11px;">${item.qtd}</td>
                        <td class="right" style="padding: 4px 2px; vertical-align: top; font-size: 11px; white-space: nowrap;">${formatMoney(item.venda)}</td>
                        <td class="right" style="padding: 4px 2px; vertical-align: top; font-size: 11px; white-space: nowrap;"><strong>${formatMoney(item.qtd * item.venda)}</strong></td>
                    `;
                    reciboItens.appendChild(tr);
                });
            }

            const reciboSubtotal = document.getElementById('recibo-subtotal');
            if (reciboSubtotal) reciboSubtotal.textContent = formatMoney(subtotal);
            const reciboDesconto = document.getElementById('recibo-desconto');
            if (reciboDesconto) reciboDesconto.textContent = formatMoney(descontoValue);
            
            const reciboJurosLinha = document.getElementById('recibo-juros-linha');
            const reciboJuros = document.getElementById('recibo-juros');
            if (jurosValor > 0 && reciboJurosLinha && reciboJuros) {
                reciboJurosLinha.style.display = 'flex';
                reciboJuros.textContent = formatMoney(jurosValor);
            } else if (reciboJurosLinha) {
                reciboJurosLinha.style.display = 'none';
            }
            
            const reciboTotalFinal = document.getElementById('recibo-total-final');
            if (reciboTotalFinal) reciboTotalFinal.textContent = formatMoney(finalTotal);
            
            const reciboFormaPgto = document.getElementById('recibo-forma-pgto');
            const reciboInfoExtra = document.getElementById('recibo-info-extra');
            let formaTexto = 'Dinheiro';
            let infoExtra = '';
            
            if (formaPgto === 'dinheiro') {
                formaTexto = 'Dinheiro';
                const valorRecebido = parseFloat(document.getElementById('pdv-valor-recebido')?.value) || 0;
                if (valorRecebido > finalTotal) {
                    infoExtra = `Valor Recebido: ${formatMoney(valorRecebido)} | Troco: ${formatMoney(valorRecebido - finalTotal)}`;
                }
            } else if (formaPgto === 'pix') {
                formaTexto = 'PIX';
            } else if (formaPgto === 'debito') {
                formaTexto = 'Cartão de Débito';
            } else if (formaPgto === 'credito_vista') {
                formaTexto = 'Crédito (À Vista)';
            } else if (formaPgto === 'credito_parcelado') {
                formaTexto = 'Crédito (Parcelado)';
                const parcelas = parseInt(document.getElementById('pdv-parcelas')?.value) || 2;
                infoExtra = `${parcelas}x de ${formatMoney(finalTotal / parcelas)}`;
            }
            
            if (reciboFormaPgto) reciboFormaPgto.textContent = 'Pagamento: ' + formaTexto;
            if (reciboInfoExtra) reciboInfoExtra.textContent = infoExtra;

            // Ocultar temporariamente outros elementos de impressão da OS
            const pReceipt = document.getElementById('print-receipt');
            const pDelivery = document.getElementById('print-delivery');
            if (pReceipt) { pReceipt.classList.remove('print-only'); pReceipt.style.display = 'none'; }
            if (pDelivery) { pDelivery.classList.remove('print-only'); pDelivery.style.display = 'none'; }

            // Chamar Impressão
            document.body.classList.add('printing-pdv');
            window.print();
            
            // Restaurar as visibilidades
            setTimeout(() => {
                document.body.classList.remove('printing-pdv');
                if (pReceipt) { pReceipt.classList.add('print-only'); pReceipt.style.display = ''; }
                if (pDelivery) { pDelivery.classList.add('print-only'); pDelivery.style.display = ''; }
            }, 1000);

            // Registrar no caixa se estiver aberto
            let motivoVenda = 'Venda PDV';
            // nomeCliente is already declared above
            if (nomeCliente) {
                motivoVenda += ` - Cliente: ${nomeCliente}`;
            }
            
            const nomeVendedor = document.getElementById('pdv-vendedor')?.value.trim() || window.loggedUser?.nome || 'Geral';
            if (nomeVendedor) {
                motivoVenda += ` - Vendedor: ${nomeVendedor}`;
            }

            // Checagem de segurança para caixa aberto no cloud/local
            if (!window.caixaAberto && (window.globalData?.config?.caixaAberto || localStorage.getItem('avence_caixa_aberto') === 'true')) {
                window.caixaAberto = true;
            }

            if (window.caixaAberto && window.registrarTransacaoCaixa) {
                await window.registrarTransacaoCaixa('entrada', finalTotal, motivoVenda, formaPgto, nomeVendedor, String(vendaSeq));
            } else if (!window.caixaAberto) {
                window.customAlert('Aviso: O caixa está FECHADO. A venda foi concluída mas não registrada no fluxo de caixa.', 'warning');
            }

            window.customAlert('Venda finalizada com sucesso! Estoque atualizado.', 'success');
            pdvCart = [];
            pdvDescontoInput.value = '0.00';
            if (document.getElementById('pdv-valor-recebido')) document.getElementById('pdv-valor-recebido').value = '';
            if (document.getElementById('pdv-cliente-nome')) document.getElementById('pdv-cliente-nome').value = '';
            if (document.getElementById('pdv-cliente-telefone')) document.getElementById('pdv-cliente-telefone').value = '';
            if (document.getElementById('pdv-cliente-doc')) document.getElementById('pdv-cliente-doc').value = '';
            if (document.getElementById('pdv-cliente-endereco')) document.getElementById('pdv-cliente-endereco').value = '';
            if (document.getElementById('pdv-cliente-id')) document.getElementById('pdv-cliente-id').value = '';
            
            renderPdvCart();
            
            btnFinalizarVenda.innerHTML = btnText;
            btnFinalizarVenda.disabled = false;
            isFinalizandoVenda = false;
        });
    }
