/**
 * SISTEMA AVENCE CELL - MÓDULO DE AUTENTICAÇÃO JWT
 * Gerencia Access Token e Refresh Token com criptografia HMAC-SHA256.
 * Permite persistência segura de sessão entre abas e reabertura do navegador.
 */

(function (window) {
    'use strict';

    const STORAGE_ACCESS_TOKEN = 'avence_jwt_access_token';
    const STORAGE_REFRESH_TOKEN = 'avence_jwt_refresh_token';
    const STORAGE_USER = 'avence_session_logged'; // Compatibilidade retroativa
    const STORAGE_REMEMBER = 'avence_auth_remember';
    const STORAGE_KEY_SEED = 'avence_jwt_kseed';

    // Prazos de expiração (em segundos)
    const ACCESS_TOKEN_LIFETIME_SEC = 60 * 30; // 30 minutos
    const REFRESH_TOKEN_LIFETIME_SEC = 60 * 60 * 24 * 30; // 30 dias

    // Semente secreta persistente para assinatura de tokens da instância
    function getSecretKey() {
        let key = localStorage.getItem(STORAGE_KEY_SEED);
        if (!key) {
            // Gera chave segura aleatória
            const array = new Uint8Array(32);
            if (window.crypto && window.crypto.getRandomValues) {
                window.crypto.getRandomValues(array);
            } else {
                for (let i = 0; i < 32; i++) array[i] = Math.floor(Math.random() * 256);
            }
            key = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
            localStorage.setItem(STORAGE_KEY_SEED, key);
        }
        return key + '_avence_secure_jwt_salt';
    }

    // Utilitários Base64URL
    function base64UrlEncode(str) {
        const utf8Bytes = new TextEncoder().encode(str);
        let binary = '';
        utf8Bytes.forEach(b => binary += String.fromCharCode(b));
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    function base64UrlDecode(str) {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        const binary = atob(str);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder().decode(bytes);
    }

    // Implementação SHA-256 e HMAC-SHA256 pura em JS para garantir funcionamento independente de ambiente
    function sha256Bytes(ascii) {
        const mathPow = Math.pow;
        const maxWord = mathPow(2, 32);
        const lengthProperty = 'length';
        let i, j;
        const words = [];
        const asciiBitLength = ascii[lengthProperty] * 8;

        let hash = sha256Bytes.h = sha256Bytes.h || [];
        const k = sha256Bytes.k = sha256Bytes.k || [];
        let primeCounter = k[lengthProperty];

        const isComposite = {};
        for (let candidate = 2; primeCounter < 64; candidate++) {
            if (!isComposite[candidate]) {
                for (i = 0; i < 313; i += candidate) {
                    isComposite[i] = candidate;
                }
                hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
            }
        }

        ascii += '\x80';
        while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
        for (i = 0; i < ascii[lengthProperty]; i++) {
            j = ascii.charCodeAt(i);
            if (j >> 8) return;
            words[i >> 2] |= j << ((3 - i) % 4) * 8;
        }
        words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
        words[words[lengthProperty]] = (asciiBitLength | 0);

        for (j = 0; j < words[lengthProperty];) {
            const w = words.slice(j, j += 16);
            const oldHash = hash;
            hash = hash.slice(0, 8);

            for (i = 0; i < 64; i++) {
                const w15 = w[i - 15], w2 = w[i - 2];
                const s0 = (w15 >>> 7 | w15 << 25) ^ (w15 >>> 18 | w15 << 14) ^ (w15 >>> 3);
                const s1 = (w2 >>> 17 | w2 << 15) ^ (w2 >>> 19 | w2 << 13) ^ (w2 >>> 10);
                const a = hash[0], e = hash[4];
                const ch = (e & hash[5]) ^ ((~e) & hash[6]);
                const maj = (a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]);
                const s0a = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
                const s1e = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);

                const t1 = (w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0) + hash[7] + s1e + ch + k[i];
                const t2 = s0a + maj;

                hash = [(t1 + t2) | 0].concat(hash);
                hash[4] = (hash[4] + t1) | 0;
            }

            for (i = 0; i < 8; i++) {
                hash[i] = (hash[i] + oldHash[i]) | 0;
            }
        }

        const out = [];
        for (i = 0; i < 8; i++) {
            for (let b = 3; b >= 0; b--) {
                out.push((hash[i] >> (8 * b)) & 255);
            }
        }
        return new Uint8Array(out);
    }

    function hmacSha256(keyStr, messageStr) {
        const blockSize = 64;
        let keyBytes = new TextEncoder().encode(keyStr);
        if (keyBytes.length > blockSize) {
            keyBytes = sha256Bytes(String.fromCharCode(...keyBytes));
        }
        const oKeyPad = new Uint8Array(blockSize);
        const iKeyPad = new Uint8Array(blockSize);
        for (let i = 0; i < blockSize; i++) {
            const b = i < keyBytes.length ? keyBytes[i] : 0;
            oKeyPad[i] = b ^ 0x5c;
            iKeyPad[i] = b ^ 0x36;
        }

        const innerMsg = String.fromCharCode(...iKeyPad) + messageStr;
        const innerHash = sha256Bytes(innerMsg);

        const outerMsg = String.fromCharCode(...oKeyPad) + String.fromCharCode(...innerHash);
        const outerHash = sha256Bytes(outerMsg);

        let binary = '';
        outerHash.forEach(b => binary += String.fromCharCode(b));
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    // Assina cabeçalho e payload para gerar string JWT
    function signJwt(payload) {
        const header = { alg: 'HS256', typ: 'JWT' };
        const encodedHeader = base64UrlEncode(JSON.stringify(header));
        const encodedPayload = base64UrlEncode(JSON.stringify(payload));
        const secret = getSecretKey();
        const signature = hmacSha256(secret, `${encodedHeader}.${encodedPayload}`);
        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }

    // Decodifica e valida assinatura e expiração de um JWT
    function verifyJwt(token, expectedType) {
        if (!token || typeof token !== 'string') return null;
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [encodedHeader, encodedPayload, signature] = parts;
        const secret = getSecretKey();
        const expectedSignature = hmacSha256(secret, `${encodedHeader}.${encodedPayload}`);

        // Verificação de assinatura
        if (signature !== expectedSignature) {
            console.warn('[JWT Auth] Assinatura do token inválida.');
            return null;
        }

        try {
            const payload = JSON.parse(base64UrlDecode(encodedPayload));
            const now = Math.floor(Date.now() / 1000);

            // Validação de expiração
            if (payload.exp && payload.exp < now) {
                console.warn('[JWT Auth] Token expirado.');
                return null;
            }

            // Validação de tipo (access ou refresh)
            if (expectedType && payload.type !== expectedType) {
                console.warn(`[JWT Auth] Tipo de token incorreto. Esperado: ${expectedType}, recebido: ${payload.type}`);
                return null;
            }

            return payload;
        } catch (e) {
            console.error('[JWT Auth] Erro ao decodificar payload JWT:', e);
            return null;
        }
    }

    // Sincroniza usuário autenticado na memória e sessionStorage para compatibilidade retroativa
    function syncUserState(user) {
        if (!user) {
            window.loggedUser = null;
            sessionStorage.removeItem(STORAGE_USER);
            return;
        }
        window.loggedUser = user;
        try {
            sessionStorage.setItem(STORAGE_USER, JSON.stringify(user));
        } catch (e) {
            console.warn('[JWT Auth] Falha ao sincronizar sessionStorage:', e);
        }
    }

    // API Pública
    const jwtAuth = {
        /**
         * Emite par de tokens (Access Token + Refresh Token) para o usuário
         */
        createTokens: function (user) {
            const now = Math.floor(Date.now() / 1000);

            // Sanitiza os dados do usuário para o payload
            const userData = {
                id: user.id || user.nome,
                nome: user.nome,
                cargo: Array.isArray(user.cargo) ? user.cargo : [user.cargo || 'Funcionario'],
                isDono: !!user.isDono,
                foto: user.foto || ''
            };

            const accessPayload = {
                sub: userData.id,
                user: userData,
                type: 'access',
                iat: now,
                exp: now + ACCESS_TOKEN_LIFETIME_SEC
            };

            const refreshPayload = {
                sub: userData.id,
                user: userData,
                type: 'refresh',
                iat: now,
                exp: now + REFRESH_TOKEN_LIFETIME_SEC
            };

            return {
                accessToken: signJwt(accessPayload),
                refreshToken: signJwt(refreshPayload),
                user: userData,
                expiresIn: ACCESS_TOKEN_LIFETIME_SEC
            };
        },

        /**
         * Efetua login persistente: gera e salva Access Token e Refresh Token
         */
        login: function (user, remember = true) {
            const tokens = this.createTokens(user);

            // Salva persistentemente o Refresh Token (30 dias)
            localStorage.setItem(STORAGE_REFRESH_TOKEN, tokens.refreshToken);
            localStorage.setItem(STORAGE_REMEMBER, remember ? 'true' : 'false');

            // Salva Access Token no localStorage (para acesso entre abas) e memória
            localStorage.setItem(STORAGE_ACCESS_TOKEN, tokens.accessToken);

            // Sincroniza estado para compatibilidade completa com o restante do sistema
            syncUserState(tokens.user);

            this.startAutoRefresh();
            return tokens;
        },

        /**
         * Renova o Access Token utilizando o Refresh Token salvo
         */
        refreshAccessToken: function () {
            const refreshToken = localStorage.getItem(STORAGE_REFRESH_TOKEN);
            if (!refreshToken) {
                return null;
            }

            const payload = verifyJwt(refreshToken, 'refresh');
            if (!payload || !payload.user) {
                console.warn('[JWT Auth] Refresh Token expirado ou inválido. Sessão encerrada.');
                this.logout(false);
                return null;
            }

            // Gera novo Access Token
            const now = Math.floor(Date.now() / 1000);
            const newAccessPayload = {
                sub: payload.user.id,
                user: payload.user,
                type: 'access',
                iat: now,
                exp: now + ACCESS_TOKEN_LIFETIME_SEC
            };

            const newAccessToken = signJwt(newAccessPayload);
            localStorage.setItem(STORAGE_ACCESS_TOKEN, newAccessToken);
            syncUserState(payload.user);

            console.log('[JWT Auth] Access Token renovado com sucesso via Refresh Token.');
            return {
                accessToken: newAccessToken,
                user: payload.user
            };
        },

        /**
         * Obtém o Access Token atual se válido, ou tenta renovar silenciosamente
         */
        getAccessToken: function () {
            const token = localStorage.getItem(STORAGE_ACCESS_TOKEN);
            if (token) {
                const payload = verifyJwt(token, 'access');
                if (payload) return token;
            }

            // Tenta renovar via Refresh Token
            const renewed = this.refreshAccessToken();
            return renewed ? renewed.accessToken : null;
        },

        /**
         * Obtém o Refresh Token armazenado
         */
        getRefreshToken: function () {
            return localStorage.getItem(STORAGE_REFRESH_TOKEN);
        },

        /**
         * Retorna os dados do usuário autenticado no momento
         */
        getUser: function () {
            // Verifica se o Access Token atual ainda é válido
            const token = localStorage.getItem(STORAGE_ACCESS_TOKEN);
            if (token) {
                const payload = verifyJwt(token, 'access');
                if (payload && payload.user) {
                    syncUserState(payload.user);
                    return payload.user;
                }
            }

            // Se o Access Token expirou ou não existe, renova automaticamente via Refresh Token
            const renewed = this.refreshAccessToken();
            if (renewed && renewed.user) {
                return renewed.user;
            }

            // Fallback para sessionStorage se existente (modo compatibilidade legado)
            try {
                const sessionStr = sessionStorage.getItem(STORAGE_USER);
                if (sessionStr) {
                    const u = JSON.parse(sessionStr);
                    window.loggedUser = u;
                    return u;
                }
            } catch (e) { }

            syncUserState(null);
            return null;
        },

        /**
         * Verifica se há sessão válida ativa ou renovável
         */
        isAuthenticated: function () {
            return !!this.getUser();
        },

        /**
         * Protege páginas: se não autenticado, redireciona para login.html
         */
        ensureAuth: function (redirectTo = 'login.html') {
            const user = this.getUser();
            if (!user) {
                console.warn('[JWT Auth] Não autenticado. Redirecionando para:', redirectTo);
                window.location.href = redirectTo;
                return false;
            }
            return true;
        },

        /**
         * Encerra a sessão: remove todos os tokens JWT e dados de sessão
         */
        logout: function (redirect = true) {
            this.stopAutoRefresh();
            localStorage.removeItem(STORAGE_ACCESS_TOKEN);
            localStorage.removeItem(STORAGE_REFRESH_TOKEN);
            localStorage.removeItem(STORAGE_REMEMBER);
            sessionStorage.removeItem(STORAGE_USER);
            window.loggedUser = null;

            if (redirect) {
                window.location.href = 'login.html';
            }
        },

        /**
         * Monitoramento em segundo plano para renovação automática do token
         */
        _refreshTimer: null,
        startAutoRefresh: function () {
            this.stopAutoRefresh();
            // Verifica a cada 5 minutos se o Access Token precisa ser renovado
            this._refreshTimer = setInterval(() => {
                const token = localStorage.getItem(STORAGE_ACCESS_TOKEN);
                if (token) {
                    const payload = verifyJwt(token, 'access');
                    const now = Math.floor(Date.now() / 1000);
                    // Se faltarem menos de 10 minutos para expirar, renova
                    if (!payload || (payload.exp - now) < 600) {
                        this.refreshAccessToken();
                    }
                } else if (localStorage.getItem(STORAGE_REFRESH_TOKEN)) {
                    this.refreshAccessToken();
                }
            }, 1000 * 60 * 5);
        },

        stopAutoRefresh: function () {
            if (this._refreshTimer) {
                clearInterval(this._refreshTimer);
                this._refreshTimer = null;
            }
        },

        /**
         * Inicialização imediata ao carregar a página
         */
        init: function () {
            // Tenta obter usuário (ou renovar automaticamente silenciosamente)
            const user = this.getUser();
            if (user) {
                this.startAutoRefresh();
            }
        }
    };

    // Auto inicializa
    jwtAuth.init();

    // Expõe globalmente
    window.jwtAuth = jwtAuth;

})(typeof window !== 'undefined' ? window : global);
