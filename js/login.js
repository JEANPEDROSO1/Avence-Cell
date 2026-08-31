document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('avence_session_logged')) {
        window.location.href = 'index.html';
        return;
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
    const colaboradores = JSON.parse(localStorage.getItem('avence_colaboradores')) || [];

    // Setup Customizations
    if (config.nome) lojaNomeEl.textContent = config.nome;
    if (config.bgImage) document.getElementById('bg-image').style.backgroundImage = `url(${config.bgImage})`;
    if (config.logoImage) {
        logoPreview.style.backgroundImage = `url(${config.logoImage})`;
        logoPreview.innerHTML = '';
    }

    // Populate Select
    const optDono = document.createElement('option');
    optDono.value = 'master';
    optDono.textContent = 'Administrador (Dono)';
    selectNome.appendChild(optDono);

    colaboradores.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.nome;
        selectNome.appendChild(opt);
    });

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

    function checkLogin() {
        const selectedId = selectNome.value;
        const senha = inputSenha.value.trim();
        
        if (!selectedId) {
            customAlert('Selecione seu nome na lista.', 'warning');
            return;
        }
        if (!senha) {
            customAlert('Digite sua senha.', 'warning');
            return;
        }

        let userToLog = null;
        let isDono = false;

        if (selectedId === 'master') {
            if (senha === config.senhaGerente) {
                userToLog = { id: 'master', nome: 'Dono (Master)', cargo: ['Dono'], isDono: true };
                isDono = true;
            }
        } else {
            const colab = colaboradores.find(c => c.id === selectedId);
            if (colab && colab.senhaLogin === senha) {
                const colabCargos = Array.isArray(colab.cargo) ? colab.cargo : [colab.cargo];
                userToLog = { ...colab, cargo: colabCargos, isDono: colabCargos.includes('Dono') };
                isDono = userToLog.isDono;
            }
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
        } else {
            customAlert('Senha incorreta!', 'error');
            inputSenha.value = '';
        }
    }

    btnEntrar.addEventListener('click', checkLogin);
    inputSenha.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkLogin();
    });
});
