    // --- FINANCEIRO LOGIC ---
    let caixaAberto = JSON.parse(localStorage.getItem('avence_caixa_aberto')) || false;
    let fundoCaixa = parseFloat(localStorage.getItem('avence_fundo_caixa')) || 0;
    let transacoesCaixa = [];
    
    document.addEventListener('appwriteReady', () => {
        if (window.globalData && window.globalData.transacoes) {
            transacoesCaixa = window.globalData.transacoes;
            
            // Retroactive Fix: Convert any old divergence adjustments
            let hasFixedOldTransactions = false;
            transacoesCaixa.forEach(t => {
                if (t.motivo && t.motivo.includes('Ajuste de Caixa na Abertura (Divergência)')) {
                    if (t.tipo === 'saida') { t.tipo = 'info_furo'; hasFixedOldTransactions = true; }
                    if (t.tipo === 'entrada') { t.tipo = 'info_sobra'; hasFixedOldTransactions = true; }
                }
            });
            if (hasFixedOldTransactions) {
                // If it was local, we would save, but for Appwrite we might want to update documents.
                // Leaving as local sync for fallback.
                localStorage.setItem('avence_transacoes_caixa', JSON.stringify(transacoesCaixa));
            }
        }
        if (typeof renderFinanceiro === 'function') renderFinanceiro();
    });

    let financeiroChartInstance = null;

    const badgeStatus = document.getElementById('caixa-status-badge');
    const btnAbrirCaixa = document.getElementById('btn-abrir-caixa');
    const btnFecharCaixa = document.getElementById('btn-fechar-caixa');
    const btnSangria = document.getElementById('btn-sangria');

    const modalAbrirCaixa = document.getElementById('modal-abrir-caixa');
    const modalFecharCaixa = document.getElementById('modal-fechar-caixa');
    const modalSangria = document.getElementById('modal-sangria');

    // Tornar variável global para o checkout acessar
    window.caixaAberto = caixaAberto;

    function showToast(message) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        container.innerHTML = '';
        const toast = document.createElement('div');
        toast.style.cssText = 'background: #ef4444; color: white; padding: 16px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 12px; font-weight: bold; cursor: pointer;';
        toast.innerHTML = `<i class="ph ph-warning-circle" style="font-size: 24px;"></i> <span>${message}</span>`;
        toast.title = 'Clique para fechar';
        toast.addEventListener('click', () => toast.remove());
        container.appendChild(toast);
    }

    function renderFinanceiro() {
        if (caixaAberto) {
            if(badgeStatus) { badgeStatus.textContent = 'Caixa Aberto'; badgeStatus.style.background = '#22c55e'; }
            if(btnAbrirCaixa) btnAbrirCaixa.style.display = 'none';
            if(btnFecharCaixa) btnFecharCaixa.style.display = 'flex';
            if(btnSangria) btnSangria.style.display = 'flex';
        } else {
            if(badgeStatus) { badgeStatus.textContent = 'Caixa Fechado'; badgeStatus.style.background = '#ef4444'; }
            if(btnAbrirCaixa) btnAbrirCaixa.style.display = 'flex';
            if(btnFecharCaixa) btnFecharCaixa.style.display = 'none';
            if(btnSangria) btnSangria.style.display = 'none';
        }

        const hoje = new Date().toISOString().split('T')[0];
        let entradasHoje = 0;
        let entradasDinheiro = 0;
        let saidasHoje = 0;

        const transacoesHoje = transacoesCaixa.filter(t => t.data.startsWith(hoje));
        transacoesHoje.forEach(t => {
            const isDinheiro = (!t.formaPgto || t.formaPgto === 'dinheiro');
            if (t.tipo === 'entrada') {
                entradasHoje += t.valor;
                if (isDinheiro) entradasDinheiro += t.valor;
            }
            if (t.tipo === 'saida') saidasHoje += t.valor;
        });

        const saldoAtual = fundoCaixa + entradasDinheiro - saidasHoje;
        const projecaoMes = entradasHoje * 22; // Simplificado

        const elSaldo = document.getElementById('fin-saldo-atual');
        const elEntradas = document.getElementById('fin-entradas-hoje');
        const elSaidas = document.getElementById('fin-saidas-hoje');
        const elProjecao = document.getElementById('fin-projecao-mes');

        if(elSaldo) elSaldo.textContent = formatMoney(saldoAtual);
        if(elEntradas) elEntradas.textContent = formatMoney(entradasHoje);
        if(elSaidas) elSaidas.textContent = formatMoney(saidasHoje);
        if(elProjecao) elProjecao.textContent = formatMoney(projecaoMes);

        // Toast de limite excedido
        const limit = window.lojaConfig?.limiteCaixa || 0;
        const container = document.getElementById('toast-container');
        if (caixaAberto && limit > 0 && saldoAtual >= limit) {
            showToast(`ATENÇÃO: O caixa atingiu o limite de segurança (R$ ${limit.toFixed(2)}). É recomendado realizar uma sangria!`);
        } else if (container) {
            container.innerHTML = ''; // Limpa se o saldo voltar ao normal
        }

        const listaHist = document.getElementById('fin-historico-lista');
        if(listaHist) {
            listaHist.innerHTML = '';
            if (transacoesHoje.length === 0) {
                listaHist.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 20px;">Nenhuma movimentação hoje.</p>';
            } else {
                [...transacoesHoje].reverse().forEach(t => {
                    const div = document.createElement('div');
                    div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-dark); border-radius: 4px; border: 1px solid var(--border); cursor: pointer; transition: background 0.2s;';
                    div.addEventListener('mouseover', () => div.style.background = 'var(--bg-surface-light)');
                    div.addEventListener('mouseout', () => div.style.background = 'var(--bg-dark)');
                    const cor = (t.tipo === 'entrada' || t.tipo === 'info_sobra') ? '#22c55e' : '#ef4444';
                    const sinal = (t.tipo === 'entrada' || t.tipo === 'info_sobra') ? '+' : (t.tipo === 'saida' || t.tipo === 'info_furo' ? '-' : '');
                    const isDinheiro = (!t.formaPgto || t.formaPgto === 'dinheiro');
                    const labelForma = t.formaPgto && t.formaPgto !== 'dinheiro' ? ` (${t.formaPgto.toUpperCase()})` : '';
                    div.innerHTML = `
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: bold; font-size: 14px;">${t.motivo}${labelForma}</span>
                            <span style="font-size: 12px; color: var(--text-muted);">${new Date(t.data).toLocaleTimeString('pt-BR')}</span>
                        </div>
                        <span style="font-weight: bold; color: ${cor};">${sinal} ${formatMoney(t.valor)}</span>
                    `;
                    
                    div.addEventListener('click', () => {
                        const modalExcluir = document.getElementById('modal-excluir-transacao');
                        if (modalExcluir) {
                            document.getElementById('del-transacao-detalhes').innerHTML = `
                                <strong>${t.motivo}${labelForma}</strong><br>
                                <span style="color: ${cor}; font-weight: bold;">${sinal} ${formatMoney(t.valor)}</span><br>
                                <small style="color: var(--text-muted);">${new Date(t.data).toLocaleString('pt-BR')}</small>
                            `;
                            document.getElementById('del-transacao-data').value = t.data;
                            document.getElementById('del-transacao-senha').value = '';
                            openModal(modalExcluir);
                            setTimeout(() => {
                                const inputSenha = document.getElementById('del-transacao-senha');
                                if (inputSenha) inputSenha.focus();
                            }, 300);
                        }
                    });
                    listaHist.appendChild(div);
                });
            }
        }
        renderChart();
    }

    window.registrarTransacaoCaixa = async function(tipo, valor, motivo, formaPgto = 'dinheiro') {
        if(!caixaAberto) return false;
        
        const newTx = {
            tipo: tipo,
            valor: parseFloat(valor),
            motivo: motivo,
            formaPgto: formaPgto,
            data: new Date().toISOString()
        };
        
        try {
            const docId = window.appwrite.ID.unique();
            const created = await window.appwrite.databases.createDocument(window.appwrite.DB_ID, window.appwrite.COL_TRANS, docId, newTx);
            newTx.id = created.$id;
            transacoesCaixa.push(newTx);
            localStorage.setItem('avence_transacoes_caixa', JSON.stringify(transacoesCaixa));
            renderFinanceiro();
            return true;
        } catch(err) {
            console.error('Erro ao registrar transação na nuvem:', err);
            window.customAlert('Erro ao registrar transação financeira na nuvem: ' + err.message, 'warning');
            return false;
        }
    };

    function renderChart() {
        const canvas = document.getElementById('financeiroChart');
        if (!canvas) return;
        const labels = []; const dataEntradas = []; const dataSaidas = [];
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dataStr = d.toISOString().split('T')[0];
            labels.push(d.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}));
            
            let eDia = 0; let sDia = 0;
            transacoesCaixa.filter(t => t.data.startsWith(dataStr)).forEach(t => {
                if(t.tipo === 'entrada') eDia += t.valor;
                if(t.tipo === 'saida') sDia += t.valor;
            });
            dataEntradas.push(eDia);
            dataSaidas.push(sDia);
        }

        if (financeiroChartInstance) financeiroChartInstance.destroy();

        const ctx = canvas.getContext('2d');
        if(window.Chart) {
            financeiroChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Entradas', data: dataEntradas, backgroundColor: '#22c55e', borderRadius: 4 },
                        { label: 'Saídas', data: dataSaidas, backgroundColor: '#ef4444', borderRadius: 4 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#a1a1aa' } } },
                    scales: {
                        y: { ticks: { color: '#a1a1aa' }, grid: { color: '#3f3f46' } },
                        x: { ticks: { color: '#a1a1aa' }, grid: { color: '#3f3f46' } }
                    }
                }
            });
        }
    }

    if(btnAbrirCaixa) {
        btnAbrirCaixa.addEventListener('click', () => {
            const selectResp = document.getElementById('fin-abrir-responsavel');
            if (selectResp) {
                selectResp.innerHTML = '<option value="">Selecione o Responsável...</option>';
                if (window.colaboradores) {
                    window.colaboradores.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.id;
                        opt.textContent = `${c.nome} (${Array.isArray(c.cargo) ? c.cargo.join(', ') : c.cargo})`;
                        selectResp.appendChild(opt);
                    });
                }
            }
            const saldoInput = document.getElementById('fin-saldo-inicial');
            if (saldoInput) saldoInput.value = '';
            document.getElementById('fin-abrir-senha').value = '';
            openModal(modalAbrirCaixa);
            setTimeout(() => { 
                const selectResp = document.getElementById('fin-abrir-responsavel');
                if(selectResp) selectResp.focus(); 
            }, 300);
        });
    }

    const finAbrirRespInput = document.getElementById('fin-abrir-responsavel');
    if (finAbrirRespInput) {
        finAbrirRespInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const saldoInicial = document.getElementById('fin-saldo-inicial');
                if (saldoInicial) { saldoInicial.focus(); saldoInicial.select(); }
            }
        });
    }

    const finSaldoInicialInput = document.getElementById('fin-saldo-inicial');
    if (finSaldoInicialInput) {
        finSaldoInicialInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const senhaAbrir = document.getElementById('fin-abrir-senha');
                if (senhaAbrir) senhaAbrir.focus();
            }
        });
    }

    const senhaAbrirInput = document.getElementById('fin-abrir-senha');
    if (senhaAbrirInput) {
        senhaAbrirInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if(typeof window.processarAberturaCaixa === 'function') {
                    window.processarAberturaCaixa();
                }
            }
        });
    }

    if(btnSangria) {
        btnSangria.addEventListener('click', () => {
            const selectResp = document.getElementById('fin-mov-responsavel');
            if (selectResp) {
                selectResp.innerHTML = '<option value="">Selecione o Responsável...</option>';
                if (window.colaboradores) {
                    window.colaboradores.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.id;
                        opt.textContent = `${c.nome} (${Array.isArray(c.cargo) ? c.cargo.join(', ') : c.cargo})`;
                        selectResp.appendChild(opt);
                    });
                }
            }
            openModal(modalSangria);
        });
    }
    if(btnFecharCaixa) btnFecharCaixa.addEventListener('click', () => {
        const hoje = new Date().toISOString().split('T')[0];
        let entradasDinheiro = 0; let saidas = 0;
        transacoesCaixa.filter(t => t.data.startsWith(hoje)).forEach(t => {
            const isDinheiro = (!t.formaPgto || t.formaPgto === 'dinheiro');
            if(t.tipo === 'entrada' && isDinheiro) entradasDinheiro += t.valor;
            if(t.tipo === 'saida') saidas += t.valor;
        });
        document.getElementById('resumo-fundo-caixa').textContent = formatMoney(fundoCaixa);
        document.getElementById('resumo-entradas-caixa').textContent = formatMoney(entradasDinheiro);
        document.getElementById('resumo-saidas-caixa').textContent = formatMoney(saidas);
        
        window.saldoEsperadoFechamento = fundoCaixa + entradasDinheiro - saidas;
        document.getElementById('resumo-saldo-esperado').textContent = formatMoney(window.saldoEsperadoFechamento);
        
        const inputInformado = document.getElementById('fin-valor-informado');
        if (inputInformado) inputInformado.value = '';
        const lblDiff = document.getElementById('fin-diferenca-caixa');
        if (lblDiff) lblDiff.style.display = 'none';
        
        
        const selectFecharResp = document.getElementById('fin-fechar-responsavel');
        if (selectFecharResp && window.colaboradores) {
            selectFecharResp.innerHTML = '<option value="">Selecione o Responsável...</option>';
            window.colaboradores.forEach(c => {
                const cargos = Array.isArray(c.cargo) ? c.cargo : [c.cargo];
                if (cargos.includes('Dono') || cargos.includes('Gerente')) {
                    const opt = document.createElement('option');
                    opt.value = c.nome;
                    opt.textContent = `${c.nome} (${cargos.join(', ')})`;
                    selectFecharResp.appendChild(opt);
                }
            });
        }

        openModal(modalFecharCaixa);
        setTimeout(() => { if (inputInformado) inputInformado.focus(); }, 300);
    });
    
    const inputValorInformado = document.getElementById('fin-valor-informado');
    const labelDiferenca = document.getElementById('fin-diferenca-caixa');

    if (inputValorInformado) {
        inputValorInformado.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const respSelect = document.getElementById('fin-fechar-responsavel');
                if (respSelect) respSelect.focus();
            }
        });
    }

    
    const finFecharRespInput = document.getElementById('fin-fechar-responsavel');
    if (finFecharRespInput) {
        finFecharRespInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const senhaFechar = document.getElementById('fin-senha-fechar');
                if (senhaFechar) senhaFechar.focus();
            }
        });
    }

    const senhaFecharInput = document.getElementById('fin-senha-fechar');
    if (senhaFecharInput) {
        senhaFecharInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (typeof window.processarFechamentoCaixa === 'function') {
                    window.processarFechamentoCaixa();
                }
            }
        });
    }

    if (inputValorInformado && labelDiferenca) {
        inputValorInformado.addEventListener('input', (e) => {
            const informado = parseFloat(e.target.value);
            if (isNaN(informado)) {
                labelDiferenca.style.display = 'none';
                return;
            }
            const diff = informado - window.saldoEsperadoFechamento;
            labelDiferenca.style.display = 'block';
            if (Math.abs(diff) < 0.01) {
                labelDiferenca.textContent = 'Caixa Batido (Sem diferença)';
                labelDiferenca.style.color = '#22c55e'; // verde
            } else if (diff < 0) {
                labelDiferenca.textContent = `Furo de Caixa: ${formatMoney(diff)}`;
                labelDiferenca.style.color = '#ef4444'; // vermelho
            } else {
                labelDiferenca.textContent = `Sobra em Caixa: +${formatMoney(diff)}`;
                labelDiferenca.style.color = '#3b82f6'; // azul
            }
        });
    }

    window.processarAberturaCaixa = function() {
        const responsavelId = document.getElementById('fin-abrir-responsavel') ? document.getElementById('fin-abrir-responsavel').value : '';
        if (!responsavelId) { window.customAlert('Selecione quem está abrindo o caixa.', 'warning'); return; }
        
        const colabResp = window.colaboradores.find(c => c.id === responsavelId);
        if (!colabResp) return;
        
        const senhaInput = document.getElementById('fin-abrir-senha').value;
        if (senhaInput !== colabResp.senhaLogin && senhaInput !== colabResp.senhaRetirada && senhaInput !== window.lojaConfig.senhaGerente) {
            window.customAlert('Senha incorreta para o colaborador selecionado!', 'warning');
            return;
        }

        const input = document.getElementById('fin-saldo-inicial');
        const novoFundo = parseFloat(input.value) || 0;
        
        // Check divergence
        let ultimoFechamentoStr = localStorage.getItem('avence_ultimo_fechamento');
        if (ultimoFechamentoStr) {
            const ultimoFechamento = JSON.parse(ultimoFechamentoStr);
            const diff = novoFundo - ultimoFechamento.valorFechado;
            
            if (Math.abs(diff) > 0.01) {
                const details = document.getElementById('div-divergencia-detalhes');
                if (details) {
                    details.innerHTML = `
                        <strong>Fechamento Anterior:</strong> R$ ${ultimoFechamento.valorFechado.toFixed(2)} (por ${ultimoFechamento.responsavel})<br>
                        <strong>Abertura Atual:</strong> R$ ${novoFundo.toFixed(2)}<br><br>
                        <span style="font-weight: bold; font-size: 16px; color: ${diff < 0 ? '#ef4444' : '#3b82f6'};">
                            Diferença: ${diff < 0 ? 'Furo de ' : 'Sobra de '} R$ ${Math.abs(diff).toFixed(2)}
                        </span>
                    `;
                }
                
                const modalDivergencia = document.getElementById('modal-divergencia-caixa');
                if (modalDivergencia) {
                    modalDivergencia.dataset.novoFundo = novoFundo;
                    modalDivergencia.dataset.diff = diff;
                    modalDivergencia.dataset.responsavelNome = colabResp.nome;
                    modalDivergencia.dataset.responsavelId = colabResp.id;
                    document.getElementById('fin-divergencia-senha').value = '';
                    closeModal(modalAbrirCaixa);
                    openModal(modalDivergencia);
                    return;
                }
            }
        }

        efetivarAberturaCaixa(novoFundo, colabResp.id);
        closeModal(modalAbrirCaixa);
        window.customAlert('Caixa aberto com sucesso!', 'success');
    };

    const btnConfAbrir = document.getElementById('btn-confirmar-abrir-caixa');
    if(btnConfAbrir) {
        btnConfAbrir.addEventListener('click', window.processarAberturaCaixa);
    }

    function efetivarAberturaCaixa(valor, responsavelId) {
        fundoCaixa = valor;
        caixaAberto = true; window.caixaAberto = true;
        localStorage.setItem('avence_fundo_caixa', fundoCaixa);
        localStorage.setItem('avence_caixa_aberto', JSON.stringify(true));
        if (responsavelId) localStorage.setItem('avence_abertura_responsavel', responsavelId);
        if (typeof window.updateVendedorDropdowns === 'function') window.updateVendedorDropdowns();
        renderFinanceiro();
    }

    const btnConfirmarDivergencia = document.getElementById('btn-confirmar-divergencia');
    if (btnConfirmarDivergencia) {
        btnConfirmarDivergencia.addEventListener('click', async () => {
            const modalDivergencia = document.getElementById('modal-divergencia-caixa');
            const responsavelId = modalDivergencia.dataset.responsavelId;
            const responsavelNome = modalDivergencia.dataset.responsavelNome;
            const novoFundo = parseFloat(modalDivergencia.dataset.novoFundo);
            const diff = parseFloat(modalDivergencia.dataset.diff);
            
            const colabResp = window.colaboradores.find(c => c.id === responsavelId);
            const senhaInput = document.getElementById('fin-divergencia-senha').value;
            
            if (senhaInput !== colabResp.senhaLogin && senhaInput !== colabResp.senhaRetirada && senhaInput !== window.lojaConfig.senhaGerente) {
                window.customAlert('Senha incorreta!', 'warning');
                return;
            }
            
            efetivarAberturaCaixa(novoFundo, responsavelId);
            
            const tipo = diff < 0 ? 'info_furo' : 'info_sobra';
            const motivo = `Ajuste de Caixa na Abertura (Divergência) - Resp: ${responsavelNome}`;
            await window.registrarTransacaoCaixa(tipo, Math.abs(diff), motivo);
            
            document.getElementById('fin-divergencia-senha').value = '';
            closeModal(modalDivergencia);
            window.customAlert('Caixa aberto com divergência registrada.', 'success');
        });
    }

    const btnConfExcluir = document.getElementById('btn-confirmar-excluir-transacao');
    if (btnConfExcluir) {
        btnConfExcluir.addEventListener('click', async () => {
            const dataTarget = document.getElementById('del-transacao-data').value;
            const senhaInput = document.getElementById('del-transacao-senha').value;
            
            const isMaster = (senhaInput === window.lojaConfig.senhaGerente);
            const hasColab = window.colaboradores.some(c => c.senhaRetirada && c.senhaRetirada === senhaInput && ((Array.isArray(c.cargo) ? c.cargo : [c.cargo]).includes('Dono') || (Array.isArray(c.cargo) ? c.cargo : [c.cargo]).includes('Gerente')));
            
            if (!isMaster && !hasColab) {
                window.customAlert('Senha incorreta ou sem permissão para exclusão!', 'warning');
                return;
            }
            
            const index = transacoesCaixa.findIndex(t => t.data === dataTarget);
            if (index > -1) {
                try {
                    const txId = transacoesCaixa[index].id;
                    if(txId) {
                        await window.appwrite.databases.deleteDocument(window.appwrite.DB_ID, window.appwrite.COL_TRANS, txId);
                    }
                    transacoesCaixa.splice(index, 1);
                    localStorage.setItem('avence_transacoes_caixa', JSON.stringify(transacoesCaixa));
                    
                    closeModal(document.getElementById('modal-excluir-transacao'));
                    window.customAlert('Movimentação excluída com sucesso.', 'success');
                    renderFinanceiro();
                } catch(err) {
                    console.error('Erro ao excluir:', err);
                    window.customAlert('Erro ao excluir transação na nuvem.', 'warning');
                }
            } else {
                window.customAlert('Transação não encontrada.', 'warning');
            }
        });
    }

    const delSenhaInput = document.getElementById('del-transacao-senha');
    if (delSenhaInput) {
        delSenhaInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if(btnConfExcluir) btnConfExcluir.click();
            }
        });
    }

    const btnConfSangria = document.getElementById('btn-confirmar-sangria');
    if(btnConfSangria) {
        btnConfSangria.addEventListener('click', async () => {
            const responsavelId = document.getElementById('fin-mov-responsavel') ? document.getElementById('fin-mov-responsavel').value : '';
            if (!responsavelId) { window.customAlert('Selecione quem é o Responsável/Destinatário.', 'warning'); return; }
            
            const colabResp = window.colaboradores.find(c => c.id === responsavelId);
            if (!colabResp) return;

            const senhaInput = document.getElementById('fin-senha-sangria').value;
            const isMaster = (senhaInput === window.lojaConfig.senhaGerente);
            
            if (!isMaster) {
                if (!colabResp.senhaRetirada || colabResp.senhaRetirada !== senhaInput) {
                    window.customAlert('Senha incorreta para o responsável selecionado ou sem permissão de retirada!', 'warning');
                    return;
                }
            }

            const tipo = document.querySelector('input[name="tipo_movimentacao"]:checked').value;
            const valor = parseFloat(document.getElementById('fin-mov-valor').value);
            const motivoBase = document.getElementById('fin-mov-motivo').value.trim();
            const responsavelNome = colabResp.nome;

            if (!valor || valor <= 0) { window.customAlert('Valor inválido', 'warning'); return; }
            if (!motivoBase) { window.customAlert('Informe o motivo da movimentação.', 'warning'); return; }

            const motivoFinal = `${motivoBase} (Destinatário/Resp: ${responsavelNome})`;

            // Validate balance for Sangria (Saída)
            if (tipo === 'saida') {
                const hojeStr = new Date().toISOString().split('T')[0];
                const transacoesHoje = transacoesCaixa.filter(t => t.data.startsWith(hojeStr));
                let entradasDinheiro = 0;
                let saidas = 0;
                transacoesHoje.forEach(t => {
                    const isDinheiro = (!t.formaPgto || t.formaPgto === 'dinheiro');
                    if (t.tipo === 'entrada' && isDinheiro) entradasDinheiro += t.valor;
                    if (t.tipo === 'saida') saidas += t.valor;
                });
                const saldoAtual = fundoCaixa + entradasDinheiro - saidas;
                
                const limiteRetirada = Math.max(0, saldoAtual - 100);
                if (valor > limiteRetirada) {
                    window.customAlert(`Atenção: É obrigatório manter um fundo de R$ 100,00 no caixa.<br>Saldo disponível para retirada: <strong>${formatMoney(limiteRetirada)}</strong>`, 'warning');
                    return;
                }
            }

            await window.registrarTransacaoCaixa(tipo, valor, motivoFinal);
            document.getElementById('fin-mov-valor').value = '';
            document.getElementById('fin-mov-motivo').value = '';
            if (document.getElementById('fin-mov-responsavel')) document.getElementById('fin-mov-responsavel').value = '';
            document.getElementById('fin-senha-sangria').value = '';
            closeModal(modalSangria);
            window.customAlert('Movimentação registrada com sucesso!', 'success');
        });
    }

    window.processarFechamentoCaixa = async function() {
        const informadoStr = document.getElementById('fin-valor-informado').value;
        if (informadoStr === '') {
            window.customAlert('Por favor, informe o valor contado na gaveta.', 'warning');
            return;
        }
        
        const responsavelNome = document.getElementById('fin-fechar-responsavel') ? document.getElementById('fin-fechar-responsavel').value : '';
        if (!responsavelNome) {
            window.customAlert('Selecione quem está fechando o caixa.', 'warning');
            return;
        }
        
        const colabResp = window.colaboradores.find(c => c.nome === responsavelNome);
        
        const senhaInput = document.getElementById('fin-senha-fechar').value;
        const isMaster = (senhaInput === window.lojaConfig.senhaGerente);
        
        if (!isMaster) {
            if (!colabResp || !colabResp.senhaRetirada || colabResp.senhaRetirada !== senhaInput) {
                window.customAlert('Senha incorreta para o colaborador selecionado!', 'warning');
                return;
            }
        }

        caixaAberto = false; window.caixaAberto = false;
        fundoCaixa = 0;
        
        const nomeFechamento = (isMaster && !colabResp) ? 'Administrador/Dono' : responsavelNome;
        const fechamentoData = {
            valorFechado: parseFloat(informadoStr) || 0,
            responsavel: nomeFechamento,
            data: new Date().toISOString()
        };
        
        try {
            const docId = window.appwrite.ID.unique();
            const created = await window.appwrite.databases.createDocument(window.appwrite.DB_ID, window.appwrite.COL_CAIXA, docId, fechamentoData);
            if (!window.globalData) window.globalData = {};
            if (!window.globalData.fechamentos) window.globalData.fechamentos = [];
            window.globalData.fechamentos.push({...fechamentoData, id: created.$id});
        } catch(err) {
            console.error('Erro ao registrar fechamento:', err);
        }
        
        localStorage.setItem('avence_ultimo_fechamento', JSON.stringify(fechamentoData));
        
        localStorage.setItem('avence_caixa_aberto', JSON.stringify(false));
        localStorage.setItem('avence_fundo_caixa', 0);
        localStorage.removeItem('avence_abertura_responsavel');
        
        document.getElementById('fin-senha-fechar').value = '';
        closeModal(modalFecharCaixa);
        renderFinanceiro();
        
        window.customAlert('E-mail de fechamento sendo enviado...', 'success');
        setTimeout(() => {
            window.customAlert('Caixa fechado! E-mail com valores do dia enviado com sucesso.', 'success');
        }, 2500);
    };

    const btnConfFechar = document.getElementById('btn-confirmar-fechar-caixa');
    if(btnConfFechar) {
        btnConfFechar.addEventListener('click', window.processarFechamentoCaixa);
    }

    // ============================================
    // Configurações & Colaboradores
    // ============================================

    // Tabs Logic
    const configTabBtns = document.querySelectorAll('.config-tab-btn');
    const configTabContents = document.querySelectorAll('.config-tab-content');
    
    // Restore last config tab
    const lastConfigTab = localStorage.getItem('avence_last_config_tab');

    configTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            configTabBtns.forEach(b => {
                b.classList.remove('active');
                b.style.borderBottomColor = 'transparent';
                b.style.color = 'var(--text-muted)';
            });
            configTabContents.forEach(c => c.style.display = 'none');
            
            btn.classList.add('active');
            btn.style.borderBottomColor = 'var(--primary)';
            btn.style.color = 'var(--text-main)';
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).style.display = 'block';
            localStorage.setItem('avence_last_config_tab', targetId);
        });
    });

    if (lastConfigTab) {
        const lastBtn = document.querySelector(`.config-tab-btn[data-target="${lastConfigTab}"]`);
        if (lastBtn) {
            // Trigger click visually and functionally
            lastBtn.click();
        }
    }

    // CRUD Estoque Tipos (Categorias)
    let customEstoqueTipos = JSON.parse(localStorage.getItem('avence_tipos_estoque')) || [];

    function renderCustomEstoqueTipos() {
        const lista = document.getElementById('lista-tipos-estoque');
        if (!lista) return;
        lista.innerHTML = '';
        
        // Render Default Types
        const defaultTypes = [
            'Produto Físico',
            'Serviço / Mão de Obra',
            'Peça p/ Manutenção',
            'PC Montado (KIT)'
        ];
        
        defaultTypes.forEach(tipo => {
            const tr = document.createElement('tr');
            tr.style.background = 'var(--bg-surface-light)';
            tr.innerHTML = `
                <td style="padding: 10px; border-bottom: 1px solid var(--border); font-weight: 500;">${tipo}</td>
                <td style="padding: 10px; text-align: center; border-bottom: 1px solid var(--border);">
                    <button type="button" class="btn btn-secondary" disabled style="padding: 4px; color: var(--text-muted); opacity: 0.5; cursor: not-allowed;" title="Categoria padrão não pode ser excluída"><i class="ph ph-lock"></i></button>
                </td>
            `;
            lista.appendChild(tr);
        });

        // Render Custom Types
        customEstoqueTipos.forEach((tipo, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 10px; border-bottom: 1px solid var(--border);">${tipo}</td>
                <td style="padding: 10px; text-align: center; border-bottom: 1px solid var(--border);">
                    <button type="button" class="btn btn-secondary btn-del-tipo" data-index="${index}" style="padding: 4px; color: #ef4444;" title="Excluir Categoria"><i class="ph ph-trash"></i></button>
                </td>
            `;
            lista.appendChild(tr);
        });
        
        document.querySelectorAll('.btn-del-tipo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                customEstoqueTipos.splice(idx, 1);
                localStorage.setItem('avence_tipos_estoque', JSON.stringify(customEstoqueTipos));
                renderCustomEstoqueTipos();
                updateProductTypesDropdown();
            });
        });
    }

    function updateProductTypesDropdown() {
        const select = document.getElementById('p_tipo');
        if (!select) return;
        
        // Preserve original options
        const originalOptions = `
            <option value="produto">Produto Físico</option>
            <option value="servico">Serviço / Mão de Obra</option>
            <option value="peca">Peça p/ Manutenção</option>
            <option value="pc_montado">PC Montado (KIT)</option>
        `;
        select.innerHTML = originalOptions;
        
        // Append custom options
        customEstoqueTipos.forEach(tipo => {
            const opt = document.createElement('option');
            // Create a safe value string
            const safeVal = 'custom_' + tipo.toLowerCase().replace(/[^a-z0-9]/g, '_');
            opt.value = safeVal;
            opt.textContent = tipo;
            select.appendChild(opt);
        });
    }

    const btnAddTipoEstoque = document.getElementById('btn-add-tipo-estoque');
    if (btnAddTipoEstoque) {
        btnAddTipoEstoque.addEventListener('click', () => {
            const input = document.getElementById('config-novo-tipo');
            const val = input.value.trim();
            if (val) {
                // Check for duplicates
                if (customEstoqueTipos.find(t => t.toLowerCase() === val.toLowerCase())) {
                    window.customAlert('Esta categoria já existe!', 'warning');
                    return;
                }
                customEstoqueTipos.push(val);
                localStorage.setItem('avence_tipos_estoque', JSON.stringify(customEstoqueTipos));
                input.value = '';
                renderCustomEstoqueTipos();
                updateProductTypesDropdown();
            }
        });
    }

    // Initial render
    renderCustomEstoqueTipos();
    updateProductTypesDropdown();

    // CRUD Colaboradores
    window.colaboradores = [];
    window.pontos = [];
    
    document.addEventListener('appwriteReady', () => {
        if(window.globalData && window.globalData.colaboradores) {
            window.colaboradores = window.globalData.colaboradores;
            localStorage.setItem('avence_colaboradores', JSON.stringify(window.colaboradores));
        }
        if(window.globalData && window.globalData.pontos) {
            window.pontos = window.globalData.pontos;
            localStorage.setItem('avence_pontos', JSON.stringify(window.pontos));
        }
        if(typeof window.renderColaboradores === 'function') window.renderColaboradores();
    });
    let editingColabId = null;

    window.renderColaboradores = function() {
        const lista = document.getElementById('lista-colaboradores');
        if (!lista) return;
        lista.innerHTML = '';
        if (window.colaboradores.length === 0) {
            lista.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nenhum colaborador cadastrado.</p>';
        } else {
            window.colaboradores.forEach(c => {
                const item = document.createElement('div');
                item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-surface-light); border: 1px solid var(--border); border-radius: 4px; margin-bottom: 8px;';
                const fotoHTML = c.foto ? `<img src="${c.foto}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` : `<div style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-dark); display: flex; align-items: center; justify-content: center;"><i class="ph ph-user"></i></div>`;
                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${fotoHTML}
                        <div>
                            <div style="font-weight: bold; font-size: 14px;">${c.nome}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">${Array.isArray(c.cargo) ? c.cargo.join(', ') : c.cargo}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" class="btn btn-secondary btn-edit-colab" data-id="${c.id}" style="padding: 4px 8px;"><i class="ph ph-pencil"></i></button>
                        <button type="button" class="btn btn-secondary btn-del-colab" data-id="${c.id}" style="padding: 4px 8px; color: #ef4444;"><i class="ph ph-trash"></i></button>
                    </div>
                `;
                lista.appendChild(item);
            });
            
            document.querySelectorAll('.btn-edit-colab').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    editColaborador(id);
                });
            });
            document.querySelectorAll('.btn-del-colab').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    if(confirm('Tem certeza que deseja remover este colaborador?')) {
                        try {
                            await window.appwrite.databases.deleteDocument(window.appwrite.DB_ID, window.appwrite.COL_COLABS, id);
                            window.colaboradores = window.colaboradores.filter(c => c.id !== id);
                            localStorage.setItem('avence_colaboradores', JSON.stringify(window.colaboradores));
                            if(typeof window.updateTecnicoDropdowns === 'function') window.updateTecnicoDropdowns();
                            if(typeof window.updateVendedorDropdowns === 'function') window.updateVendedorDropdowns();
                            window.renderColaboradores();
                        } catch(err) {
                            console.error(err);
                            window.customAlert('Erro ao excluir colaborador na nuvem.', 'warning');
                        }
                    }
                });
            });
        }
        
        // Render Ponto
        const listaPonto = document.getElementById('lista-ponto');
        if (listaPonto) {
            listaPonto.innerHTML = '';
            const recentes = window.pontos.slice().reverse().slice(0, 10);
            if (recentes.length === 0) {
                listaPonto.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nenhum registro de ponto ainda.</p>';
            } else {
                recentes.forEach(p => {
                    const el = document.createElement('div');
                    el.style.cssText = 'display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid var(--border);';
                    el.innerHTML = `<span><i class="ph ph-user"></i> ${p.nome}</span> <span>${new Date(p.data).toLocaleString('pt-BR')}</span>`;
                    listaPonto.appendChild(el);
                });
            }
        }
    };

    const btnAddColab = document.getElementById('btn-add-colab');
    if (btnAddColab) {
        btnAddColab.addEventListener('click', () => {
            editingColabId = null;
            document.getElementById('colab-form-title').textContent = 'Novo Colaborador';
            document.getElementById('colab-nome').value = '';
            document.querySelectorAll('.cargo-check').forEach(cb => cb.checked = false);
            const vendCb = document.querySelector('.cargo-check[value="Vendedor"]');
            if(vendCb) vendCb.checked = true;
            document.getElementById('colab-senha-login').value = '';
            document.getElementById('colab-senha-retirada').value = '';
            if(document.getElementById('colab-comissao-vendas')) document.getElementById('colab-comissao-vendas').value = '5';
            if(document.getElementById('colab-comissao-servicos')) document.getElementById('colab-comissao-servicos').value = '10';
            document.getElementById('colab-foto-preview').style.backgroundImage = 'none';
            document.getElementById('colab-foto-preview').innerHTML = '<i class="ph ph-user" style="font-size: 32px; color: var(--text-muted);"></i>';
            document.getElementById('colab-foto-preview').dataset.base64 = '';
            openModal(document.getElementById('modal-colaborador'));
        });
    }

    const btnCancelColab = document.getElementById('btn-cancel-colab');
    if (btnCancelColab) {
        btnCancelColab.addEventListener('click', () => {
            closeModal(document.getElementById('modal-colaborador'));
        });
    }

    const fotoInput = document.getElementById('colab-foto');
    if (fotoInput) {
        fotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const base64 = evt.target.result;
                    const preview = document.getElementById('colab-foto-preview');
                    preview.style.backgroundImage = `url(${base64})`;
                    preview.innerHTML = '';
                    preview.dataset.base64 = base64;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const btnSaveColab = document.getElementById('btn-save-colab');
    if (btnSaveColab) {
        btnSaveColab.addEventListener('click', async () => {
            const nome = document.getElementById('colab-nome').value.trim();
            const cargoNodes = document.querySelectorAll('.cargo-check:checked');
            const cargo = Array.from(cargoNodes).map(cb => cb.value);
            if (cargo.length === 0) {
                window.customAlert('Selecione pelo menos um cargo.', 'warning');
                return;
            }
            const senhaLogin = document.getElementById('colab-senha-login').value.trim();
            const senhaRetirada = document.getElementById('colab-senha-retirada').value.trim();
            const comissaoVendas = document.getElementById('colab-comissao-vendas') ? document.getElementById('colab-comissao-vendas').value : '5';
            const comissaoServicos = document.getElementById('colab-comissao-servicos') ? document.getElementById('colab-comissao-servicos').value : '10';
            const fotoBase64 = document.getElementById('colab-foto-preview').dataset.base64 || '';

            if (!nome || !senhaLogin) {
                window.customAlert('Preencha Nome e Senha de Login.', 'warning');
                return;
            }

            const btnText = btnSaveColab.innerHTML;
            btnSaveColab.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
            btnSaveColab.disabled = true;

            try {
                if (editingColabId) {
                    const updateData = { nome, cargo: cargo.join(', '), senhaLogin, senha: senhaLogin, senhaRetirada, comissaoVendas, comissaoServicos };
                    if(fotoBase64) updateData.foto = fotoBase64;
                    
                    await window.appwrite.databases.updateDocument(window.appwrite.DB_ID, window.appwrite.COL_COLABS, editingColabId, updateData);
                    
                    const colab = window.colaboradores.find(c => c.id === editingColabId);
                    if (colab) {
                        Object.assign(colab, updateData);
                    }
                } else {
                    const novoData = { nome, cargo: cargo.join(', '), senhaLogin, senha: senhaLogin, senhaRetirada, comissaoVendas, comissaoServicos, foto: fotoBase64 };
                    const docId = window.appwrite.ID.unique();
                    const created = await window.appwrite.databases.createDocument(window.appwrite.DB_ID, window.appwrite.COL_COLABS, docId, novoData);
                    novoData.id = created.$id;
                    window.colaboradores.push(novoData);
                }

                localStorage.setItem('avence_colaboradores', JSON.stringify(window.colaboradores));
                if(typeof window.updateTecnicoDropdowns === 'function') window.updateTecnicoDropdowns();
                if(typeof window.updateVendedorDropdowns === 'function') window.updateVendedorDropdowns();
                closeModal(document.getElementById('modal-colaborador'));
                window.renderColaboradores();
                window.customAlert('Colaborador salvo com sucesso!', 'success');
            } catch(err) {
                console.error(err);
                window.customAlert('Erro ao salvar colaborador na nuvem: ' + err.message, 'warning');
            }
            
            btnSaveColab.innerHTML = btnText;
            btnSaveColab.disabled = false;
        });
    }

    function editColaborador(id) {
        const colab = window.colaboradores.find(c => c.id === id);
        if (!colab) return;
        editingColabId = colab.id;
        document.getElementById('colab-form-title').textContent = 'Editar Colaborador';
        document.getElementById('colab-nome').value = colab.nome;
        document.querySelectorAll('.cargo-check').forEach(cb => cb.checked = false);
        const colabCargos = Array.isArray(colab.cargo) ? colab.cargo : (typeof colab.cargo === 'string' ? colab.cargo.split(',').map(s => s.trim()) : [colab.cargo]);
        colabCargos.forEach(c => {
            const cb = document.querySelector(`.cargo-check[value="${c}"]`);
            if(cb) cb.checked = true;
        });
        document.getElementById('colab-senha-login').value = colab.senhaLogin;
        document.getElementById('colab-senha-retirada').value = colab.senhaRetirada;
        if(document.getElementById('colab-comissao-vendas')) document.getElementById('colab-comissao-vendas').value = colab.comissaoVendas || '5';
        if(document.getElementById('colab-comissao-servicos')) document.getElementById('colab-comissao-servicos').value = colab.comissaoServicos || '10';
        
        const preview = document.getElementById('colab-foto-preview');
        if (colab.foto) {
            preview.style.backgroundImage = `url(${colab.foto})`;
            preview.innerHTML = '';
            preview.dataset.base64 = colab.foto;
        } else {
            preview.style.backgroundImage = 'none';
            preview.innerHTML = '<i class="ph ph-user" style="font-size: 32px; color: var(--text-muted);"></i>';
            preview.dataset.base64 = '';
        }
        openModal(document.getElementById('modal-colaborador'));
    }

    // Evento de abrir modal de configuração
    const btnConfig = document.getElementById('btn-config');
    const modalConfig = document.getElementById('modal-configuracoes');
    if (btnConfig && modalConfig) {
        btnConfig.addEventListener('click', () => {
            const config = window.lojaConfig || {};
            
            if (document.getElementById('config-loja')) document.getElementById('config-loja').value = config.nome || 'Avence Cell';
            if (document.getElementById('config-telefone')) document.getElementById('config-telefone').value = config.telefone || '(43) 9900-4377';
            if (document.getElementById('config-endereco')) document.getElementById('config-endereco').value = config.endereco || 'RUA SANTA CATARINA - 35, IVAIPORA-PR';
            if (document.getElementById('config-email')) document.getElementById('config-email').value = config.email || 'contato@avencecell.com';
            if (document.getElementById('config-email-relatorio')) document.getElementById('config-email-relatorio').value = config.emailRelatorio || '';
            if (document.getElementById('config-tecnico')) document.getElementById('config-tecnico').value = config.tecnico ? config.tecnico : 'Não definido';
            if (document.getElementById('config-tema')) document.getElementById('config-tema').value = config.tema || 'dark';
            
            const limitEl = document.getElementById('config-limite-caixa');
            if (limitEl) limitEl.value = config.limiteCaixa !== undefined ? config.limiteCaixa : 500;
            
            if (document.getElementById('config-senha-gerente')) {
                document.getElementById('config-senha-gerente').value = config.senhaGerente || '1234';
            }
            if (document.getElementById('config-horario-aviso')) {
                document.getElementById('config-horario-aviso').value = config.horarioAviso || '18:00';
            }
            if (document.getElementById('config-horario-bloqueio')) {
                document.getElementById('config-horario-bloqueio').value = config.horarioBloqueio || '18:30';
            }
            
            const previewLogo = document.getElementById('preview-config-logo');
            if (previewLogo) {
                previewLogo.style.backgroundImage = config.logoImage ? `url(${config.logoImage})` : 'none';
            }
            
            // Render collaborators list
            if (window.renderColaboradores) window.renderColaboradores();
            
            openModal(modalConfig);
        });

        // Attach listeners for live preview
        const logoInput = document.getElementById('config-logo');
        if (logoInput) {
            logoInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        document.getElementById('preview-config-logo').style.backgroundImage = `url(${ev.target.result})`;
                    };
                    reader.readAsDataURL(e.target.files[0]);
                }
            });
        }
    }

    // ============================================
    // Expediente Interval Check
    let hasAlertedExpediente = false;
    setInterval(() => {
        const config = window.lojaConfig || {};
        if (config.horarioAviso) {
            const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            if (timeStr >= config.horarioAviso && timeStr < (config.horarioBloqueio || '23:59')) {
                if (!hasAlertedExpediente && window.loggedUser && !(Array.isArray(window.loggedUser.cargo) ? window.loggedUser.cargo : [window.loggedUser.cargo]).includes('Dono')) {
                    window.customAlert('Expediente Encerrado! O sistema será bloqueado para novos acessos em breve.', 'warning');
                    hasAlertedExpediente = true;
                }
            } else if (timeStr < config.horarioAviso) {
                hasAlertedExpediente = false;
            }
        }
    }, 60000);

    // ============================================
    // Relatórios de Equipe (Mock Data)
    // ============================================
    window.renderRelatorios = function() {
        const grid = document.getElementById('relatorios-grid');
        if (!grid) return;
        
        let colabs = window.colaboradores || [];
        if (colabs.length === 0) {
            colabs = [
                { nome: 'Colaborador Exemplo', cargo: 'Vendedor', foto: '', comissaoVendas: '5', comissaoServicos: '10' }
            ];
        }

        let transacoes = JSON.parse(localStorage.getItem('avence_transacoes_caixa')) || [];
        let osList = JSON.parse(localStorage.getItem('avence_os')) || [];
        let pontos = JSON.parse(localStorage.getItem('avence_pontos')) || [];

        grid.innerHTML = '';
        colabs.forEach((c) => {
            // Calculate Real Data
            
            // 1. Vendas
            let vendasValor = 0;
            // Filter all entradas where motivo includes this seller
            transacoes.forEach(t => {
                if (t.tipo === 'entrada' && t.motivo && t.motivo.includes('Vendedor: ' + c.nome)) {
                    vendasValor += parseFloat(t.valor) || 0;
                }
            });

            // 2. Serviços / OS
            let osEntregues = 0;
            let osValor = 0;
            osList.forEach(os => {
                // If technician matches and OS is finished/delivered
                if (os.tecnico === c.nome && (os.status === 'Concluída' || os.status === 'Entregue')) {
                    osEntregues++;
                    osValor += parseFloat(os.valorTotal || os.valorFinal || 0); // fallback to 0 if mock doesn't have it
                }
            });

            // 3. Ponto (Horas)
            let diasTrabalhados = 0;
            const ponts = pontos.filter(p => p.nome === c.nome);
            const daysSet = new Set();
            ponts.forEach(p => {
                if (p.data) {
                    daysSet.add(p.data.split('T')[0]); // unique day string
                }
            });
            let horas = daysSet.size * 8; // dummy 8h per day logged in
            if (horas === 0 && ponts.length > 0) horas = ponts.length * 8;

            // 4. Comissão
            const percVenda = parseFloat(c.comissaoVendas) || 0;
            const percServico = parseFloat(c.comissaoServicos) || 0;
            const comissao = ((vendasValor * (percVenda / 100)) + (osValor * (percServico / 100))).toFixed(2);

            const fotoHTML = c.foto ? `<img src="${c.foto}" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);">` : `<div style="width: 56px; height: 56px; border-radius: 50%; background: var(--bg-dark); display: flex; align-items: center; justify-content: center; border: 2px solid var(--border);"><i class="ph ph-user" style="font-size: 24px; color: var(--text-muted);"></i></div>`;

            const card = document.createElement('div');
            card.style.cssText = 'background: var(--bg-surface-light); border: 1px solid var(--border); border-radius: 8px; padding: 20px; display: flex; flex-direction: column; gap: 16px;';
            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 16px; border-bottom: 1px solid var(--border); padding-bottom: 16px;">
                    ${fotoHTML}
                    <div>
                        <div style="font-weight: bold; font-size: 18px; color: var(--text-main);">${c.nome}</div>
                        <div style="font-size: 13px; color: var(--primary); text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">${Array.isArray(c.cargo) ? c.cargo.join(', ') : c.cargo}</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div style="background: var(--bg-dark); padding: 12px; border-radius: 6px; border: 1px solid var(--border);">
                        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Total Vendas</div>
                        <div style="font-size: 16px; font-weight: bold; color: #22c55e; margin-top: 4px;">R$ ${vendasValor.toFixed(2)}</div>
                    </div>
                    <div style="background: var(--bg-dark); padding: 12px; border-radius: 6px; border: 1px solid var(--border);">
                        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">O.S Finalizadas</div>
                        <div style="font-size: 16px; font-weight: bold; color: #3b82f6; margin-top: 4px;">${osEntregues} un</div>
                    </div>
                    <div style="background: var(--bg-dark); padding: 12px; border-radius: 6px; border: 1px solid var(--border);">
                        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Comissão Est.</div>
                        <div style="font-size: 16px; font-weight: bold; color: #eab308; margin-top: 4px;">R$ ${comissao}</div>
                    </div>
                    <div style="background: var(--bg-dark); padding: 12px; border-radius: 6px; border: 1px solid var(--border);">
                        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Horas Trab.</div>
                        <div style="font-size: 16px; font-weight: bold; color: var(--text-main); margin-top: 4px;">${horas}h</div>
                    </div>
                </div>
                <button class="btn btn-secondary btn-relat-detail" data-colab='${JSON.stringify(c).replace(/'/g, "&apos;")}' data-vendas="${vendasValor}" data-comissao="${comissao}" data-pontos='${JSON.stringify(ponts)}' style="margin-top: 8px; width: 100%; justify-content: center;"><i class="ph ph-magnifying-glass"></i> Ver Relatório Detalhado</button>
            `;
            grid.appendChild(card);
        });
        
        // Attach event listeners for details modal
        let relatChart = null;
        document.querySelectorAll('.btn-relat-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const colab = JSON.parse(e.currentTarget.getAttribute('data-colab').replace(/&apos;/g, "'"));
                const totalVendas = parseFloat(e.currentTarget.getAttribute('data-vendas')) || 0;
                const totalComissao = parseFloat(e.currentTarget.getAttribute('data-comissao')) || 0;
                const colabPontos = JSON.parse(e.currentTarget.getAttribute('data-pontos') || '[]');
                
                // Populate Modal Header
                document.getElementById('modal-relat-nome').textContent = colab.nome;
                document.getElementById('modal-relat-cargo').textContent = Array.isArray(colab.cargo) ? colab.cargo.join(', ') : colab.cargo;
                const avatar = document.getElementById('modal-relat-foto');
                if (colab.foto) {
                    avatar.style.backgroundImage = `url(${colab.foto})`;
                    avatar.style.backgroundSize = 'cover';
                    avatar.style.backgroundPosition = 'center';
                    avatar.innerHTML = '';
                } else {
                    avatar.style.backgroundImage = 'none';
                    avatar.innerHTML = '<i class="ph ph-user" style="font-size: 32px; color: var(--text-muted);"></i>';
                }
                
                // Populate REAL monthly summary
                document.getElementById('modal-relat-vendas').textContent = 'R$ ' + totalVendas.toFixed(2);
                document.getElementById('modal-relat-comissao').textContent = 'R$ ' + totalComissao.toFixed(2);
                
                // Populate REAL point history
                const pontoContainer = document.getElementById('modal-relat-ponto');
                pontoContainer.innerHTML = '';
                if (colabPontos.length === 0) {
                     pontoContainer.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted);">Nenhum ponto registrado.</div>';
                } else {
                    colabPontos.slice().reverse().slice(0, 10).forEach(p => {
                        const dataObj = new Date(p.data);
                        const dataStr = dataObj.toLocaleDateString('pt-BR');
                        const horaStr = dataObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                        pontoContainer.innerHTML += `
                            <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid var(--border); font-size: 14px;">
                                <span><i class="ph ph-calendar-blank"></i> ${dataStr}</span>
                                <span style="color: #22c55e;">Entrada: ${horaStr}</span>
                                <span style="color: #ef4444;">-</span>
                            </div>
                        `;
                    });
                }

                // Render Chart
                if (relatChart) relatChart.destroy();
                const ctx = document.getElementById('relat-colab-chart');
                if (ctx) {
                    // Calculate real chart data
                    const daysLabels = [];
                    const dataVendasReal = [];
                    let transacoesChart = JSON.parse(localStorage.getItem('avence_transacoes_caixa')) || [];
                    
                    for (let i = 5; i >= 0; i--) {
                        const d = new Date();
                        d.setDate(d.getDate() - i);
                        const dayStr = d.toLocaleDateString('pt-BR', {weekday: 'short'});
                        daysLabels.push(dayStr);
                        
                        const dateString = d.toISOString().split('T')[0];
                        let sumDay = 0;
                        transacoesChart.forEach(t => {
                            if (t.tipo === 'entrada' && t.motivo && t.motivo.includes('Vendedor: ' + colab.nome)) {
                                if (t.data && t.data.startsWith(dateString)) {
                                    sumDay += parseFloat(t.valor) || 0;
                                }
                            }
                        });
                        dataVendasReal.push(sumDay);
                    }
                    
                    relatChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: daysLabels,
                            datasets: [{
                                label: 'Vendas Diárias (R$)',
                                data: dataVendasReal,
                                borderColor: '#3b82f6',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                tension: 0.4,
                                fill: true
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false }
                            },
                            scales: {
                                y: { beginAtZero: true }
                            }
                        }
                    });
                }
                
                openModal(document.getElementById('modal-relatorio-colab'));
            });
        });
    };

    const btnRefreshRelat = document.getElementById('btn-refresh-relatorios');
    if (btnRefreshRelat) {
        btnRefreshRelat.addEventListener('click', window.renderRelatorios);
    }

    // Auto-render relatorios on click
    document.querySelectorAll('.menu-btn[data-target="relatorios"]').forEach(btn => {
        btn.addEventListener('click', window.renderRelatorios);
    });

    // Auto-capitalize first letter of text inputs and textareas
    document.addEventListener('input', function(e) {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            const type = e.target.type;
            if (e.target.tagName === 'TEXTAREA' || type === 'text' || type === 'search') {
                const val = e.target.value;
                if (val && val.length > 0) {
                    const firstChar = val.charAt(0);
                    const firstCharUpper = firstChar.toUpperCase();
                    if (firstChar !== firstCharUpper) {
                        e.target.value = firstCharUpper + val.slice(1);
                    }
                }
            }
        }
    });

    renderFinanceiro();
// End Wrapper Removed
