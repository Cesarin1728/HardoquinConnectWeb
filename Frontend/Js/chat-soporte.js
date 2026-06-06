const WS_PATH = '/ws/chat';

let ws           = null;
let panelOpen    = false;
let reconnTimer  = null;
let failCount    = 0;

function getBackendBaseUrl() {
    const localHosts = ['localhost', '127.0.0.1'];
    const isLocalDev = localHosts.includes(window.location.hostname);

    if (window.location.protocol !== 'file:' && (!isLocalDev || window.location.port === '8088' || window.location.port === '')) {
        return '';
    }

    const apiHost = isLocalDev ? '127.0.0.1' : window.location.hostname;
    return `http://${apiHost}:8088`;
}

function getWsUrl() {
    const backendBaseUrl = getBackendBaseUrl();

    if (backendBaseUrl) {
        return `${backendBaseUrl.replace(/^http/, 'ws')}${WS_PATH}`;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${location.host}${WS_PATH}`;
}

// ── Build DOM ────────────────────────────────────────────────────────────────

function buildWidget() {
    if (document.getElementById('chat-soporte')) return;

    const el = document.createElement('div');
    el.id        = 'chat-soporte';
    el.className = 'chat-soporte';
    el.hidden    = true;
    el.innerHTML = `
        <div class="chat-soporte__header">
            <div class="chat-soporte__header-left">
                <span class="cs-tag">v2 green</span>
                <strong>Chat de Soporte</strong>
            </div>
            <button class="chat-soporte__close" id="cs-close" aria-label="Cerrar">✕</button>
        </div>
        <p class="chat-soporte__status" id="cs-status">Conectando…</p>
        <div class="chat-soporte__messages" id="cs-messages"></div>
        <div class="chat-soporte__bar">
            <input id="cs-input" type="text" maxlength="400"
                   placeholder="Escribe tu pregunta sobre Hardoquin…"
                   autocomplete="off" disabled>
            <button id="cs-send" disabled>Enviar</button>
        </div>
    `;
    document.body.appendChild(el);
}

// ── Messages ─────────────────────────────────────────────────────────────────

function addMsg({ tipo, usuario, texto }) {
    const box = document.getElementById('cs-messages');
    if (!box || !texto) return;

    const wrap = document.createElement('div');
    wrap.className = `cs-msg cs-msg--${tipo}`;
    wrap.innerHTML = `
        <span class="cs-msg__bubble">${escapeHtml(texto)}</span>
        ${usuario ? `<span class="cs-msg__author">${escapeHtml(usuario)}</span>` : ''}
    `;
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ── Status ───────────────────────────────────────────────────────────────────

function setStatus(state) {
    const label  = document.getElementById('cs-status');
    const sendEl = document.getElementById('cs-send');
    const inputEl = document.getElementById('cs-input');
    if (!label) return;

    if (state === 'on') {
        label.textContent   = 'Conectado — escribe tu pregunta';
        sendEl.disabled     = false;
        inputEl.disabled    = false;
    } else if (state === 'off') {
        label.textContent   = 'El chat no está disponible ahora mismo';
        sendEl.disabled     = true;
        inputEl.disabled    = true;
    } else {
        label.textContent   = 'Conectando…';
        sendEl.disabled     = true;
        inputEl.disabled    = true;
    }
}

// ── WebSocket ────────────────────────────────────────────────────────────────

function connect() {
    if (ws && ws.readyState < 2) return;

    const url = getWsUrl();
    try { ws = new WebSocket(url); } catch (_) { setStatus('off'); return; }

    ws.onopen = () => {
        failCount = 0;
        setStatus('on');
    };

    ws.onmessage = ({ data }) => {
        try { addMsg(JSON.parse(data)); } catch (_) {}
    };

    ws.onerror = () => {
        setStatus('off');
    };

    ws.onclose = () => {
        failCount++;
        if (failCount >= 3) {
            setStatus('off');
            addMsg({
                tipo: 'sistema',
                usuario: '',
                texto: 'El servicio de chat no está disponible en este ambiente.'
            });
            return;
        }
        if (panelOpen) {
            setStatus('');
            clearTimeout(reconnTimer);
            reconnTimer = setTimeout(connect, 3000);
        }
    };
}

function disconnect() {
    clearTimeout(reconnTimer);
    if (ws) { ws.close(); ws = null; }
}

// ── Send ─────────────────────────────────────────────────────────────────────

function send() {
    const inputEl = document.getElementById('cs-input');
    if (!inputEl || !ws || ws.readyState !== 1) return;
    const texto = inputEl.value.trim();
    if (!texto) return;

    let nick = 'Usuario';
    try { nick = JSON.parse(sessionStorage.getItem('user'))?.name || 'Usuario'; } catch (_) {}

    ws.send(JSON.stringify({ usuario: nick, texto }));
    inputEl.value = '';
    inputEl.focus();
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function initChatSoporte() {
    const chatAction = document.getElementById('action-chat-soporte');

    try {
        const res  = await fetch(`${getBackendBaseUrl()}/api/health`);
        const data = await res.json();
        if (data.env !== 'green') {
            chatAction?.remove();
            return;
        }
    } catch (_) {
        chatAction?.remove();
        return;
    }

    const hasUser = Boolean(sessionStorage.getItem('user'));
    if (chatAction) chatAction.hidden = !hasUser;

    buildWidget();

    const widget  = document.getElementById('chat-soporte');
    const closeEl = document.getElementById('cs-close');
    const sendEl  = document.getElementById('cs-send');
    const inputEl = document.getElementById('cs-input');

    // Open from navbar dropdown (event delegation — button is injected later)
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#action-chat-soporte')) return;
        e.preventDefault();
        document.querySelector('.nav__user_dropdown')
            ?.classList.remove('nav__user_dropdown--active');
        openChat();
    });

    closeEl.addEventListener('click', closeChat);
    sendEl.addEventListener('click', send);
    inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

    function openChat() {
        widget.hidden = false;
        panelOpen     = true;
        failCount     = 0;
        connect();
    }

    function closeChat() {
        widget.hidden = true;
        panelOpen     = false;
        disconnect();
    }
}
