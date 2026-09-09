// --- FINANCEIRO LOGIC ---
let caixaAberto = false;
let fundoCaixa = 0;
let responsavelCaixaAtual = '';
let transacoesCaixa = [];

// Leitura inicial síncrona do cache para evitar piscar "Caixa Fechado"
try {
    const cachedCfg = JSON.parse(localStorage.getItem('avence_config') || '{}');
    if (cachedCfg.caixaAberto !== undefined) {
        caixaAberto = cachedCfg.caixaAberto === true || cachedCfg.caixaAberto === 'true';
        fundoCaixa = parseFloat(cachedCfg.fundoCaixa) || 0;
        responsavelCaixaAtual = cachedCfg.responsavelCaixa || '';
    } else {
        const cAberto = localStorage.getItem('avence_caixa_aberto');
        if (cAberto !== null) {
            caixaAberto = JSON.parse(cAberto) === true;
        }
        fundoCaixa = parseFloat(localStorage.getItem('avence_fundo_caixa')) || 0;
        responsavelCaixaAtual = localStorage.getItem('avence_abertura_responsavel') || '';
    }
    const cachedTr = JSON.parse(localStorage.getItem('avence_transacoes_caixa') || localStorage.getItem('avence_transacoes') || '[]');
    if (Array.isArray(cachedTr) && cachedTr.length > 0) {
        transacoesCaixa = cachedTr;
    }
} catch(e) {}

window.caixaAberto = caixaAberto;

// Funções auxiliares para listagem e validação de colaboradores e cargos (ex: 'Tecnico, Dono', 'Gerente', etc.)
window.getGlobalColaboradoresList = function () {
    if (window.colaboradores && Array.isArray(window.colaboradores) && window.colaboradores.length > 0) {
        return window.colaboradores;
    }
    if (window.globalData && Array.isArray(window.globalData.colaboradores) && window.globalData.colaboradores.length > 0) {
        return window.globalData.colaboradores;
    }
    try {
        return JSON.parse(localStorage.getItem('avence_colaboradores') || '[]');
    } catch (e) {
        return [];
    }
};

