    // --- MÃO DE OBRA / OS LOGIC ---
    // Atrelado ao botão de Padrões na aba de Serviços da O.S.
    const btnPadroesOS = document.getElementById('btn-add-servico-padrao-os');
    if (btnPadroesOS) {
        btnPadroesOS.addEventListener('click', () => {
            openModal(document.getElementById('modal-selecionar-servico'));
            renderServicosOS();
        });
    }

    const servicoSearchOS = document.getElementById('servico-search');
    if (servicoSearchOS) {
        servicoSearchOS.addEventListener('input', (e) => {
            renderServicosOS(e.target.value);
        });
    }

    function renderServicosOS(filtro = '') {
        const tbody = document.getElementById('lista-servicos-padrao');
        if (!tbody) return;
        tbody.innerHTML = '';

        const servicos = estoque.filter(p => p.tipo === 'servico');
        let filtrados = servicos;
        
        if (filtro) {
            const termo = filtro.toLowerCase();
            filtrados = servicos.filter(s => s.nome.toLowerCase().includes(termo));
        }

        if (filtrados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 16px;">Nenhum serviço padrão cadastrado no estoque.</td></tr>';
            return;
        }

        filtrados.forEach(serv => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${serv.nome}</td>
                <td style="text-align: right; font-weight: bold; color: var(--primary);">${formatMoney(serv.venda)}</td>
                <td style="text-align: center;">
                    <button class="btn btn-primary btn-add-servico-os" data-id="${serv.id}" style="padding: 4px 8px; font-size: 12px;">+ Add</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-add-servico-os').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const serv = estoque.find(p => p.id === id);
                if (serv) {
                    const osServicosTbody = document.getElementById('os-servicos-tbody');
                    if (osServicosTbody) {
                        // Limpa a linha vazia de design se existir
                        if (osServicosTbody.children.length === 1 && osServicosTbody.children[0].children[1] && osServicosTbody.children[0].children[1].textContent.trim() === '') {
                            osServicosTbody.innerHTML = '';
                        }
                        
                        const tr = document.createElement('tr');
                        tr.setAttribute('data-valor', serv.venda);
                        tr.innerHTML = `
                            <td style="border: 1px solid var(--border); padding: 4px 8px;">${serv.nome}</td>
                            <td style="border: 1px solid var(--border); padding: 4px 8px;">Interno</td>
                            <td style="border: 1px solid var(--border); padding: 4px 8px;">--:--</td>
                            <td style="border: 1px solid var(--border); padding: 4px 8px;">--:--</td>
                            <td style="border: 1px solid var(--border); padding: 4px 8px; text-align: right;">1</td>
                            <td style="border: 1px solid var(--border); padding: 4px 8px; text-align: right; font-weight: bold; color: var(--primary);">${formatMoney(serv.venda)}</td>
                            <td style="border: 1px solid var(--border); padding: 4px 8px;">${document.getElementById('a_tecnico')?.value || 'Não definido'}</td>
                        `;
                        
                        tr.style.cursor = 'pointer';
                        tr.addEventListener('click', () => {
                            tr.classList.toggle('selected-row');
                            if (tr.classList.contains('selected-row')) {
                                tr.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                            } else {
                                tr.style.backgroundColor = '';
                            }
                        });
                        
                        osServicosTbody.appendChild(tr);
                        
                        // Atualiza o total de serviços da aba
                        let total = 0;
                        Array.from(osServicosTbody.children).forEach(row => {
                            const val = parseFloat(row.getAttribute('data-valor')) || 0;
                            total += val;
                        });
                        const inputTotal = document.getElementById('os-servicos-total');
                        if(inputTotal) inputTotal.value = formatMoney(total);
                        
                        // Atualiza o resumo financeiro (coluna direita da O.S)
                        const maoDeObraInput = document.getElementById('a_maodeobra');
                        if (maoDeObraInput) {
                            maoDeObraInput.value = total.toFixed(2);
                            maoDeObraInput.dispatchEvent(new Event('input')); // Dispara o recálculo do a_total
                        }
                    }
                    // window.customAlert(`Serviço <strong>${serv.nome}</strong> adicionado à OS com sucesso!`, 'success');
                    closeModal(document.getElementById('modal-selecionar-servico'));
                }
            });
        });
    }

    // Serviço Avulso Logic
    const btnAddAvulso = document.getElementById('btn-add-servico-avulso');
    const modalAvulso = document.getElementById('modal-servico-avulso');
    if (btnAddAvulso && modalAvulso) {
        btnAddAvulso.addEventListener('click', () => {
            document.getElementById('avulso-descricao').value = '';
            document.getElementById('avulso-valor').value = '';
            document.getElementById('avulso-valor-preview').textContent = 'R$ 0,00';
            openModal(modalAvulso);
            setTimeout(() => document.getElementById('avulso-descricao').focus(), 100);
        });

        const avulsoDescInput = document.getElementById('avulso-descricao');
        const avulsoValorInput = document.getElementById('avulso-valor');
        
        if (avulsoDescInput) {
            avulsoDescInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (avulsoValorInput) avulsoValorInput.focus();
                }
            });
        }

        if (avulsoValorInput) {
            avulsoValorInput.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value) || 0;
                document.getElementById('avulso-valor-preview').textContent = formatMoney(val);
            });
            // Also allow Enter to confirm
            avulsoValorInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('btn-confirmar-avulso').click();
                }
            });
        }

        const btnConfirmAvulso = document.getElementById('btn-confirmar-avulso');
        if (btnConfirmAvulso) {
            btnConfirmAvulso.addEventListener('click', () => {
                const desc = document.getElementById('avulso-descricao').value.trim();
                const valor = parseFloat(document.getElementById('avulso-valor').value) || 0;
                
                if (!desc) { window.customAlert('Informe a descrição do serviço!', 'warning'); return; }
                if (valor <= 0) { window.customAlert('Informe um valor válido!', 'warning'); return; }

                const osServicosTbody = document.getElementById('os-servicos-tbody');
                if (osServicosTbody) {
                    if (osServicosTbody.children.length === 1 && osServicosTbody.children[0].children[1] && osServicosTbody.children[0].children[1].textContent.trim() === '') {
                        osServicosTbody.innerHTML = '';
                    }
                    
                    const tr = document.createElement('tr');
                    tr.setAttribute('data-valor', valor);
                    tr.style.cursor = 'pointer';
                    tr.innerHTML = `
                        <td style="border: 1px solid var(--border); padding: 4px 8px;">${desc}</td>
                        <td style="border: 1px solid var(--border); padding: 4px 8px;">Avulso</td>
                        <td style="border: 1px solid var(--border); padding: 4px 8px;">--:--</td>
                        <td style="border: 1px solid var(--border); padding: 4px 8px;">--:--</td>
                        <td style="border: 1px solid var(--border); padding: 4px 8px; text-align: right;">1</td>
                        <td style="border: 1px solid var(--border); padding: 4px 8px; text-align: right; font-weight: bold; color: var(--primary);">${formatMoney(valor)}</td>
                        <td style="border: 1px solid var(--border); padding: 4px 8px;">${document.getElementById('a_tecnico')?.value || 'Não definido'}</td>
                    `;
                    // Row selection logic
                    tr.addEventListener('click', () => {
                        tr.classList.toggle('selected-row');
                        if (tr.classList.contains('selected-row')) {
                            tr.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'; // Highlight color
                        } else {
                            tr.style.backgroundColor = '';
                        }
                    });
                    
                    osServicosTbody.appendChild(tr);
                    
                    // Recalculate
                    let total = 0;
                    Array.from(osServicosTbody.children).forEach(row => {
                        total += parseFloat(row.getAttribute('data-valor')) || 0;
                    });
                    const inputTotal = document.getElementById('os-servicos-total');
                    if(inputTotal) inputTotal.value = formatMoney(total);
                    const maoDeObraInput = document.getElementById('a_maodeobra');
                    if (maoDeObraInput) {
                        maoDeObraInput.value = total.toFixed(2);
                        maoDeObraInput.dispatchEvent(new Event('input'));
                    }
                    
                    closeModal(modalAvulso);
                    // window.customAlert('Serviço Avulso incluído!', 'success');
                }
            });
        }
    }

    // Excluir Serviço O.S Logic
    const btnExcluirServico = document.getElementById('btn-excluir-servico-os');
    if (btnExcluirServico) {
        btnExcluirServico.addEventListener('click', () => {
            const osServicosTbody = document.getElementById('os-servicos-tbody');
            if (osServicosTbody) {
                const selectedRows = osServicosTbody.querySelectorAll('.selected-row');
                if (selectedRows.length === 0) {
                    window.customAlert('Selecione um serviço na lista para excluir clicando sobre ele.', 'warning');
                    return;
                }
                
                selectedRows.forEach(row => row.remove());
                
                // Recalculate
                let total = 0;
                Array.from(osServicosTbody.children).forEach(row => {
                    total += parseFloat(row.getAttribute('data-valor')) || 0;
                });
                const inputTotal = document.getElementById('os-servicos-total');
                if(inputTotal) inputTotal.value = formatMoney(total);
                const maoDeObraInput = document.getElementById('a_maodeobra');
                if (maoDeObraInput) {
                    maoDeObraInput.value = total.toFixed(2);
                    maoDeObraInput.dispatchEvent(new Event('input'));
                }
                
                // Add empty row if table is empty to keep layout
                if (osServicosTbody.children.length === 0) {
                    osServicosTbody.innerHTML = `<tr><td style="border: 1px solid var(--border); padding: 4px 8px;">&nbsp;</td><td style="border: 1px solid var(--border); padding: 4px 8px;"></td><td style="border: 1px solid var(--border); padding: 4px 8px;"></td><td style="border: 1px solid var(--border); padding: 4px 8px;"></td><td style="border: 1px solid var(--border); padding: 4px 8px;"></td><td style="border: 1px solid var(--border); padding: 4px 8px;"></td><td style="border: 1px solid var(--border); padding: 4px 8px;"></td></tr>`;
                }
            }
        });
    }

    // Peças do Estoque O.S Logic
    const btnAddPecaEstoque = document.getElementById('btn-add-peca-estoque-os');
    const modalPecaEstoque = document.getElementById('modal-selecionar-peca');
    if (btnAddPecaEstoque && modalPecaEstoque) {
        btnAddPecaEstoque.addEventListener('click', () => {
            const tbody = document.getElementById('lista-pecas-estoque');
            if (tbody) {
                tbody.innerHTML = '';
                const pecas = estoque.filter(p => p.tipo === 'peca');
                if (pecas.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">Nenhuma peça/produto no estoque</td></tr>`;
                } else {
                    pecas.forEach(p => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${p.nome}</td>
                            <td style="text-align: center;">${p.qtd || 0}</td>
                            <td style="text-align: right; color: var(--primary); font-weight: bold;">${formatMoney(p.venda)}</td>
                            <td style="text-align: center;">
                                <button type="button" class="btn btn-primary btn-add-peca-os" data-id="${p.id}" style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 4px 8px; font-size: 12px; width: 100%;"><i class="ph ph-plus"></i> Add</button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                    
                    document.querySelectorAll('.btn-add-peca-os').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const id = e.currentTarget.getAttribute('data-id');
                            const peca = estoque.find(p => p.id === id);
                            if (peca) {
                                const osPecasTbody = document.getElementById('os-pecas-tbody');
                                if (osPecasTbody) {
                                    if (osPecasTbody.children.length === 1 && osPecasTbody.children[0].children[1] && osPecasTbody.children[0].children[1].textContent.trim() === '') {
                                        osPecasTbody.innerHTML = '';
                                    }
                                    
                                    const tr = document.createElement('tr');
                                    tr.setAttribute('data-valor', peca.venda);
                                    tr.style.cursor = 'pointer';
                                    tr.innerHTML = `
                                        <td style="border: 1px solid var(--border); padding: 4px 8px;">${peca.codigo || id.substring(0,6)}</td>
                                        <td style="border: 1px solid var(--border); padding: 4px 8px;">${peca.nome}</td>
                                        <td style="border: 1px solid var(--border); padding: 4px 8px; text-align: right;">${formatMoney(peca.venda)}</td>
                                        <td style="border: 1px solid var(--border); padding: 4px 8px; text-align: center;">1</td>
                                        <td style="border: 1px solid var(--border); padding: 4px 8px; text-align: right; font-weight: bold; color: var(--primary);">${formatMoney(peca.venda)}</td>
                                        <td style="border: 1px solid var(--border); padding: 4px 8px;">${document.getElementById('a_tecnico')?.value || 'Não definido'}</td>
                                    `;
                                    
                                    tr.addEventListener('click', () => {
                                        tr.classList.toggle('selected-row');
                                        if (tr.classList.contains('selected-row')) {
                                            tr.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                                        } else {
                                            tr.style.backgroundColor = '';
                                        }
                                    });
                                    
                                    osPecasTbody.appendChild(tr);
                                    
                                    // Recalculate
                                    let total = 0;
                                    Array.from(osPecasTbody.children).forEach(row => {
                                        total += parseFloat(row.getAttribute('data-valor')) || 0;
                                    });
                                    
                                    const aPecasInput = document.getElementById('a_pecas');
                                    if (aPecasInput) {
                                        aPecasInput.value = total.toFixed(2);
                                        aPecasInput.dispatchEvent(new Event('input')); // Recalcula a OS
                                    }
                                }
                                closeModal(modalPecaEstoque);
                            }
                        });
                    });
                }
            }
            openModal(modalPecaEstoque);
        });
        
        // Search logic for pieces
        const pecaSearch = document.getElementById('peca-search');
        if (pecaSearch) {
            pecaSearch.addEventListener('input', (e) => {
                const termo = e.target.value.toLowerCase();
                const trs = document.getElementById('lista-pecas-estoque').querySelectorAll('tr');
                trs.forEach(tr => {
                    if (tr.children.length > 1) {
                        const texto = tr.children[0].textContent.toLowerCase();
                        tr.style.display = texto.includes(termo) ? '' : 'none';
                    }
                });
            });
        }
    }

    // Excluir Peça O.S Logic
    const btnExcluirPeca = document.getElementById('btn-excluir-peca-os');
    if (btnExcluirPeca) {
        btnExcluirPeca.addEventListener('click', () => {
            const osPecasTbody = document.getElementById('os-pecas-tbody');
            if (osPecasTbody) {
                const selectedRows = osPecasTbody.querySelectorAll('.selected-row');
                if (selectedRows.length === 0) {
                    window.customAlert('Selecione uma peça na lista para excluir clicando sobre ela.', 'warning');
                    return;
                }
                
                selectedRows.forEach(row => row.remove());
                
                // Recalculate
                let total = 0;
                Array.from(osPecasTbody.children).forEach(row => {
                    total += parseFloat(row.getAttribute('data-valor')) || 0;
                });
                
                const aPecasInput = document.getElementById('a_pecas');
                if (aPecasInput) {
                    aPecasInput.value = total.toFixed(2);
                    aPecasInput.dispatchEvent(new Event('input'));
                }
                
                if (osPecasTbody.children.length === 0) {
                    osPecasTbody.innerHTML = `<tr><td style="border: 1px solid var(--border); padding: 4px 8px;">&nbsp;</td><td style="border: 1px solid var(--border); padding: 4px 8px;"></td><td style="border: 1px solid var(--border); padding: 4px 8px;"></td><td style="border: 1px solid var(--border); padding: 4px 8px;"></td><td style="border: 1px solid var(--border); padding: 4px 8px;"></td><td style="border: 1px solid var(--border); padding: 4px 8px;"></td></tr>`;
                }
            }
        });
    }

    // Peça Avulsa O.S Logic
    const btnAddPecaAvulsa = document.getElementById('btn-add-peca-avulsa-os');
    const modalPecaAvulsa = document.getElementById('modal-peca-avulsa');
    if (btnAddPecaAvulsa && modalPecaAvulsa) {
        btnAddPecaAvulsa.addEventListener('click', () => {
            document.getElementById('avulsa-peca-descricao').value = '';
            document.getElementById('avulsa-peca-valor').value = '';
            document.getElementById('avulsa-peca-valor-preview').textContent = 'R$ 0,00';
            openModal(modalPecaAvulsa);
            setTimeout(() => document.getElementById('avulsa-peca-descricao').focus(), 100);
        });

        const pecaAvulsaDescInput = document.getElementById('avulsa-peca-descricao');
        const pecaAvulsaValorInput = document.getElementById('avulsa-peca-valor');
        
        if (pecaAvulsaDescInput) {
            pecaAvulsaDescInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (pecaAvulsaValorInput) pecaAvulsaValorInput.focus();
                }
            });
        }

        if (pecaAvulsaValorInput) {
            pecaAvulsaValorInput.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value) || 0;
                document.getElementById('avulsa-peca-valor-preview').textContent = formatMoney(val);
            });
            // Allow Enter to confirm
            pecaAvulsaValorInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('btn-confirmar-peca-avulsa').click();
                }
            });
        }

        const btnConfirmPecaAvulsa = document.getElementById('btn-confirmar-peca-avulsa');
        if (btnConfirmPecaAvulsa) {
            btnConfirmPecaAvulsa.addEventListener('click', () => {
                const desc = document.getElementById('avulsa-peca-descricao').value.trim();
                const valor = parseFloat(document.getElementById('avulsa-peca-valor').value) || 0;
                
                if (!desc) { window.customAlert('Informe a descrição da peça!', 'warning'); return; }
                if (valor <= 0) { window.customAlert('Informe um valor válido!', 'warning'); return; }

                const osPecasTbody = document.getElementById('os-pecas-tbody');
                if (osPecasTbody) {
                    if (osPecasTbody.children.length === 1 && osPecasTbody.children[0].children[1] && osPecasTbody.children[0].children[1].textContent.trim() === '') {
                        osPecasTbody.innerHTML = '';
                    }
                    
                    const tr = document.createElement('tr');
                    tr.setAttribute('data-valor', valor);
                    tr.style.cursor = 'pointer';
                    tr.innerHTML = `
                        <td style="border: 1px solid var(--border); padding: 4px 8px;">Avulso</td>
                        <td style="border: 1px solid var(--border); padding: 4px 8px;">${desc}</td>
                        <td style="border: 1px solid var(--border); padding: 4px 8px; text-align: right;">${formatMoney(valor)}</td>
                        <td style="border: 1px solid var(--border); padding: 4px 8px; text-align: center;">1</td>
                        <td style="border: 1px solid var(--border); padding: 4px 8px; text-align: right; font-weight: bold; color: var(--primary);">${formatMoney(valor)}</td>
                        <td style="border: 1px solid var(--border); padding: 4px 8px;">${document.getElementById('a_tecnico')?.value || 'Não definido'}</td>
                    `;
                    // Row selection logic
                    tr.addEventListener('click', () => {
                        tr.classList.toggle('selected-row');
                        if (tr.classList.contains('selected-row')) {
                            tr.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'; // Highlight color
                        } else {
                            tr.style.backgroundColor = '';
                        }
                    });
                    
                    osPecasTbody.appendChild(tr);
                    
                    // Recalculate Total
                    let total = 0;
                    Array.from(osPecasTbody.children).forEach(row => {
                        total += parseFloat(row.getAttribute('data-valor')) || 0;
                    });
                    
                    const aPecasInput = document.getElementById('a_pecas');
                    if (aPecasInput) {
                        aPecasInput.value = total.toFixed(2);
                        aPecasInput.dispatchEvent(new Event('input')); // Recalcula a OS
                    }
                }
                
                closeModal(modalPecaAvulsa);
            });
        }
    }

    // KIT Montado O.S Logic
    const btnAddKitMontado = document.getElementById('btn-add-kit-montado-os');
    const modalKitMontado = document.getElementById('modal-selecionar-kit-montado');
    if (btnAddKitMontado && modalKitMontado) {
        btnAddKitMontado.addEventListener('click', () => {
            const tbody = document.getElementById('lista-kits-estoque');
            if (tbody) {
                tbody.innerHTML = '';
                const kits = estoque.filter(p => p.tipo === 'pc_montado');
                if (kits.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">Nenhum PC Montado (KIT) no estoque</td></tr>`;
                } else {
                    kits.forEach(p => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${p.nome}</td>
                            <td style="text-align: center;">${p.qtd || 0}</td>
                            <td style="text-align: right; color: var(--primary); font-weight: bold;">${formatMoney(p.venda)}</td>
                            <td style="text-align: center;">
                                <button type="button" class="btn btn-primary btn-add-kit-os" data-id="${p.id}" style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 4px 8px; font-size: 12px; width: 100%;"><i class="ph ph-plus"></i> Add</button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                    
                    document.querySelectorAll('.btn-add-kit-os').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const id = e.currentTarget.getAttribute('data-id');
                            const kit = estoque.find(p => p.id === id);
                            if (kit) {
                                const osPecasTbody = document.getElementById('os-pecas-tbody');
                                if (osPecasTbody) {
                                    if (osPecasTbody.children.length === 1 && osPecasTbody.children[0].children[1] && osPecasTbody.children[0].children[1].textContent.trim() === '') {
                                        osPecasTbody.innerHTML = '';
                                    }
                                    
                                    const tr = document.createElement('tr');
                                    tr.setAttribute('data-valor', kit.venda);
                                    tr.style.cursor = 'pointer';
                                    tr.innerHTML = `
                                        <td style="border: 1px solid var(--border); padding: 4px 8px;">${kit.codigo || id.substring(0,6)}</td>
                                        <td style="border: 1px solid var(--border); padding: 4px 8px;">${kit.nome}</td>
                                        <td style="border: 1px solid var(--border); padding: 4px 8px; text-align: right;">${formatMoney(kit.venda)}</td>
                                        <td style="border: 1px solid var(--border); padding: 4px 8px; text-align: center;">1</td>
                                        <td style="border: 1px solid var(--border); padding: 4px 8px; text-align: right; font-weight: bold; color: var(--primary);">${formatMoney(kit.venda)}</td>
                                        <td style="border: 1px solid var(--border); padding: 4px 8px;">${document.getElementById('a_tecnico')?.value || 'Não definido'}</td>
                                    `;
                                    
                                    tr.addEventListener('click', () => {
                                        tr.classList.toggle('selected-row');
                                        if (tr.classList.contains('selected-row')) {
                                            tr.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                                        } else {
                                            tr.style.backgroundColor = '';
                                        }
                                    });
                                    
                                    osPecasTbody.appendChild(tr);
                                    
                                    // Recalculate
                                    let total = 0;
                                    Array.from(osPecasTbody.children).forEach(row => {
                                        total += parseFloat(row.getAttribute('data-valor')) || 0;
                                    });
                                    
                                    const aPecasInput = document.getElementById('a_pecas');
                                    if (aPecasInput) {
                                        aPecasInput.value = total.toFixed(2);
                                        aPecasInput.dispatchEvent(new Event('input')); // Recalcula a OS
                                    }
                                }
                                closeModal(modalKitMontado);
                            }
                        });
                    });
                }
            }
            openModal(modalKitMontado);
        });
        
        // Search logic for Kits
        const kitSearch = document.getElementById('kit-montado-search');
        if (kitSearch) {
            kitSearch.addEventListener('input', (e) => {
                const termo = e.target.value.toLowerCase();
                const trs = document.getElementById('lista-kits-estoque').querySelectorAll('tr');
                trs.forEach(tr => {
                    if (tr.children.length > 1) {
                        const texto = tr.children[0].textContent.toLowerCase();
                        tr.style.display = texto.includes(termo) ? '' : 'none';
                    }
                });
            });
        }
    }
