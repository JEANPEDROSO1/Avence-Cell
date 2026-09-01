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
                const idx = e.currentTarget.getAttribute('data-index');
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

    if (pdvSearch) {
        pdvSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const term = e.target.value.trim().toLowerCase();
                if (!term) return;

                // 1. Tentar EAN exato
                let produto = estoque.find(p => p.ean === term);
                
                // 2. Tentar EAN parcial (caso leitor corte) ou nome exato
                if (!produto) {
                    produto = estoque.find(p => (p.ean && p.ean.includes(term)) || p.nome.toLowerCase() === term);
                }
                
                // 3. Tentar busca parcial de nome (apenas se achar 1 resultado claro, senão alerta)
                if (!produto) {
                    const matches = estoque.filter(p => p.nome.toLowerCase().includes(term));
                    if (matches.length === 1) {
                        produto = matches[0];
                    } else if (matches.length > 1) {
                        window.customAlert('Múltiplos produtos encontrados. Digite o EAN ou nome mais específico.', 'warning');
                        return;
                    }
                }

                if (produto) {
                    // Verificar se já está no carrinho
                    const existIdx = pdvCart.findIndex(item => item.id === produto.id);
                    if (existIdx >= 0) {
                        pdvCart[existIdx].qtd++;
                    } else {
                        pdvCart.push({ ...produto, qtd: 1 });
                    }
                    pdvSearch.value = '';
                    pdvSearch.focus();
                    renderPdvCart();
                } else {
                    window.customAlert('Produto não encontrado no estoque.', 'warning');
                }
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

    if (btnFinalizarVenda) {
        btnFinalizarVenda.addEventListener('click', async () => {
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
                            await window.appwrite.databases.updateDocument(window.appwrite.DB_ID, window.appwrite.COL_ESTOQUE, estItem.id, {
                                qtd: estItem.qtd
                            });
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

            const reciboNumero = document.getElementById('recibo-numero');
            if (reciboNumero) reciboNumero.textContent = String(Math.floor(Math.random() * 100000)).padStart(6, '0');

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
                    if (rNome) rNome.textContent = nomeCliente || 'Consumidor Final';
                    if (rDoc) rDoc.textContent = docCliente || '';
                    if (rEnd) rEnd.textContent = endCliente || '';
                    if (rTel) rTel.textContent = telCliente || '';
                }
            }

            const reciboItens = document.getElementById('recibo-itens');
            if (reciboItens) {
                reciboItens.innerHTML = '';
                pdvCart.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${item.ean || String(item.id).substring(0, 5)}</td>
                        <td>${item.nome}</td>
                        <td class="center">Un</td>
                        <td class="right">${formatMoney(item.venda)}</td>
                        <td class="center">${item.qtd}</td>
                        <td class="right">0,00</td>
                        <td class="right">${formatMoney(item.qtd * item.venda)}</td>
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
            
            const nomeVendedor = document.getElementById('pdv-vendedor')?.value.trim();
            if (nomeVendedor) {
                motivoVenda += ` - Vendedor: ${nomeVendedor}`;
            }

            if (window.caixaAberto && window.registrarTransacaoCaixa) {
                await window.registrarTransacaoCaixa('entrada', finalTotal, motivoVenda, formaPgto);
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
        });
    }