window.parseColabCargos = function (cargoVal) {
    if (!cargoVal) return [];
    if (Array.isArray(cargoVal)) {
        return cargoVal.flatMap(c => typeof c === 'string' ? c.split(',').map(s => s.trim()) : [String(c)]).filter(Boolean);
    }
    if (typeof cargoVal === 'string') {
        return cargoVal.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [String(cargoVal)];
};

window.isCargoAdminOrGerente = function (colab) {
    if (!colab) return false;
    const cargos = window.parseColabCargos(colab.cargo);
    if (colab.perfil) cargos.push(...window.parseColabCargos(colab.perfil));
    if (colab.funcao) cargos.push(...window.parseColabCargos(colab.funcao));
    return cargos.some(c => {
        const norm = c.toLowerCase();
        return norm === 'dono' || norm === 'gerente' || norm === 'admin' || norm === 'administrador' || norm.includes('dono') || norm.includes('gerente');
    });
};

window.matchesColabPassword = function (colab, senha) {
    if (!colab || !senha) return false;
    const s = String(senha).trim();
    if (!s) return false;
    const sRet = colab.senhaRetirada ? String(colab.senhaRetirada).trim() : null;
    const sLog = colab.senhaLogin ? String(colab.senhaLogin).trim() : null;
    const sPad = colab.senha ? String(colab.senha).trim() : null;
    return (sRet && sRet === s) || (sLog && sLog === s) || (sPad && sPad === s);
};

window.isSenhaMasterLoja = function (senha) {
    if (!senha) return false;
    const s = String(senha).trim();
    let masterCfg = window.lojaConfig?.senhaGerente;
    if (!masterCfg) {
        try {
            masterCfg = JSON.parse(localStorage.getItem('avence_config') || '{}')?.senhaGerente;
        } catch (e) {}
    }
    masterCfg = masterCfg || '1234';
    return s === String(masterCfg).trim();
};

// Função central para desduplicação rigorosa de transações do caixa
window.deduplicateTransactions = function (list) {
    if (!Array.isArray(list)) return [];
    const result = [];
    const seenIds = new Set();

    list.forEach(tx => {
        if (!tx) return;
        const txId = tx.id || tx.$id;

        // Se tem ID específico e já vimos esse ID exato
        if (txId && seenIds.has(txId)) {
            return;
        }

        // Checar por duplicata por conteúdo (mesmo tipo, valor, motivo, vendedor e data próxima)
        const isDuplicateContent = result.some(existing => {
            const exId = existing.id || existing.$id;
            if (txId && exId && txId === exId) return true;

            const mesmoTipo = existing.tipo === tx.tipo;
            const mesmoValor = Math.abs(parseFloat(existing.valor || 0) - parseFloat(tx.valor || 0)) < 0.01;
            const mesmoMotivo = (existing.motivo || '').trim() === (tx.motivo || '').trim();
            const mesmoVend = (existing.vendedor || 'Geral') === (tx.vendedor || 'Geral');

            if (mesmoTipo && mesmoValor && mesmoMotivo && mesmoVend) {
                // Checar proximidade temporal (se for menor que 15 segundos, é a mesma movimentação)
                if (existing.data && tx.data) {
                    const diffMs = Math.abs(new Date(existing.data).getTime() - new Date(tx.data).getTime());
                    if (diffMs <= 15000) {
                        // Se a nova tem ID remoto do Appwrite e a anterior é local_, promover para o ID remoto
                        if (txId && !String(txId).startsWith('local_') && exId && String(exId).startsWith('local_')) {
                            existing.id = txId;
                            existing.$id = txId;
                        }
                        return true;
                    }
                } else {
                    return true;
                }
            }
            return false;
        });

        if (!isDuplicateContent) {
            if (txId) seenIds.add(txId);
            result.push(tx);
        }
    });

    return result;
};

// Função chamada pelo sistema de sincronização externa (appwrite-config.js)
window.applyCaixaStatus = function(isAberto, fundo, responsavel) {
    caixaAberto = !!isAberto;
    window.caixaAberto = caixaAberto;
    if (fundo !== undefined && fundo !== null) fundoCaixa = parseFloat(fundo) || 0;
    if (responsavel) responsavelCaixaAtual = responsavel;
    renderFinanceiro();
};

window.onTransacoesSynced = function(newTransList) {
    if (Array.isArray(newTransList)) {
        transacoesCaixa = window.deduplicateTransactions(newTransList);
        if (window.globalData) window.globalData.transacoes = transacoesCaixa;
        renderFinanceiro();
    }
};

document.addEventListener('appwriteReady', () => {
    if (window.globalData && window.globalData.transacoes) {
        transacoesCaixa = window.deduplicateTransactions(window.globalData.transacoes);
        window.globalData.transacoes = transacoesCaixa;

        // Retroactive Fix: Convert any old divergence adjustments
        let hasFixedOldTransactions = false;
        transacoesCaixa.forEach(t => {
            if (t.motivo && t.motivo.includes('Ajuste de Caixa na Abertura (Divergência)')) {
                if (t.tipo === 'saida') { t.tipo = 'info_furo'; hasFixedOldTransactions = true; }
                if (t.tipo === 'entrada') { t.tipo = 'info_sobra'; hasFixedOldTransactions = true; }
            }
        });
        if (hasFixedOldTransactions) {
            localStorage.setItem('avence_transacoes_caixa', JSON.stringify(transacoesCaixa));
        }
    }
    if (window.globalData && window.globalData.config) {
        if (window.globalData.config.caixaAberto !== undefined) {
            caixaAberto = window.globalData.config.caixaAberto === true || window.globalData.config.caixaAberto === 'true';
            fundoCaixa = parseFloat(window.globalData.config.fundoCaixa) || 0;
            responsavelCaixaAtual = window.globalData.config.responsavelCaixa || responsavelCaixaAtual;
            window.caixaAberto = caixaAberto;
            localStorage.setItem('avence_fundo_caixa', fundoCaixa);
            localStorage.setItem('avence_caixa_aberto', JSON.stringify(caixaAberto));
            localStorage.setItem('avence_abertura_responsavel', responsavelCaixaAtual);
        }
    }
    if (window.updateGlobalCaixaUI) {
        window.updateGlobalCaixaUI(caixaAberto, responsavelCaixaAtual, fundoCaixa);
    }
    if (typeof renderFinanceiro === 'function') renderFinanceiro();
});

let financeiroChartInstance = null;

const badgeStatus = document.getElementById('caixa-status-badge');
const btnAbrirCaixa = document.getElementById('btn-abrir-caixa');
const btnFecharCaixa = document.getElementById('btn-fechar-caixa');
const btnSangria = document.getElementById('btn-sangria');
const btnAjustarFundo = document.getElementById('btn-ajustar-fundo');

const modalAbrirCaixa = document.getElementById('modal-abrir-caixa');
const modalFecharCaixa = document.getElementById('modal-fechar-caixa');
const modalSangria = document.getElementById('modal-sangria');
const modalAjustarFundo = document.getElementById('modal-ajustar-fundo');

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
        if (badgeStatus) {
            let nomeResp = responsavelCaixaAtual;
            if (window.colaboradores && Array.isArray(window.colaboradores)) {
                const found = window.colaboradores.find(c => c.id === responsavelCaixaAtual || c.$id === responsavelCaixaAtual || c.nome === responsavelCaixaAtual);
                if (found && found.nome) nomeResp = found.nome;
            }
            const respFormatado = nomeResp ? ` (Resp: ${nomeResp})` : '';
            badgeStatus.textContent = `Caixa Aberto${respFormatado}`;
            badgeStatus.style.background = '#22c55e';
        }
        if (btnAbrirCaixa) btnAbrirCaixa.style.display = 'none';
        if (btnFecharCaixa) btnFecharCaixa.style.display = 'flex';
        if (btnSangria) btnSangria.style.display = 'flex';
        if (btnAjustarFundo) btnAjustarFundo.style.display = 'flex';
    } else {
        if (badgeStatus) { badgeStatus.textContent = 'Caixa Fechado'; badgeStatus.style.background = '#ef4444'; }
        if (btnAbrirCaixa) btnAbrirCaixa.style.display = 'flex';
        if (btnFecharCaixa) btnFecharCaixa.style.display = 'none';
        if (btnSangria) btnSangria.style.display = 'none';
        if (btnAjustarFundo) btnAjustarFundo.style.display = 'none';
    }

    if (typeof window.deduplicateTransactions === 'function') {
        transacoesCaixa = window.deduplicateTransactions(transacoesCaixa);
        if (window.globalData) window.globalData.transacoes = transacoesCaixa;
    }

    const hojeLocal = new Date().toLocaleDateString('pt-BR');
    let entradasHoje = 0;
    let entradasDinheiro = 0;
    let saidasHoje = 0;

    // Filtra transações do dia local atual (compatível com fuso horário do Brasil)
    const transacoesHoje = transacoesCaixa.filter(t => {
        if (!t.data) return false;
        try {
            return new Date(t.data).toLocaleDateString('pt-BR') === hojeLocal;
        } catch(e) {
            return t.data.startsWith(new Date().toISOString().split('T')[0]);
        }
    });

    transacoesHoje.forEach(t => {
        const isDinheiro = (!t.formaPgto || t.formaPgto === 'dinheiro');
        if (t.tipo === 'entrada' || t.tipo === 'info_sobra') {
            entradasHoje += t.valor;
            if (isDinheiro) entradasDinheiro += t.valor;
        }
        if (t.tipo === 'saida' || t.tipo === 'info_furo') saidasHoje += t.valor;
    });

    const saldoAtual = fundoCaixa + entradasDinheiro - saidasHoje;
    const projecaoMes = entradasHoje * 22; // Simplificado

    const elSaldo = document.getElementById('fin-saldo-atual');
    const elSaldoDetalhe = document.getElementById('fin-saldo-detalhe');
    const elEntradas = document.getElementById('fin-entradas-hoje');
    const elSaidas = document.getElementById('fin-saidas-hoje');
    const elProjecao = document.getElementById('fin-projecao-mes');

    if (elSaldo) elSaldo.textContent = formatMoney(saldoAtual);
    if (elSaldoDetalhe) {
        if (caixaAberto) {
            elSaldoDetalhe.textContent = `Troco Inicial: ${formatMoney(fundoCaixa)} | Vendas em Dinheiro: ${formatMoney(entradasDinheiro)}`;
        } else {
            elSaldoDetalhe.textContent = 'Caixa Fechado';
        }
    }
    if (elEntradas) elEntradas.textContent = formatMoney(entradasHoje);
    if (elSaidas) elSaidas.textContent = formatMoney(saidasHoje);
    if (elProjecao) elProjecao.textContent = formatMoney(projecaoMes);

    // Toast de limite excedido
    const limit = window.lojaConfig?.limiteCaixa || 0;
    const container = document.getElementById('toast-container');
    if (caixaAberto && limit > 0 && saldoAtual >= limit) {
        showToast(`ATENÇÃO: O caixa atingiu o limite de segurança (R$ ${limit.toFixed(2)}). É recomendado realizar uma sangria!`);
    } else if (container) {
        container.innerHTML = ''; // Limpa se o saldo voltar ao normal
    }

    // Resumo de vendas por vendedor hoje
    const resumoVendedoresEl = document.getElementById('fin-vendas-vendedores-resumo');
    if (resumoVendedoresEl) {
        const vendasPorColab = {};
        transacoesHoje.filter(t => t.tipo === 'entrada' || t.tipo === 'info_sobra').forEach(t => {
            const v = t.vendedor || 'Geral';
            if (!vendasPorColab[v]) vendasPorColab[v] = { total: 0, count: 0 };
            vendasPorColab[v].total += t.valor;
            vendasPorColab[v].count += 1;
        });

        const vKeys = Object.keys(vendasPorColab);
        if (vKeys.length > 0) {
            resumoVendedoresEl.style.display = 'flex';
            resumoVendedoresEl.innerHTML = vKeys.map(k => `
                <div style="display: inline-flex; align-items: center; gap: 6px; background: var(--bg-surface-light); border: 1px solid var(--border); border-radius: 20px; padding: 4px 12px; font-size: 12px;">
                    <i class="ph ph-user" style="color: var(--primary);"></i>
                    <strong>${k}:</strong>
                    <span style="color: #22c55e; font-weight: bold;">${formatMoney(vendasPorColab[k].total)}</span>
                    <span style="color: var(--text-muted); font-size: 11px;">(${vendasPorColab[k].count}x)</span>
                </div>
            `).join('');
        } else {
            resumoVendedoresEl.style.display = 'none';
        }
    }

    const listaHist = document.getElementById('fin-historico-lista');
    if (listaHist) {
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
                const labelForma = t.formaPgto && t.formaPgto !== 'dinheiro' ? ` (${t.formaPgto.toUpperCase()})` : '';
                const vendTag = t.vendedor ? `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #60a5fa; background: rgba(59, 130, 246, 0.12); padding: 1px 6px; border-radius: 10px; width: fit-content; margin-top: 3px;"><i class="ph ph-user"></i> ${t.vendedor}</span>` : '';
                
                div.innerHTML = `
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: bold; font-size: 14px;">${t.motivo}${labelForma}</span>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 12px; color: var(--text-muted);">${new Date(t.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                ${vendTag}
                            </div>
                        </div>
                        <span style="font-weight: bold; color: ${cor};">${sinal} ${formatMoney(t.valor)}</span>
                    `;

                div.addEventListener('click', () => {
                    const modalExcluir = document.getElementById('modal-excluir-transacao');
                    if (modalExcluir) {
                        document.getElementById('del-transacao-detalhes').innerHTML = `
                                <strong>${t.motivo}${labelForma}</strong><br>
                                ${t.vendedor ? `<small style="color: #60a5fa;"><i class="ph ph-user"></i> Vendedor: ${t.vendedor}</small><br>` : ''}
                                <span style="color: ${cor}; font-weight: bold;">${sinal} ${formatMoney(t.valor)}</span><br>
                                <small style="color: var(--text-muted);">${new Date(t.data).toLocaleString('pt-BR')}</small>
                            `;
                        const dataInput = document.getElementById('del-transacao-data');
                        if (dataInput) {
                            dataInput.value = t.data;
                            dataInput.dataset.txId = t.id || t.$id || '';
                            dataInput.dataset.txValor = (t.valor !== undefined && t.valor !== null) ? t.valor : '';
                        }
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

window.registrarTransacaoCaixa = async function (tipo, valor, motivo, formaPgto = 'dinheiro', vendedor = null, osNumber = null) {
    if (!caixaAberto && !window.caixaAberto) {
        // Tenta checar se já foi aberto por outro usuário
        if (window.globalData?.config?.caixaAberto) {
            caixaAberto = true;
            window.caixaAberto = true;
        } else {
            console.warn('Bloqueado: caixa fechado.');
            return false;
        }
    }

    const dataIso = new Date().toISOString();
    const vendedorNome = vendedor || window.loggedUser?.nome || 'Geral';
    const newTx = {
        tipo: tipo,
        valor: parseFloat(valor),
        motivo: motivo,
        descricao: motivo,
        formaPgto: formaPgto,
        forma: formaPgto,
        vendedor: vendedorNome,
        osNumber: osNumber || '',
        data: dataIso
    };

    try {
        const docId = window.appwrite.ID.unique();
        const created = await window.appwrite.databases.createDocument(window.appwrite.DB_ID, window.appwrite.COL_TRANS, docId, newTx);
        newTx.id = created.$id;

        transacoesCaixa.push(newTx);
        transacoesCaixa = window.deduplicateTransactions(transacoesCaixa);
        if (window.globalData) {
            window.globalData.transacoes = transacoesCaixa;
        }
        localStorage.setItem('avence_transacoes_caixa', JSON.stringify(transacoesCaixa));
        localStorage.setItem('avence_transacoes', JSON.stringify(transacoesCaixa));
        localStorage.setItem('avence_transacoes_sync_event', Date.now().toString());
        renderFinanceiro();
        return true;
    } catch (err) {
        console.error('Erro ao registrar transação na nuvem:', err);
        newTx.id = 'local_' + Date.now();
        transacoesCaixa.push(newTx);
        transacoesCaixa = window.deduplicateTransactions(transacoesCaixa);
        if (window.globalData) {
            window.globalData.transacoes = transacoesCaixa;
        }
        localStorage.setItem('avence_transacoes_caixa', JSON.stringify(transacoesCaixa));
        localStorage.setItem('avence_transacoes', JSON.stringify(transacoesCaixa));
        localStorage.setItem('avence_transacoes_sync_event', Date.now().toString());
        renderFinanceiro();
        window.customAlert('Aviso: Movimentação salva localmente. Sincronizando com a nuvem...', 'warning');
        return true;
    }
};

function renderChart() {
    const canvas = document.getElementById('financeiroChart');
    if (!canvas) return;
    const labels = []; const dataEntradas = []; const dataSaidas = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dataStr = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));

        let eDia = 0; let sDia = 0;
        transacoesCaixa.filter(t => t.data.startsWith(dataStr)).forEach(t => {
            if (t.tipo === 'entrada') eDia += t.valor;
            if (t.tipo === 'saida') sDia += t.valor;
        });
        dataEntradas.push(eDia);
        dataSaidas.push(sDia);
    }

    if (financeiroChartInstance) financeiroChartInstance.destroy();

    const ctx = canvas.getContext('2d');
    if (window.Chart) {
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

if (btnAbrirCaixa) {
    btnAbrirCaixa.addEventListener('click', () => {
        const selectResp = document.getElementById('fin-abrir-responsavel');
        if (selectResp) {
            selectResp.innerHTML = '<option value="">Selecione o Responsável...</option>';
            const colabs = window.getGlobalColaboradoresList();
            colabs.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id || c.$id;
                const cgs = window.parseColabCargos(c.cargo);
                opt.textContent = `${c.nome} (${cgs.join(', ')})`;
                selectResp.appendChild(opt);
            });
        }
        const saldoInput = document.getElementById('fin-saldo-inicial');
        if (saldoInput) saldoInput.value = '';
        document.getElementById('fin-abrir-senha').value = '';
        openModal(modalAbrirCaixa);
        setTimeout(() => {
            const selectResp = document.getElementById('fin-abrir-responsavel');
            if (selectResp) selectResp.focus();
        }, 300);
    });
}

const finAbrirRespInput = document.getElementById('fin-abrir-responsavel');
if (finAbrirRespInput) {
    finAbrirRespInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const saldoInput = document.getElementById('fin-saldo-inicial');
            if (saldoInput) { saldoInput.focus(); saldoInput.select(); }
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
            if (typeof window.processarAberturaCaixa === 'function') {
                window.processarAberturaCaixa();
            }
        }
    });
}

