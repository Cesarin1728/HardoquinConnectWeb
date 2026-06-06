import { initNavbar, activeTab } from './navbar.js';
import { initFooter } from './footer.js';

let conversations = [];
let selectedConversationId = null;
let refreshTimer = null;

function getApiBaseUrl() {
    const localHosts = ['localhost', '127.0.0.1'];
    const isLocalDev = localHosts.includes(window.location.hostname);

    if (window.location.protocol !== 'file:' && (!isLocalDev || window.location.port === '8088' || window.location.port === '')) {
        return '';
    }

    const apiHost = localHosts.includes(window.location.hostname)
        ? '127.0.0.1'
        : window.location.hostname;

    return `http://${apiHost}:8088`;
}

function getSession() {
    try {
        return {
            user: JSON.parse(sessionStorage.getItem('user')),
            token: sessionStorage.getItem('authToken')
        };
    } catch (_) {
        return { user: null, token: null };
    }
}

function authHeaders() {
    const { token } = getSession();
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

function showNotice(message, type = 'error') {
    const notice = document.getElementById('bo-notice');
    notice.textContent = message;
    notice.hidden = false;
    notice.classList.toggle('backoffice__notice--error', type === 'error');
    notice.classList.toggle('backoffice__notice--success', type === 'success');
}

function clearNotice() {
    const notice = document.getElementById('bo-notice');
    notice.hidden = true;
    notice.textContent = '';
    notice.classList.remove('backoffice__notice--error', 'backoffice__notice--success');
}

function formatDate(value) {
    if (!value) return 'Sin mensajes';
    return new Intl.DateTimeFormat('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short'
    }).format(new Date(value));
}

function senderLabel(message) {
    if (message.sender_type === 'user') return message.metadata?.nick || 'Cliente';
    if (message.sender_type === 'admin') return message.metadata?.adminName || 'Admin';
    if (message.sender_type === 'assistant') return 'Asistente';
    return 'Sistema';
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderConversations() {
    const list = document.getElementById('bo-conversations');
    const count = document.getElementById('bo-count');
    count.textContent = conversations.length;

    if (!conversations.length) {
        list.innerHTML = '<p class="support-inbox__empty">No hay mensajes de clientes todavía.</p>';
        return;
    }

    list.innerHTML = conversations.map((conversation) => `
        <button class="support-thread ${conversation.id === selectedConversationId ? 'support-thread--active' : ''}" type="button" data-conversation-id="${conversation.id}">
            <span class="support-thread__top">
                <strong>
                    <span class="support-thread__indicator ${conversation.needs_attention ? 'support-thread__indicator--attention' : 'support-thread__indicator--answered'}" aria-hidden="true"></span>
                    ${escapeHtml(conversation.customer_name || 'Cliente')}
                </strong>
                <small>${formatDate(conversation.last_message_at || conversation.created_at)}</small>
            </span>
            <span class="support-thread__preview">${escapeHtml(conversation.last_message || 'Conversación iniciada')}</span>
            <span class="support-thread__meta">
                <span>#${conversation.id}</span>
                <span>${conversation.needs_attention ? 'Pendiente' : 'Respondido'}</span>
                <span>${conversation.customer_messages || 0} mensaje(s)</span>
            </span>
        </button>
    `).join('');
}

function renderMessages(messages) {
    const box = document.getElementById('bo-messages');

    if (!messages.length) {
        box.innerHTML = '<p class="support-chat__empty">Esta conversación aún no tiene mensajes.</p>';
        return;
    }

    box.innerHTML = messages.map((message) => `
        <article class="support-message support-message--${message.sender_type}">
            <p>${escapeHtml(message.message)}</p>
            <span>${escapeHtml(senderLabel(message))} · ${formatDate(message.created_at)}</span>
        </article>
    `).join('');
    box.scrollTop = box.scrollHeight;
}

async function requestJson(path, options = {}) {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
        ...options,
        headers: {
            ...authHeaders(),
            ...(options.headers || {})
        }
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
        throw new Error(data.message || 'No se pudo completar la operación.');
    }

    return data;
}

async function loadConversations({ keepSelection = true } = {}) {
    const data = await requestJson('/api/admin/chat/conversations');
    conversations = data.conversations.map((conversation) => ({
        ...conversation,
        id: Number(conversation.id),
        customer_messages: Number(conversation.customer_messages || 0),
        needs_attention: Boolean(conversation.needs_attention)
    }));

    if (!keepSelection || !conversations.some((conversation) => conversation.id === selectedConversationId)) {
        selectedConversationId = conversations[0]?.id || null;
    }

    renderConversations();

    if (selectedConversationId) {
        await loadMessages(selectedConversationId);
    }
}

async function loadMessages(conversationId) {
    selectedConversationId = Number(conversationId);
    const conversation = conversations.find((item) => item.id === selectedConversationId);

    document.getElementById('bo-chat-name').textContent = conversation?.customer_name || 'Cliente';
    document.getElementById('bo-chat-meta').textContent = `Conversación #${selectedConversationId}`;
    document.getElementById('bo-chat-status').textContent = conversation?.status === 'open' ? 'Abierta' : 'Cerrada';
    document.getElementById('bo-reply-input').disabled = false;
    document.getElementById('bo-send').disabled = false;

    const data = await requestJson(`/api/admin/chat/conversations/${selectedConversationId}/messages`);
    renderMessages(data.messages);
    renderConversations();
}

async function sendReply(event) {
    event.preventDefault();

    const input = document.getElementById('bo-reply-input');
    const message = input.value.trim();
    if (!selectedConversationId || !message) return;

    document.getElementById('bo-send').disabled = true;

    try {
        await requestJson(`/api/admin/chat/conversations/${selectedConversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ message })
        });
        input.value = '';
        await loadConversations();
        await loadMessages(selectedConversationId);
    } catch (error) {
        showNotice(error.message);
    } finally {
        document.getElementById('bo-send').disabled = false;
        input.focus();
    }
}

function bindEvents() {
    document.getElementById('bo-refresh').addEventListener('click', async () => {
        clearNotice();
        await loadConversations();
    });

    document.getElementById('bo-conversations').addEventListener('click', async (event) => {
        const thread = event.target.closest('[data-conversation-id]');
        if (!thread) return;
        clearNotice();
        await loadMessages(thread.dataset.conversationId);
    });

    document.getElementById('bo-reply-form').addEventListener('submit', sendReply);
}

async function initBackoffice() {
    await initNavbar();
    initFooter();
    activeTab('');
    bindEvents();

    const { user, token } = getSession();
    if (!user || !token) {
        showNotice('Inicia sesión como administrador para entrar al backoffice.');
        return;
    }

    if (user.role !== 'admin') {
        showNotice('Tu usuario no tiene permisos de administrador.');
        return;
    }

    document.getElementById('support-board').hidden = false;

    try {
        await loadConversations({ keepSelection: false });
        refreshTimer = setInterval(() => loadConversations().catch(() => {}), 10000);
    } catch (error) {
        showNotice(error.message);
    }
}

window.addEventListener('beforeunload', () => {
    clearInterval(refreshTimer);
});

initBackoffice();
