document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial State
    // Se o usuário já estiver logado, manda pro sistema direto (se ele tentou acessar o login de propósito)
    if (sessionStorage.getItem('avence_session_logged')) {
        window.location.href = 'index.html';
        return;
    }

    const inputSenha = document.getElementById('senha');
    const btnEntrar = document.getElementById('btn-entrar');
    const avatarPreview = document.getElementById('avatar-preview');
    
    // Ler configs do localStorage (o banco que está sendo usado no momento)
    const config = JSON.parse(localStorage.getItem('avence_config')) || {
        senhaGerente: '1234',
        horarioBloqueio: '18:30',
        bgImage: ''
    };
    const colaboradores = JSON.parse(localStorage.getItem('avence_colaboradores')) || [];

    // Set Background Image Se existir
    if (config.bgImage) {
        document.getElementById('bg-image').style.backgroundImage = `url(${config.bgImage})`;
    }

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
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    function checkLogin() {
        const senha = inputSenha.value.trim();
        if (!senha) return;

        // --- Checagem de Horário Bloqueado ---
        const horaAtualStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const isDono = (senha === config.senhaGerente);
        const colab = colaboradores.find(c => c.senhaLogin === senha);
        
        if (!isDono) {
            const limiteBloqueio = config.horarioBloqueio || '18:30';
            if (horaAtualStr >= limiteBloqueio && limiteBloqueio !== "00:00") {
                customAlert('Acesso Negado: Fora do horário de expediente.', 'warning');
                return;
            }
        }

        let userToLog = null;

        if (colab) {
            userToLog = { ...colab, isDono: Array.isArray(colab.cargo) ? colab.cargo.includes('Dono') : colab.cargo === 'Dono' };
        } else if (isDono) {
            userToLog = { id: 'master', nome: 'Dono (Master)', cargo: ['Dono'], isDono: true };
        }

        if (userToLog) {
            // Sucesso
            sessionStorage.setItem('avence_session_logged', JSON.stringify(userToLog));
            
            // Register Ponto se for colaborador comum
            if (userToLog.id !== 'master') {
                const pontos = JSON.parse(localStorage.getItem('avence_pontos')) || [];
                pontos.push({
                    nome: userToLog.nome,
                    data: new Date().toISOString()
                });
                localStorage.setItem('avence_pontos', JSON.stringify(pontos));
            }

            customAlert(`Bem-vindo, ${userToLog.nome}! Redirecionando...`, 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        } else {
            customAlert('Senha incorreta!', 'error');
            inputSenha.value = '';
        }
    }

    btnEntrar.addEventListener('click', checkLogin);
    inputSenha.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkLogin();
    });

    // Preview do Avatar dinâmico
    inputSenha.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const match = colaboradores.find(c => c.senhaLogin.startsWith(val) && val.length > 2);
        
        if (match && match.foto) {
            avatarPreview.style.backgroundImage = `url(${match.foto})`;
            avatarPreview.innerHTML = '';
        } else {
            avatarPreview.style.backgroundImage = 'none';
            avatarPreview.innerHTML = '<i class="ph ph-user"></i>';
        }
    });
});