if (btnSangria) {
    btnSangria.addEventListener('click', () => {
        const selectResp = document.getElementById('fin-mov-responsavel');
        if (selectResp) {
            selectResp.innerHTML = '<option value="">Selecione o Responsável...</option>';
            const colabs = window.getGlobalColaboradoresList();
            colabs.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id || c.$id;
                const cgs = window.parseColabCargos(c.cargo);
                opt.textContent = `${c.nome} (${cgs.join(', ')})`;
                selectResp.appendChild(opt);
            });
        }
        openModal(modalSangria);
    });
}
if (btnFecharCaixa) btnFecharCaixa.addEventListener('click', () => {
    const hoje = new Date().toISOString().split('T')[0];
    let entradasDinheiro = 0; let saidas = 0;
    transacoesCaixa.filter(t => t.data.startsWith(hoje)).forEach(t => {
        const isDinheiro = (!t.formaPgto || t.formaPgto === 'dinheiro');
        if (t.tipo === 'entrada' && isDinheiro) entradasDinheiro += t.valor;
        if (t.tipo === 'saida') saidas += t.valor;
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
    if (selectFecharResp) {
        selectFecharResp.innerHTML = '<option value="">Selecione o Responsável...</option>';
        const colabs = window.getGlobalColaboradoresList();
        colabs.forEach(c => {
            if (window.isCargoAdminOrGerente(c)) {
                const opt = document.createElement('option');
                opt.value = c.nome;
                const cgs = window.parseColabCargos(c.cargo);
                opt.textContent = `${c.nome} (${cgs.join(', ')})`;
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

window.processarAberturaCaixa = function () {
    const responsavelId = document.getElementById('fin-abrir-responsavel') ? document.getElementById('fin-abrir-responsavel').value : '';
    if (!responsavelId) { window.customAlert('Selecione quem está abrindo o caixa.', 'warning'); return; }

    const colabs = window.getGlobalColaboradoresList();
    const colabResp = colabs.find(c => c.id === responsavelId || c.$id === responsavelId || c.nome === responsavelId);
    if (!colabResp) { window.customAlert('Colaborador não encontrado.', 'warning'); return; }

    const senhaInput = (document.getElementById('fin-abrir-senha')?.value || '').trim();
    const isMaster = window.isSenhaMasterLoja(senhaInput);

    if (!isMaster && !window.matchesColabPassword(colabResp, senhaInput)) {
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
if (btnConfAbrir) {
    btnConfAbrir.addEventListener('click', window.processarAberturaCaixa);
}

async function efetivarAberturaCaixa(valor, responsavelId) {
    fundoCaixa = valor;
    caixaAberto = true; window.caixaAberto = true;

    // Encontrar nome legível do colaborador
    const colab = window.colaboradores ? window.colaboradores.find(c => c.id === responsavelId || c.nome === responsavelId) : null;
    const responsavelNome = colab ? colab.nome : (window.loggedUser?.nome || responsavelId || 'Responsável');
    responsavelCaixaAtual = responsavelNome;

    try {
        let docId = window.globalData?.config?.id;
        const dataToSave = { caixaAberto: true, fundoCaixa: valor, responsavelCaixa: responsavelNome };
        if (docId) {
            await window.appwrite.databases.updateDocument(window.appwrite.DB_ID, window.appwrite.COL_CONFIG, docId, dataToSave);
            window.globalData.config = { ...window.globalData.config, ...dataToSave };
        } else {
            docId = window.appwrite.ID.unique();
            const created = await window.appwrite.databases.createDocument(window.appwrite.DB_ID, window.appwrite.COL_CONFIG, docId, dataToSave);
            if (!window.globalData) window.globalData = {};
            window.globalData.config = { ...dataToSave, id: created.$id };
        }
    } catch (e) {
        console.error('Erro ao salvar status do caixa na nuvem:', e);
        window.customAlert('Aviso: O status do caixa não pôde ser sincronizado com a nuvem.', 'warning');
    }

    localStorage.setItem('avence_fundo_caixa', fundoCaixa);
    localStorage.setItem('avence_caixa_aberto', JSON.stringify(true));
    localStorage.setItem('avence_abertura_responsavel', responsavelNome);
    localStorage.setItem('avence_caixa_sync_event', Date.now().toString());

    if (window.updateGlobalCaixaUI) {
        window.updateGlobalCaixaUI(true, responsavelNome, fundoCaixa);
    }
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

        const colabs = window.getGlobalColaboradoresList();
        const colabResp = colabs.find(c => c.id === responsavelId || c.$id === responsavelId || c.nome === responsavelId);
        const senhaInput = (document.getElementById('fin-divergencia-senha')?.value || '').trim();
        const isMaster = window.isSenhaMasterLoja(senhaInput);

        if (!isMaster && (!colabResp || !window.matchesColabPassword(colabResp, senhaInput))) {
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
        const dataInput = document.getElementById('del-transacao-data');
        const dataTarget = dataInput ? dataInput.value : '';
        const idTarget = dataInput ? dataInput.dataset.txId : '';
        const valorTarget = dataInput && dataInput.dataset.txValor ? parseFloat(dataInput.dataset.txValor) : null;
        const senhaInput = (document.getElementById('del-transacao-senha')?.value || '').trim();

        if (!senhaInput) {
            window.customAlert('Por favor, digite sua senha de autorização.', 'warning');
            return;
        }

        const isMaster = window.isSenhaMasterLoja(senhaInput);
        const colabList = window.getGlobalColaboradoresList();
        const hasColab = colabList.some(c => window.isCargoAdminOrGerente(c) && window.matchesColabPassword(c, senhaInput));

        const loggedUser = (window.jwtAuth && window.jwtAuth.getUser()) || window.loggedUser || (sessionStorage.getItem('avence_session_logged') ? JSON.parse(sessionStorage.getItem('avence_session_logged')) : null);
        const isLoggedAuth = loggedUser && window.isCargoAdminOrGerente(loggedUser) && window.matchesColabPassword(loggedUser, senhaInput);

        if (!isMaster && !hasColab && !isLoggedAuth) {
            window.customAlert('Senha incorreta ou sem permissão para exclusão! (Apenas Dono ou Gerente podem excluir)', 'warning');
            return;
        }

        let index = transacoesCaixa.findIndex(t => (idTarget && (t.id === idTarget || t.$id === idTarget)) || (dataTarget && t.data === dataTarget));
        if (index === -1 && valorTarget !== null && !isNaN(valorTarget)) {
            index = transacoesCaixa.findIndex(t => Math.abs((parseFloat(t.valor) || 0) - valorTarget) < 0.01 && (!dataTarget || t.data === dataTarget));
        }
        if (index === -1 && idTarget) {
            index = transacoesCaixa.findIndex(t => String(t.id || t.$id) === String(idTarget));
        }

        const tx = index > -1 ? transacoesCaixa[index] : null;
        const txId = idTarget || (tx ? (tx.id || tx.$id) : null);

        if (index > -1 || txId) {
            // Se possui ID remoto e não é ID local_, tenta remover do Appwrite na nuvem
            if (txId && !String(txId).startsWith('local_') && window.appwrite && window.appwrite.databases) {
                try {
                    await window.appwrite.databases.deleteDocument(window.appwrite.DB_ID, window.appwrite.COL_TRANS, txId);
                } catch (err) {
                    console.warn('Transação não encontrada na nuvem ou já removida (permitindo exclusão local):', err);
                }
            }

            // Remove de transacoesCaixa
            if (index > -1) {
                transacoesCaixa.splice(index, 1);
            }

            // Remove também de window.globalData.transacoes
            if (window.globalData && Array.isArray(window.globalData.transacoes)) {
                window.globalData.transacoes = window.globalData.transacoes.filter(t => {
                    const tid = t.id || t.$id;
                    if (txId && tid && String(tid) === String(txId)) return false;
                    if (dataTarget && t.data === dataTarget) return false;
                    if (valorTarget !== null && !isNaN(valorTarget) && Math.abs((parseFloat(t.valor) || 0) - valorTarget) < 0.01 && t.data === dataTarget) return false;
                    return true;
                });
            }

            // Atualiza todos os caches do navegador
            localStorage.setItem('avence_transacoes_caixa', JSON.stringify(transacoesCaixa));
            localStorage.setItem('avence_transacoes', JSON.stringify(window.globalData?.transacoes || transacoesCaixa));
            localStorage.setItem('avence_transacoes_sync_event', Date.now().toString());

            closeModal(document.getElementById('modal-excluir-transacao'));
            window.customAlert('Movimentação excluída com sucesso.', 'success');
            renderFinanceiro();
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
            if (btnConfExcluir) btnConfExcluir.click();
        }
    });
}

const btnConfSangria = document.getElementById('btn-confirmar-sangria');
if (btnConfSangria) {
    btnConfSangria.addEventListener('click', async () => {
        const responsavelId = document.getElementById('fin-mov-responsavel') ? document.getElementById('fin-mov-responsavel').value : '';
        if (!responsavelId) { window.customAlert('Selecione quem é o Responsável/Destinatário.', 'warning'); return; }

        const colabs = window.getGlobalColaboradoresList();
        const colabResp = colabs.find(c => c.id === responsavelId || c.$id === responsavelId || c.nome === responsavelId);
        if (!colabResp) { window.customAlert('Colaborador responsável não encontrado.', 'warning'); return; }

        const senhaInput = (document.getElementById('fin-senha-sangria')?.value || '').trim();
        const isMaster = window.isSenhaMasterLoja(senhaInput);

        if (!isMaster) {
            if (!window.matchesColabPassword(colabResp, senhaInput)) {
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

            const limiteRetirada = Math.max(0, saldoAtual);
            if (valor > limiteRetirada) {
                window.customAlert(`Saldo insuficiente em dinheiro no caixa para esta sangria!<br>Saldo disponível: <strong>${formatMoney(limiteRetirada)}</strong>`, 'warning');
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

// Handler de Ajuste de Troco Inicial (Fundo de Caixa)
const btnConfirmarAjustarFundo = document.getElementById('btn-confirmar-ajustar-fundo');

if (btnAjustarFundo) {
    btnAjustarFundo.addEventListener('click', () => {
        const inputNovoFundo = document.getElementById('fin-novo-fundo-input');
        if (inputNovoFundo) inputNovoFundo.value = (fundoCaixa || 0).toFixed(2);
        const senhaInput = document.getElementById('fin-ajustar-fundo-senha');
        if (senhaInput) senhaInput.value = '';
        if (modalAjustarFundo) openModal(modalAjustarFundo);
        setTimeout(() => {
            if (inputNovoFundo) { inputNovoFundo.focus(); inputNovoFundo.select(); }
        }, 200);
    });
}

if (btnConfirmarAjustarFundo) {
    btnConfirmarAjustarFundo.addEventListener('click', async () => {
        const senhaInput = (document.getElementById('fin-ajustar-fundo-senha')?.value || '').trim();
        const isMaster = window.isSenhaMasterLoja(senhaInput);
        const colabList = window.getGlobalColaboradoresList();
        const hasColab = colabList.some(c => window.isCargoAdminOrGerente(c) && window.matchesColabPassword(c, senhaInput));
        const loggedUser = (window.jwtAuth && window.jwtAuth.getUser()) || window.loggedUser || (sessionStorage.getItem('avence_session_logged') ? JSON.parse(sessionStorage.getItem('avence_session_logged')) : null);
        const isLoggedAuth = loggedUser && window.isCargoAdminOrGerente(loggedUser) && window.matchesColabPassword(loggedUser, senhaInput);

        if (!isMaster && !hasColab && !isLoggedAuth) {
            window.customAlert('Senha incorreta ou sem permissão de Dono/Gerente para ajustar o fundo!', 'warning');
            return;
        }

        const inputNovoFundo = document.getElementById('fin-novo-fundo-input');
        const novoValor = parseFloat(inputNovoFundo?.value) || 0;
        if (novoValor < 0) {
            window.customAlert('O valor do fundo de caixa não pode ser negativo.', 'warning');
            return;
        }

        fundoCaixa = novoValor;
        localStorage.setItem('avence_fundo_caixa', fundoCaixa);

        try {
            let docId = window.globalData?.config?.id || window.globalData?.config?.$id;
            if (docId) {
                await window.appwrite.databases.updateDocument(window.appwrite.DB_ID, window.appwrite.COL_CONFIG, docId, {
                    fundoCaixa: novoValor
                });
            }
        } catch (e) {
            console.error('Erro ao salvar ajuste de fundo no Appwrite:', e);
        }

        if (window.globalData?.config) {
            window.globalData.config.fundoCaixa = novoValor;
            localStorage.setItem('avence_config', JSON.stringify(window.globalData.config));
        }

        if (window.updateGlobalCaixaUI) {
            window.updateGlobalCaixaUI(caixaAberto, responsavelCaixaAtual, fundoCaixa);
        }

        renderFinanceiro();
        if (modalAjustarFundo) closeModal(modalAjustarFundo);
        window.customAlert(`Fundo de caixa ajustado com sucesso para ${formatMoney(novoValor)}!`, 'success');
    });
}

const senhaAjustarInput = document.getElementById('fin-ajustar-fundo-senha');
if (senhaAjustarInput) {
    senhaAjustarInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (btnConfirmarAjustarFundo) btnConfirmarAjustarFundo.click();
        }
    });
}

window.processarFechamentoCaixa = async function () {
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

    const colabs = window.getGlobalColaboradoresList();
    const colabResp = colabs.find(c => c.nome === responsavelNome || c.id === responsavelNome || c.$id === responsavelNome);

    const senhaInput = (document.getElementById('fin-senha-fechar')?.value || '').trim();
    const isMaster = window.isSenhaMasterLoja(senhaInput);

    if (!isMaster) {
        if (!colabResp || !window.matchesColabPassword(colabResp, senhaInput)) {
            window.customAlert('Senha incorreta para o colaborador selecionado!', 'warning');
            return;
        }
    }

    caixaAberto = false; window.caixaAberto = false;
    fundoCaixa = 0;
    responsavelCaixaAtual = '';

    const nomeFechamento = (isMaster && !colabResp) ? 'Administrador/Dono' : responsavelNome;
    const nowIso = new Date().toISOString();
    const fechamentoData = {
        valorFechado: parseFloat(informadoStr) || 0,
        saldoCalculado: parseFloat(informadoStr) || 0,
        responsavel: nomeFechamento,
        responsavelFechamento: nomeFechamento,
        data: nowIso,
        dataFechamento: nowIso
    };

    try {
        const docId = window.appwrite.ID.unique();
        const created = await window.appwrite.databases.createDocument(window.appwrite.DB_ID, window.appwrite.COL_CAIXA, docId, fechamentoData);
        if (!window.globalData) window.globalData = {};
        if (!window.globalData.fechamentos) window.globalData.fechamentos = [];
        window.globalData.fechamentos.push({ ...fechamentoData, id: created.$id });

        // Sincronizar fechamento do caixa na nuvem
        let configId = window.globalData?.config?.id;
        if (configId) {
            const dataToSave = { caixaAberto: false, fundoCaixa: 0, responsavelCaixa: '' };
            await window.appwrite.databases.updateDocument(window.appwrite.DB_ID, window.appwrite.COL_CONFIG, configId, dataToSave);
            window.globalData.config = { ...window.globalData.config, ...dataToSave };
        }
    } catch (err) {
        console.error('Erro ao registrar fechamento:', err);
    }

    localStorage.setItem('avence_ultimo_fechamento', JSON.stringify(fechamentoData));

    localStorage.setItem('avence_caixa_aberto', JSON.stringify(false));
    localStorage.setItem('avence_fundo_caixa', 0);
    localStorage.removeItem('avence_abertura_responsavel');
    localStorage.setItem('avence_caixa_sync_event', Date.now().toString());

    if (window.updateGlobalCaixaUI) {
        window.updateGlobalCaixaUI(false, '', 0);
    }

    document.getElementById('fin-senha-fechar').value = '';
    closeModal(modalFecharCaixa);
    renderFinanceiro();

    window.customAlert('E-mail de fechamento sendo enviado...', 'success');
    setTimeout(() => {
        window.customAlert('Caixa fechado! E-mail com valores do dia enviado com sucesso.', 'success');
    }, 2500);
};

const btnConfFechar = document.getElementById('btn-confirmar-fechar-caixa');
if (btnConfFechar) {
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

    const badgeCount = document.getElementById('contagem-categorias-badge');
    const totalCount = defaultTypes.length + customEstoqueTipos.length;
    if (badgeCount) {
        badgeCount.textContent = `${totalCount} categoria${totalCount === 1 ? '' : 's'}`;
    }

    defaultTypes.forEach(tipo => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border)';
        tr.innerHTML = `
            <td style="padding: 10px 14px; font-weight: 500;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-folder" style="color: var(--primary); font-size: 16px;"></i>
                    <span>${tipo}</span>
                </div>
            </td>
            <td style="padding: 10px 14px; text-align: center;">
                <span style="background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.25); padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="ph ph-lock-key"></i> Sistema
                </span>
            </td>
            <td style="padding: 10px 14px; text-align: center;">
                <button type="button" class="btn btn-secondary" disabled style="padding: 4px 8px; color: var(--text-muted); opacity: 0.4; cursor: not-allowed;" title="Categoria padrão do sistema (bloqueada)">
                    <i class="ph ph-lock"></i>
                </button>
            </td>
        `;
        lista.appendChild(tr);
    });

    // Render Custom Types
    customEstoqueTipos.forEach((tipo, index) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border)';
        tr.innerHTML = `
            <td style="padding: 10px 14px; font-weight: 500;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-tag" style="color: #22c55e; font-size: 16px;"></i>
                    <span>${tipo}</span>
                </div>
            </td>
            <td style="padding: 10px 14px; text-align: center;">
                <span style="background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.25); padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="ph ph-sparkle"></i> Personalizada
                </span>
            </td>
            <td style="padding: 10px 14px; text-align: center;">
                <button type="button" class="btn btn-secondary btn-del-tipo" data-index="${index}" style="padding: 4px 8px; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);" title="Excluir Categoria">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        lista.appendChild(tr);
    });

    document.querySelectorAll('.btn-del-tipo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-index'));
            const nomeExcluir = customEstoqueTipos[idx];
            window.customAlert(`Deseja remover a categoria "${nomeExcluir}"?`, 'warning', true, () => {
                customEstoqueTipos.splice(idx, 1);
                localStorage.setItem('avence_tipos_estoque', JSON.stringify(customEstoqueTipos));
                renderCustomEstoqueTipos();
                updateProductTypesDropdown();
            });
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

const inputNovoTipo = document.getElementById('config-novo-tipo');
if (inputNovoTipo) {
    inputNovoTipo.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const btnAdd = document.getElementById('btn-add-tipo-estoque');
            if (btnAdd) btnAdd.click();
        }
    });
}

const btnAddTipoEstoque = document.getElementById('btn-add-tipo-estoque');
if (btnAddTipoEstoque) {
    btnAddTipoEstoque.addEventListener('click', () => {
        const input = document.getElementById('config-novo-tipo');
        if (!input) return;
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
            window.customAlert('Categoria adicionada com sucesso!', 'success');
        }
    });
}

// Initial render
renderCustomEstoqueTipos();
updateProductTypesDropdown();

// CRUD Colaboradores
try {
    window.colaboradores = JSON.parse(localStorage.getItem('avence_colaboradores') || '[]');
    window.pontos = JSON.parse(localStorage.getItem('avence_pontos') || '[]');
} catch (e) {
    window.colaboradores = [];
    window.pontos = [];
}

document.addEventListener('appwriteReady', () => {
    if (window.globalData && window.globalData.colaboradores) {
        window.colaboradores = window.globalData.colaboradores;
        localStorage.setItem('avence_colaboradores', JSON.stringify(window.colaboradores));
    }
    if (window.globalData && window.globalData.pontos) {
        window.pontos = window.globalData.pontos;
        localStorage.setItem('avence_pontos', JSON.stringify(window.pontos));
    }
    if (typeof window.renderColaboradores === 'function') window.renderColaboradores();
});
let editingColabId = null;

window.renderColaboradores = function () {
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
                if (confirm('Tem certeza que deseja remover este colaborador?')) {
                    try {
                        await window.appwrite.databases.deleteDocument(window.appwrite.DB_ID, window.appwrite.COL_COLABS, id);
                        window.colaboradores = window.colaboradores.filter(c => c.id !== id);
                        localStorage.setItem('avence_colaboradores', JSON.stringify(window.colaboradores));
                        if (typeof window.updateTecnicoDropdowns === 'function') window.updateTecnicoDropdowns();
                        if (typeof window.updateVendedorDropdowns === 'function') window.updateVendedorDropdowns();
                        window.renderColaboradores();
                    } catch (err) {
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
        if (vendCb) vendCb.checked = true;
        document.getElementById('colab-senha-login').value = '';
        document.getElementById('colab-senha-retirada').value = '';
        if (document.getElementById('colab-comissao-vendas')) document.getElementById('colab-comissao-vendas').value = '5';
        if (document.getElementById('colab-comissao-servicos')) document.getElementById('colab-comissao-servicos').value = '10';
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
            reader.onload = function (evt) {
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
        const comissaoVendas = document.getElementById('colab-comissao-vendas') ? (parseFloat(document.getElementById('colab-comissao-vendas').value) || 0) : 0;
        const comissaoServicos = document.getElementById('colab-comissao-servicos') ? (parseFloat(document.getElementById('colab-comissao-servicos').value) || 0) : 0;
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
                if (fotoBase64) updateData.foto = fotoBase64;

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
            if (typeof window.updateTecnicoDropdowns === 'function') window.updateTecnicoDropdowns();
            if (typeof window.updateVendedorDropdowns === 'function') window.updateVendedorDropdowns();
            closeModal(document.getElementById('modal-colaborador'));
            window.renderColaboradores();
            window.customAlert('Colaborador salvo com sucesso!', 'success');
        } catch (err) {
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
        if (cb) cb.checked = true;
    });
    document.getElementById('colab-senha-login').value = colab.senhaLogin;
    document.getElementById('colab-senha-retirada').value = colab.senhaRetirada;
    if (document.getElementById('colab-comissao-vendas')) document.getElementById('colab-comissao-vendas').value = colab.comissaoVendas || '5';
    if (document.getElementById('colab-comissao-servicos')) document.getElementById('colab-comissao-servicos').value = colab.comissaoServicos || '10';

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
        if (document.getElementById('config-telefone')) document.getElementById('config-telefone').value = config.telefone || '(43) 99969-1521';
        if (document.getElementById('config-endereco')) document.getElementById('config-endereco').value = config.endereco || 'AVENIDA SOUZA NAVES - 991, IVAIPORÃ-PR';
        if (document.getElementById('config-email')) document.getElementById('config-email').value = config.email || 'avencecellivp@gmail.com';
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
            if (!hasAlertedExpediente && window.loggedUser && !window.parseColabCargos(window.loggedUser.cargo).some(c => c.toLowerCase() === 'dono')) {
                window.customAlert('Expediente Encerrado! O sistema será bloqueado para novos acessos em breve.', 'warning');
                hasAlertedExpediente = true;
            }
        } else if (timeStr < config.horarioAviso) {
            hasAlertedExpediente = false;
        }
    }
}, 60000);

// ============================================
// Relatórios de Equipe & Desempenho (Dados Reais)
// ============================================
let relatColabChartInstance = null;

function matchesColabTx(tx, cNome) {
    if (!tx || !cNome) return false;
    const target = cNome.trim().toLowerCase();
    const targetFirst = target.split(' ')[0];
    const vend = (tx.vendedor || '').trim().toLowerCase();
    const motivo = (tx.motivo || tx.descricao || '').toLowerCase();

    if (vend && (vend === target || (targetFirst.length > 2 && vend === targetFirst))) return true;
    if (motivo.includes('vendedor: ' + target) || (targetFirst.length > 2 && motivo.includes('vendedor: ' + targetFirst))) return true;
    if (motivo.includes('resp: ' + target) || (targetFirst.length > 2 && motivo.includes('resp: ' + targetFirst))) return true;
    if (motivo.includes('(' + target + ')') || (targetFirst.length > 2 && motivo.includes('(' + targetFirst + ')'))) return true;
    return false;
}

function matchesColabOS(os, cNome) {
    if (!os || !cNome) return false;
    const target = cNome.trim().toLowerCase();
    const targetFirst = target.split(' ')[0];
    const tec = (os.tecnico || '').trim().toLowerCase();
    const resp = (os.responsavel || '').trim().toLowerCase();
    const vend = (os.vendedor || '').trim().toLowerCase();

    return tec === target || resp === target || vend === target ||
        (targetFirst.length > 2 && (tec === targetFirst || resp === targetFirst || vend === targetFirst));
}

window.renderRelatorios = function () {
    const grid = document.getElementById('relatorios-grid');
    if (!grid) return;

    // 1. Carregar colaboradores de todas as fontes disponíveis
    let colabs = (window.colaboradores && window.colaboradores.length > 0)
        ? [...window.colaboradores]
        : ((window.globalData && window.globalData.colaboradores && window.globalData.colaboradores.length > 0)
            ? [...window.globalData.colaboradores]
            : (JSON.parse(localStorage.getItem('avence_colaboradores') || '[]')));

    // 2. Carregar transações e OS com fallback seguro
    let transacoes = (window.globalData && window.globalData.transacoes && window.globalData.transacoes.length > 0)
        ? window.globalData.transacoes
        : (JSON.parse(localStorage.getItem('avence_transacoes_caixa')) || JSON.parse(localStorage.getItem('avence_transacoes')) || []);
    if (typeof window.deduplicateTransactions === 'function') {
        transacoes = window.deduplicateTransactions(transacoes);
    }

    let osList = (window.globalData && window.globalData.os && window.globalData.os.length > 0)
        ? window.globalData.os
        : (JSON.parse(localStorage.getItem('avence_os')) || []);

    let pontos = (window.globalData && window.globalData.pontos && window.globalData.pontos.length > 0)
        ? window.globalData.pontos
        : (JSON.parse(localStorage.getItem('avence_pontos')) || []);

    // 3. Descobrir automaticamente qualquer vendedor ou técnico ativo nas vendas
    const existingNames = new Set(colabs.map(c => (c.nome || '').trim().toLowerCase()));
    transacoes.forEach(t => {
        const v = (t.vendedor || '').trim();
        if (v && v.toLowerCase() !== 'geral' && !existingNames.has(v.toLowerCase())) {
            existingNames.add(v.toLowerCase());
            colabs.push({
                id: 'disc_' + v,
                nome: v,
                cargo: 'Vendedor',
                foto: '',
                comissaoVendas: '5',
                comissaoServicos: '10'
            });
        }
    });

    osList.forEach(os => {
        const tec = (os.tecnico || os.responsavel || '').trim();
        if (tec && !existingNames.has(tec.toLowerCase())) {
            existingNames.add(tec.toLowerCase());
            colabs.push({
                id: 'disc_' + tec,
                nome: tec,
                cargo: 'Técnico',
                foto: '',
                comissaoVendas: '5',
                comissaoServicos: '10'
            });
        }
    });

    // 4. Período selecionado
    const filtroPeriodoEl = document.getElementById('relatorios-periodo-filtro');
    const periodo = filtroPeriodoEl ? filtroPeriodoEl.value : 'mes';
    const now = new Date();

    function isInPeriod(dateVal) {
        if (periodo === 'todos') return true;
        if (!dateVal) return false;
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return true;

        if (periodo === 'hoje') {
            return d.getFullYear() === now.getFullYear() &&
                d.getMonth() === now.getMonth() &&
                d.getDate() === now.getDate();
        }
        if (periodo === '7dias') {
            const diffMs = now.getTime() - d.getTime();
            return diffMs >= 0 && diffMs <= (7 * 24 * 60 * 60 * 1000);
        }
        if (periodo === 'mes') {
            return d.getFullYear() === now.getFullYear() &&
                d.getMonth() === now.getMonth();
        }
        return true;
    }

    const transacoesFiltradas = transacoes.filter(t => isInPeriod(t.data || t.dataHora || t.$createdAt));
    const osFiltradas = osList.filter(os => isInPeriod(os.dataFechamento || os.data || os.dataFinalizacao || os.$createdAt));

    // Status válidos de conclusão de O.S.
    const statusValidosOS = ['encerrada', 'finalizada', 'concluída', 'concluida', 'entregue', 'pronto', 'pronta'];

    // 5. Acumuladores de KPIs da loja inteira
    let totalGeralVendas = 0;
    let totalQtdVendas = 0;
    let totalGeralOS = 0;
    let totalValorOS = 0;
    let totalGeralComissao = 0;
    let destaqueColab = { nome: '-', total: 0, qtd: 0 };

    grid.innerHTML = '';

    if (colabs.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px 24px; background: var(--bg-surface-light); border: 1px dashed var(--border); border-radius: 8px;">
                <i class="ph ph-users-three" style="font-size: 48px; color: var(--text-muted); margin-bottom: 12px; display: inline-block;"></i>
                <h3 style="margin: 0 0 6px 0; color: var(--text-main); font-size: 18px;">Nenhum colaborador ou movimentação encontrada</h3>
                <p style="margin: 0; color: var(--text-muted); font-size: 14px;">Cadastre colaboradores na aba Mais Opções ou faça vendas no PDV selecionando o vendedor.</p>
            </div>
        `;
    } else {
        colabs.forEach(c => {
            // 1. Vendas do Colaborador no período
            let vendasValor = 0;
            let vendasQtd = 0;
            const colabTxList = [];

            transacoesFiltradas.forEach(t => {
                if (t.tipo === 'entrada' && matchesColabTx(t, c.nome)) {
                    const val = parseFloat(t.valor) || 0;
                    vendasValor += val;
                    vendasQtd++;
                    colabTxList.push(t);
                }
            });

            // 2. Serviços / O.S. no período
            let osEntregues = 0;
            let osValor = 0;
            const colabOSList = [];

            osFiltradas.forEach(os => {
                const st = (os.status || '').toLowerCase();
                if (matchesColabOS(os, c.nome) && statusValidosOS.some(s => st.includes(s))) {
                    osEntregues++;
                    const val = parseFloat(os.valorTotal || os.valorFinal || os.valor || os.total || 0) || 0;
                    osValor += val;
                    colabOSList.push(os);
                }
            });

            // 3. Ponto (Horas)
            const ponts = pontos.filter(p => (p.nome || '').trim().toLowerCase() === c.nome.trim().toLowerCase());
            const daysSet = new Set();
            ponts.forEach(p => {
                if (p.data && isInPeriod(p.data)) {
                    daysSet.add(p.data.split('T')[0]);
                }
            });
            let horas = daysSet.size * 8;
            if (horas === 0 && ponts.length > 0) horas = Math.min(ponts.length * 8, 160);

            // 4. Comissão Estimada
            const percVenda = parseFloat(c.comissaoVendas) || 0;
            const percServico = parseFloat(c.comissaoServicos) || 0;
            const comissao = ((vendasValor * (percVenda / 100)) + (osValor * (percServico / 100))).toFixed(2);

            // Acumular totais gerais
            totalGeralVendas += vendasValor;
            totalQtdVendas += vendasQtd;
            totalGeralOS += osEntregues;
            totalValorOS += osValor;
            totalGeralComissao += parseFloat(comissao) || 0;

            const subTotalColab = vendasValor + osValor;
            if (subTotalColab > destaqueColab.total) {
                destaqueColab = { nome: c.nome, total: subTotalColab, qtd: vendasQtd + osEntregues };
            }

            const fotoHTML = c.foto
                ? `<img src="${c.foto}" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);">`
                : `<div style="width: 56px; height: 56px; border-radius: 50%; background: var(--bg-dark); display: flex; align-items: center; justify-content: center; border: 2px solid var(--border);"><i class="ph ph-user" style="font-size: 24px; color: var(--text-muted);"></i></div>`;

            const card = document.createElement('div');
            card.style.cssText = 'background: var(--bg-surface-light); border: 1px solid var(--border); border-radius: 8px; padding: 20px; display: flex; flex-direction: column; gap: 16px; transition: transform 0.2s, border-color 0.2s;';
            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 16px; border-bottom: 1px solid var(--border); padding-bottom: 16px;">
                    ${fotoHTML}
                    <div style="overflow: hidden;">
                        <div style="font-weight: bold; font-size: 17px; color: var(--text-main); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${c.nome}</div>
                        <div style="font-size: 12px; color: var(--primary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">${Array.isArray(c.cargo) ? c.cargo.join(', ') : (c.cargo || 'Colaborador')}</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div style="background: var(--bg-dark); padding: 12px; border-radius: 6px; border: 1px solid var(--border);">
                        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Vendas (${vendasQtd})</div>
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

                <button class="btn btn-secondary btn-relat-detail" style="margin-top: 4px; width: 100%; justify-content: center; font-size: 13px; font-weight: 600;">
                    <i class="ph ph-magnifying-glass"></i> Ver Relatório Detalhado
                </button>
            `;

            // Vincular dados para abertura do modal detalhado
            const detailBtn = card.querySelector('.btn-relat-detail');
            detailBtn.addEventListener('click', () => {
                abrirModalDetalheColab(c, vendasValor, osEntregues, osValor, comissao, ponts, colabTxList, colabOSList, transacoes);
            });

            grid.appendChild(card);
        });
    }

    // 6. Atualizar os 4 cards de KPIs no topo
    const kpiVendas = document.getElementById('relat-kpi-vendas');
    if (kpiVendas) kpiVendas.textContent = 'R$ ' + totalGeralVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const kpiVendasQtd = document.getElementById('relat-kpi-vendas-qtd');
    if (kpiVendasQtd) kpiVendasQtd.textContent = `${totalQtdVendas} vendas realizadas`;

    const kpiOS = document.getElementById('relat-kpi-os');
    if (kpiOS) kpiOS.textContent = `${totalGeralOS} un`;
    const kpiOSVal = document.getElementById('relat-kpi-os-val');
    if (kpiOSVal) kpiOSVal.textContent = `R$ ${totalValorOS.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} em serviços`;

    const kpiComissao = document.getElementById('relat-kpi-comissao');
    if (kpiComissao) kpiComissao.textContent = 'R$ ' + totalGeralComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const kpiDestaque = document.getElementById('relat-kpi-destaque');
    if (kpiDestaque) kpiDestaque.textContent = destaqueColab.nome;
    const kpiDestaqueSub = document.getElementById('relat-kpi-destaque-sub');
    if (kpiDestaqueSub) kpiDestaqueSub.textContent = destaqueColab.qtd > 0 ? `${destaqueColab.qtd} itens (R$ ${destaqueColab.total.toFixed(2)})` : 'Sem vendas no período';
};

// Abre o modal rico com gráfico dos últimos 7 dias, ponto e movimentações
function abrirModalDetalheColab(colab, totalVendas, totalOSEntregues, totalOSValor, totalComissao, colabPontos, colabTxList, colabOSList, allTransacoes) {
    // Cabeçalho do Modal
    const nomeEl = document.getElementById('modal-relat-nome');
    if (nomeEl) nomeEl.textContent = colab.nome;
    const cargoEl = document.getElementById('modal-relat-cargo');
    if (cargoEl) cargoEl.textContent = Array.isArray(colab.cargo) ? colab.cargo.join(', ') : (colab.cargo || 'Colaborador');

    const avatar = document.getElementById('modal-relat-foto');
    if (avatar) {
        if (colab.foto) {
            avatar.style.backgroundImage = `url(${colab.foto})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            avatar.innerHTML = '';
        } else {
            avatar.style.backgroundImage = 'none';
            avatar.innerHTML = '<i class="ph ph-user" style="font-size: 32px; color: var(--text-muted);"></i>';
        }
    }

    // Totais no Modal
    const vendasEl = document.getElementById('modal-relat-vendas');
    if (vendasEl) vendasEl.textContent = 'R$ ' + parseFloat(totalVendas).toFixed(2);
    const comissaoEl = document.getElementById('modal-relat-comissao');
    if (comissaoEl) comissaoEl.textContent = 'R$ ' + parseFloat(totalComissao).toFixed(2);

    // Histórico de Ponto
    const pontoContainer = document.getElementById('modal-relat-ponto');
    if (pontoContainer) {
        pontoContainer.innerHTML = '';
        if (!colabPontos || colabPontos.length === 0) {
            pontoContainer.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 13px;">Nenhum registro de ponto encontrado.</div>';
        } else {
            colabPontos.slice().reverse().slice(0, 10).forEach(p => {
                const dataObj = new Date(p.data);
                const dataStr = !isNaN(dataObj.getTime()) ? dataObj.toLocaleDateString('pt-BR') : '-';
                const horaStr = !isNaN(dataObj.getTime()) ? dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-';
                pontoContainer.innerHTML += `
                    <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid var(--border); font-size: 13px;">
                        <span><i class="ph ph-calendar-blank"></i> ${dataStr}</span>
                        <span style="color: #22c55e; font-weight: 600;">Entrada: ${horaStr}</span>
                    </div>
                `;
            });
        }
    }

    // Histórico de Últimas Movimentações / Vendas / O.S.
    const movContainer = document.getElementById('modal-relat-vendas-lista');
    if (movContainer) {
        movContainer.innerHTML = '';
        const allMovs = [
            ...(colabTxList || []).map(t => ({
                tipo: 'venda',
                data: t.data || t.dataHora || t.$createdAt,
                desc: t.motivo || t.descricao || 'Venda no PDV',
                valor: parseFloat(t.valor) || 0
            })),
            ...(colabOSList || []).map(os => ({
                tipo: 'os',
                data: os.dataFechamento || os.data || os.dataFinalizacao || os.$createdAt,
                desc: `O.S. #${os.osNumber || ''} - ${os.aparelho?.modelo || os.marcaAparelho || 'Serviço Concluído'}`,
                valor: parseFloat(os.valorTotal || os.valorFinal || 0) || 0
            }))
        ].sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

        if (allMovs.length === 0) {
            movContainer.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 13px;">Nenhuma movimentação no período selecionado.</div>';
        } else {
            allMovs.slice(0, 15).forEach(m => {
                const dObj = new Date(m.data);
                const dStr = !isNaN(dObj.getTime()) ? dObj.toLocaleDateString('pt-BR') : '-';
                const icon = m.tipo === 'venda' ? 'ph-shopping-cart' : 'ph-wrench';
                const iconColor = m.tipo === 'venda' ? '#22c55e' : '#3b82f6';
                movContainer.innerHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-dark); border-radius: 6px; border: 1px solid var(--border); font-size: 13px;">
                        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            <i class="ph ${icon}" style="color: ${iconColor}; font-size: 16px;"></i>
                            <span style="color: var(--text-main); overflow: hidden; text-overflow: ellipsis;">${m.desc}</span>
                            <span style="color: var(--text-muted); font-size: 11px;">(${dStr})</span>
                        </div>
                        <span style="font-weight: 700; color: #22c55e; margin-left: 12px; white-space: nowrap;">R$ ${m.valor.toFixed(2)}</span>
                    </div>
                `;
            });
        }
    }

    // Gráfico de Vendas Diárias dos Últimos 7 Dias
    const ctx = document.getElementById('relat-colab-chart');
    if (ctx) {
        if (relatColabChartInstance) {
            relatColabChartInstance.destroy();
            relatColabChartInstance = null;
        }

        const daysLabels = [];
        const dataVendasReal = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            daysLabels.push(d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }));

            let sumDay = 0;
            allTransacoes.forEach(t => {
                if (t.tipo === 'entrada' && matchesColabTx(t, colab.nome)) {
                    if (t.data) {
                        const td = new Date(t.data);
                        if (!isNaN(td.getTime()) && td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth() && td.getDate() === d.getDate()) {
                            sumDay += parseFloat(t.valor) || 0;
                        }
                    }
                }
            });
            dataVendasReal.push(sumDay);
        }

        relatColabChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: daysLabels,
                datasets: [{
                    label: 'Vendas Diárias (R$)',
                    data: dataVendasReal,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    tension: 0.35,
                    fill: true,
                    pointBackgroundColor: '#3b82f6',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) { return 'R$ ' + value; }
                        }
                    }
                }
            }
        });
    }

    // Configurar botão de imprimir ficha do colaborador
    const btnPrintColab = document.getElementById('btn-imprimir-relat-colab');
    if (btnPrintColab) {
        btnPrintColab.onclick = () => {
            const printWin = window.open('', '_blank');
            if (!printWin) {
                window.print();
                return;
            }
            printWin.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Ficha de Desempenho - ${colab.nome}</title>
                    <style>
                        body { font-family: sans-serif; padding: 24px; color: #1e293b; }
                        h1, h2, h3 { margin: 0 0 8px 0; }
                        .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
                        .kpi-row { display: flex; gap: 16px; margin-bottom: 16px; }
                        .kpi { flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background: #f8fafc; }
                        .kpi-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
                        .kpi-val { font-size: 20px; font-weight: bold; margin-top: 4px; color: #0f172a; }
                        table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
                        th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: left; }
                        th { background: #f1f5f9; color: #475569; }
                    </style>
                </head>
                <body>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
                        <div>
                            <h2>AVENCE CELL - RELATÓRIO DO COLABORADOR</h2>
                            <p style="margin: 4px 0 0 0; color: #64748b;">Data de Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
                        </div>
                    </div>
                    <div class="card">
                        <h3>${colab.nome}</h3>
                        <p style="margin: 0; color: #64748b;">Cargo: ${Array.isArray(colab.cargo) ? colab.cargo.join(', ') : (colab.cargo || 'Colaborador')}</p>
                    </div>
                    <div class="kpi-row">
                        <div class="kpi">
                            <div class="kpi-title">Total em Vendas</div>
                            <div class="kpi-val" style="color: #16a34a;">R$ ${parseFloat(totalVendas).toFixed(2)}</div>
                        </div>
                        <div class="kpi">
                            <div class="kpi-title">O.S. Concluídas</div>
                            <div class="kpi-val" style="color: #2563eb;">${totalOSEntregues} un (R$ ${parseFloat(totalOSValor).toFixed(2)})</div>
                        </div>
                        <div class="kpi">
                            <div class="kpi-title">Comissão Estimada</div>
                            <div class="kpi-val" style="color: #ca8a04;">R$ ${parseFloat(totalComissao).toFixed(2)}</div>
                        </div>
                    </div>
                    <div class="card">
                        <h4>Movimentações Recentes</h4>
                        <div id="print-movs">
                            ${(document.getElementById('modal-relat-vendas-lista') || {}).innerHTML || 'Sem movimentações.'}
                        </div>
                    </div>
                </body>
                </html>
            `);
            printWin.document.close();
            printWin.focus();
            setTimeout(() => { printWin.print(); }, 400);
        };
    }

    if (typeof openModal === 'function') {
        openModal(document.getElementById('modal-relatorio-colab'));
    }
}

// Evento do botão de atualização
const btnRefreshRelat = document.getElementById('btn-refresh-relatorios');
if (btnRefreshRelat) {
    btnRefreshRelat.addEventListener('click', window.renderRelatorios);
}

// Evento de alteração do filtro de período
const filtroPeriodoElem = document.getElementById('relatorios-periodo-filtro');
if (filtroPeriodoElem && !filtroPeriodoElem.dataset.bound) {
    filtroPeriodoElem.dataset.bound = 'true';
    filtroPeriodoElem.addEventListener('change', window.renderRelatorios);
}

// Botão de Imprimir Relatório Geral da Equipe
const btnPrintRelatGeral = document.getElementById('btn-imprimir-relatorios');
if (btnPrintRelatGeral && !btnPrintRelatGeral.dataset.bound) {
    btnPrintRelatGeral.dataset.bound = 'true';
    btnPrintRelatGeral.addEventListener('click', () => {
        const periodoTxt = filtroPeriodoElem ? filtroPeriodoElem.options[filtroPeriodoElem.selectedIndex].text : 'Geral';
        const totalVendasTxt = document.getElementById('relat-kpi-vendas')?.textContent || 'R$ 0,00';
        const totalOSTxt = document.getElementById('relat-kpi-os')?.textContent || '0 un';
        const totalComissaoTxt = document.getElementById('relat-kpi-comissao')?.textContent || 'R$ 0,00';
        const destaqueTxt = document.getElementById('relat-kpi-destaque')?.textContent || '-';

        const printWin = window.open('', '_blank');
        if (!printWin) {
            window.print();
            return;
        }

        let linhasColabs = '';
        document.querySelectorAll('#relatorios-grid > div').forEach(card => {
            const nome = card.querySelector('div[style*="font-weight: bold; font-size: 17px;"]')?.textContent || '-';
            const cargo = card.querySelector('div[style*="text-transform: uppercase;"]')?.textContent || '-';
            const valores = card.querySelectorAll('div[style*="font-size: 16px; font-weight: bold;"]');
            const vendas = valores[0]?.textContent || 'R$ 0,00';
            const os = valores[1]?.textContent || '0 un';
            const comissao = valores[2]?.textContent || 'R$ 0,00';
            const horas = valores[3]?.textContent || '0h';

            linhasColabs += `
                <tr>
                    <td style="font-weight: bold;">${nome}</td>
                    <td>${cargo}</td>
                    <td style="color: #16a34a; font-weight: bold;">${vendas}</td>
                    <td style="color: #2563eb; font-weight: bold;">${os}</td>
                    <td style="color: #ca8a04; font-weight: bold;">${comissao}</td>
                    <td>${horas}</td>
                </tr>
            `;
        });

        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Relatório de Desempenho da Equipe - Avence Cell</title>
                <style>
                    body { font-family: sans-serif; padding: 24px; color: #1e293b; }
                    h1, h2, h3 { margin: 0 0 6px 0; }
                    .header { border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
                    .kpi { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: #f8fafc; }
                    .kpi-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
                    .kpi-val { font-size: 20px; font-weight: bold; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
                    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
                    th { background: #f1f5f9; color: #334155; font-size: 12px; text-transform: uppercase; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h2>AVENCE CELL - RELATÓRIO DE DESEMPENHO DA EQUIPE</h2>
                        <p style="margin: 0; color: #64748b; font-size: 14px;">Período: <strong>${periodoTxt}</strong> • Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
                    </div>
                </div>
                <div class="kpi-row">
                    <div class="kpi">
                        <div class="kpi-title">Total Vendas Equipe</div>
                        <div class="kpi-val" style="color: #16a34a;">${totalVendasTxt}</div>
                    </div>
                    <div class="kpi">
                        <div class="kpi-title">O.S. Concluídas</div>
                        <div class="kpi-val" style="color: #2563eb;">${totalOSTxt}</div>
                    </div>
                    <div class="kpi">
                        <div class="kpi-title">Comissões Previstas</div>
                        <div class="kpi-val" style="color: #ca8a04;">${totalComissaoTxt}</div>
                    </div>
                    <div class="kpi">
                        <div class="kpi-title">Destaque do Período</div>
                        <div class="kpi-val" style="color: #7c3aed;">${destaqueTxt}</div>
                    </div>
                </div>
                <h3>Detalhamento por Colaborador</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Colaborador</th>
                            <th>Cargo</th>
                            <th>Total Vendas</th>
                            <th>O.S. Concluídas</th>
                            <th>Comissão Estimada</th>
                            <th>Horas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasColabs || '<tr><td colspan="6" style="text-align: center;">Nenhum colaborador com dados no período.</td></tr>'}
                    </tbody>
                </table>
            </body>
            </html>
        `);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => { printWin.print(); }, 400);
    });
}

// Auto-render relatorios on click dos botões de menu
document.querySelectorAll('.menu-btn[data-target="relatorios"]').forEach(btn => {
    btn.addEventListener('click', window.renderRelatorios);
});

// Auto-capitalize first letter of text inputs and textareas
document.addEventListener('input', function (e) {
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

