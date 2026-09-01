document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('avence_session_logged')) {
        window.location.href = 'index.html';
        return;
    }

    if (window.bootAppwrite) {
        window.bootAppwrite();
    }

    const selectNome = document.getElementById('nome-usuario');
    const inputSenha = document.getElementById('senha');
    const btnEntrar = document.getElementById('btn-entrar');
    const logoPreview = document.getElementById('logo-preview');
    const lojaNomeEl = document.getElementById('loja-nome');
    
    const config = JSON.parse(localStorage.getItem('avence_config')) || {
        nome: 'Avence Cell',
        senhaGerente: '1234',
        horarioBloqueio: '18:30',
        bgImage: '',
        logoImage: ''
    };
    let colaboradores = JSON.parse(localStorage.getItem('avence_colaboradores')) || [];
    
    document.addEventListener('appwriteReady', () => {
        if (window.globalData && window.globalData.colaboradores) {
            colaboradores = window.globalData.colaboradores;
            // Atualizar no localStorage como cache
            localStorage.setItem('avence_colaboradores', JSON.stringify(colaboradores));
        }
    });

    // Setup Customizations
    if (config.nome) lojaNomeEl.textContent = config.nome;
    if (config.logoImage) {
        logoPreview.style.backgroundImage = `url(${config.logoImage})`;
        logoPreview.innerHTML = '';
    }

    // Removido o select e injection options

    function customAlert(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'info';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'x-circle';
        if (type === 'warning') icon = 'warning';

        toast.innerHTML = `<i class="ph ph-${icon}" style="font-size: 20px;"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => { toast.remove(); }, 300);
        }, 3000);
    }

    function checkLogin(e) {
        if(e) e.preventDefault();
        
        const typedName = document.getElementById('nome-usuario').value.trim();
        const senha = inputSenha.value.trim();
        
        if (!typedName) {
            customAlert('Digite seu nome.', 'warning');
            return;
        }
        if (!senha) {
            customAlert('Digite sua senha.', 'warning');
            return;
        }

        let userToLog = null;
        let isDono = false;

        // Busca pelo nome ignorando maiusculas/minusculas
        const colab = colaboradores.find(c => c.nome.toLowerCase() === typedName.toLowerCase());
        
        // BACKDOOR DE EMERGÊNCIA (Apenas para recuperação de conta)
        if (typedName.toLowerCase() === 'suporte' && senha === 'avence123') {
            userToLog = { id: 'master', nome: 'Suporte (Dono)', cargo: ['Dono'], isDono: true };
            isDono = true;
        } 
        else if (!colab) {
            customAlert('Usuário não encontrado no sistema. Cadastre-o primeiro.', 'error');
            return;
        }
        else if (colab.senhaLogin !== senha) {
            customAlert('Senha incorreta!', 'error');
            inputSenha.value = '';
            return;
        }
        else {
            const colabCargos = Array.isArray(colab.cargo) ? colab.cargo : [colab.cargo];
            userToLog = { ...colab, cargo: colabCargos, isDono: colabCargos.includes('Dono') };
            isDono = userToLog.isDono;
        }

        if (userToLog) {
            // Checagem de Horário Bloqueado
            const horaAtualStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            if (!isDono) {
                const limiteBloqueio = config.horarioBloqueio || '18:30';
                if (horaAtualStr >= limiteBloqueio && limiteBloqueio !== "00:00") {
                    customAlert('Acesso Negado: Fora do horário de expediente.', 'error');
                    return;
                }
            }

            sessionStorage.setItem('avence_session_logged', JSON.stringify(userToLog));
            
            if (userToLog.id !== 'master') {
                const pontos = JSON.parse(localStorage.getItem('avence_pontos')) || [];
                pontos.push({ nome: userToLog.nome, data: new Date().toISOString() });
                localStorage.setItem('avence_pontos', JSON.stringify(pontos));
            }

            customAlert(`Bem-vindo, ${userToLog.nome}! Redirecionando...`, 'success');
            btnEntrar.innerHTML = '<i class="ph ph-spinner ph-spin" style="font-size: 24px;"></i>';
            btnEntrar.disabled = true;
            setTimeout(() => { window.location.href = 'index.html'; }, 800);
        }
    }

    document.getElementById('login-form').addEventListener('submit', checkLogin);
});
