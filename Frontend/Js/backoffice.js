import { initNavbar, activeTab } from './navbar.js';
import { initFooter } from './footer.js';

let conversations = [];
let selectedConversationId = null;
let refreshTimer = null;
let currentSimulations = [];

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
    if (!value) return '—';
    return new Intl.DateTimeFormat('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short'
    }).format(new Date(value));
}

function formatDateShort(value) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
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

// ── Tab switching ─────────────────────────────────────────────────────────────

function initTabs() {
    const tabBtns = document.querySelectorAll('.bo-tab');
    const panels = document.querySelectorAll('.bo-panel');

    tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;

            tabBtns.forEach((t) => {
                t.classList.toggle('bo-tab--active', t === btn);
                t.setAttribute('aria-selected', String(t === btn));
            });

            panels.forEach((panel) => {
                panel.hidden = panel.dataset.panel !== target;
            });

            clearNotice();

            if (target === 'precios') loadPrecios();
        });
    });
}

// ── Chat de Soporte ───────────────────────────────────────────────────────────

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
                ${conversation.advisor_active ? '<span class="support-thread__advisor-on">Asesor activo</span>' : ''}
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

function joinConversation(conversationId) {
    if (!conversationId) return;
    requestJson(`/api/admin/chat/conversations/${conversationId}/join`, { method: 'POST' }).catch(() => {});
}

function leaveConversation(conversationId) {
    if (!conversationId) return;
    const { token } = getSession();
    fetch(`${getApiBaseUrl()}/api/admin/chat/conversations/${conversationId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        keepalive: true
    }).catch(() => {});
}

async function loadConversations({ keepSelection = true } = {}) {
    const data = await requestJson('/api/admin/chat/conversations');
    conversations = data.conversations
        .map((conversation) => ({
            ...conversation,
            id: Number(conversation.id),
            customer_messages: Number(conversation.customer_messages || 0),
            needs_attention: Boolean(conversation.needs_attention),
            advisor_active: Boolean(conversation.advisor_active)
        }))
        .filter((conversation) => conversation.customer_messages > 0);

    if (!keepSelection || !conversations.some((conversation) => conversation.id === selectedConversationId)) {
        selectedConversationId = conversations[0]?.id || null;
    }

    renderConversations();

    if (selectedConversationId) {
        await loadMessages(selectedConversationId);
    }
}

async function loadMessages(conversationId) {
    const prevId = selectedConversationId;
    selectedConversationId = Number(conversationId);

    if (prevId && prevId !== selectedConversationId) {
        leaveConversation(prevId);
    }

    const conversation = conversations.find((item) => item.id === selectedConversationId);

    document.getElementById('bo-chat-name').textContent = conversation?.customer_name || 'Cliente';
    document.getElementById('bo-chat-meta').textContent = `Conversación #${selectedConversationId}`;
    document.getElementById('bo-chat-status').textContent = conversation?.status === 'open' ? 'Abierta' : 'Cerrada';
    document.getElementById('bo-reply-input').disabled = false;
    document.getElementById('bo-send').disabled = false;

    const data = await requestJson(`/api/admin/chat/conversations/${selectedConversationId}/messages`);
    renderMessages(data.messages);
    renderConversations();
    joinConversation(selectedConversationId);
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

// ── Usuarios ─────────────────────────────────────────────────────────────────

function renderUsers(users) {
    const tbody = document.getElementById('users-tbody');

    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="bo-table__empty">No se encontraron usuarios.</td></tr>';
        return;
    }

    tbody.innerHTML = users.map((user) => `
        <tr>
            <td class="bo-table__id">#${user.id}</td>
            <td>
                <span class="bo-user-name">${escapeHtml(user.username)}</span>
            </td>
            <td class="bo-table__email">${escapeHtml(user.email)}</td>
            <td>
                <span class="bo-role bo-role--${user.role}">${escapeHtml(user.role)}</span>
            </td>
            <td class="bo-table__date">${formatDateShort(user.created_at)}</td>
        </tr>
    `).join('');
}

async function searchUsers() {
    const q = document.getElementById('users-q').value.trim();
    const from = document.getElementById('users-from').value;
    const to = document.getElementById('users-to').value;

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    try {
        const data = await requestJson(`/api/admin/usuarios?${params}`);
        renderUsers(data.users);
    } catch (error) {
        showNotice(error.message);
    }
}

// ── Tablón ────────────────────────────────────────────────────────────────────

function renderTablon(posts) {
    const tbody = document.getElementById('tablon-tbody');

    if (!posts.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="bo-table__empty">No se encontraron publicaciones.</td></tr>';
        return;
    }

    tbody.innerHTML = posts.map((post) => `
        <tr id="tablon-row-${post.id}">
            <td class="bo-table__id">#${post.id}</td>
            <td>${escapeHtml(post.user.username)}</td>
            <td class="bo-table__text">
                ${post.title ? `<strong>${escapeHtml(post.title)}</strong><br>` : ''}
                <span class="bo-table__preview">${escapeHtml(post.message)}</span>
            </td>
            <td><span class="bo-category">${escapeHtml(post.category)}</span></td>
            <td class="bo-table__stats">${post.likes} / ${post.replies}</td>
            <td class="bo-table__date">${formatDateShort(post.created_at)}</td>
            <td>
                <button class="bo-featured-btn ${post.featured ? 'bo-featured-btn--on' : ''}"
                    data-post-id="${post.id}"
                    title="${post.featured ? 'Quitar destacado' : 'Destacar publicación'}"
                    type="button">
                    <i data-lucide="${post.featured ? 'star' : 'star'}"></i>
                    ${post.featured ? 'Destacada' : 'Destacar'}
                </button>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
}

async function searchTablon() {
    const q = document.getElementById('tablon-q').value.trim();
    const featuredOnly = document.getElementById('tablon-featured-only').checked;

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (featuredOnly) params.set('featured', 'true');

    try {
        const data = await requestJson(`/api/admin/tablon?${params}`);
        renderTablon(data.posts);
    } catch (error) {
        showNotice(error.message);
    }
}

async function toggleFeatured(postId) {
    try {
        const data = await requestJson(`/api/admin/tablon/${postId}/destacar`, { method: 'PATCH' });
        const btn = document.querySelector(`[data-post-id="${postId}"]`);
        if (btn) {
            btn.classList.toggle('bo-featured-btn--on', data.featured);
            btn.title = data.featured ? 'Quitar destacado' : 'Destacar publicación';
            btn.innerHTML = `<i data-lucide="star"></i> ${data.featured ? 'Destacada' : 'Destacar'}`;
            lucide.createIcons();
        }
        showNotice(
            data.featured ? 'Publicación marcada como destacada.' : 'Publicación ya no está destacada.',
            'success'
        );
    } catch (error) {
        showNotice(error.message);
    }
}

// ── Precios ───────────────────────────────────────────────────────────────────

function renderPrecios(materials) {
    const tbody = document.getElementById('precios-tbody');

    if (!materials.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="bo-table__empty">No hay materiales.</td></tr>';
        return;
    }

    tbody.innerHTML = materials.map((mat) => `
        <tr id="precio-row-${mat.id}">
            <td><strong>${escapeHtml(mat.name)}</strong></td>
            <td>${mat.usefulLife} años</td>
            <td>${mat.permeability}%</td>
            <td class="bo-price-cell" id="precio-display-${mat.id}">
                $${mat.costPerM2.toFixed(2)}
            </td>
            <td>
                <button class="bo-edit-btn" data-mat-id="${mat.id}" data-cost="${mat.costPerM2}" type="button">
                    <i data-lucide="pencil"></i>
                    Editar
                </button>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
}

async function loadPrecios() {
    try {
        const data = await requestJson('/api/admin/materiales');
        renderPrecios(data.materials);
    } catch (error) {
        showNotice(error.message);
    }
}

function startEditPrice(matId, currentCost) {
    const cell = document.getElementById(`precio-display-${matId}`);
    const btn = document.querySelector(`[data-mat-id="${matId}"]`);
    if (!cell || !btn) return;

    cell.innerHTML = `
        <div class="bo-price-edit">
            <span class="bo-price-edit__prefix">$</span>
            <input class="bo-price-edit__input" id="precio-input-${matId}" type="number" min="0.01" step="0.01" value="${currentCost}" autocomplete="off">
        </div>
    `;

    btn.innerHTML = '<i data-lucide="check"></i> Guardar';
    btn.dataset.editing = 'true';
    lucide.createIcons();

    document.getElementById(`precio-input-${matId}`)?.focus();
}

async function savePrice(matId) {
    const input = document.getElementById(`precio-input-${matId}`);
    const value = parseFloat(input?.value);

    if (!input || isNaN(value) || value <= 0) {
        showNotice('Ingresa un precio válido mayor a 0.');
        return;
    }

    const btn = document.querySelector(`[data-mat-id="${matId}"]`);
    btn.disabled = true;

    try {
        const data = await requestJson(`/api/admin/materiales/${matId}`, {
            method: 'PUT',
            body: JSON.stringify({ costPerM2: value })
        });

        const cell = document.getElementById(`precio-display-${matId}`);
        cell.textContent = `$${data.material.costPerM2.toFixed(2)}`;

        btn.dataset.cost = data.material.costPerM2;
        btn.dataset.editing = '';
        btn.innerHTML = '<i data-lucide="pencil"></i> Editar';
        lucide.createIcons();

        showNotice(`Precio de ${data.material.name} actualizado.`, 'success');
    } catch (error) {
        showNotice(error.message);
    } finally {
        btn.disabled = false;
    }
}

// ── Simulaciones ──────────────────────────────────────────────────────────────

function renderSimulaciones(simulations) {
    const tbody = document.getElementById('sim-tbody');
    const exportBtn = document.getElementById('sim-export-btn');

    currentSimulations = simulations;
    exportBtn.disabled = simulations.length === 0;

    if (!simulations.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="bo-table__empty">No se encontraron simulaciones.</td></tr>';
        return;
    }

    tbody.innerHTML = simulations.map((sim) => `
        <tr>
            <td class="bo-table__id">#${sim.id}</td>
            <td>${escapeHtml(sim.title)}</td>
            <td>
                <span class="bo-user-name">${escapeHtml(sim.users?.username || '—')}</span>
                <span class="bo-table__email">${escapeHtml(sim.users?.email || '')}</span>
            </td>
            <td>${sim.area} m²</td>
            <td>${sim.rain_level}%</td>
            <td>${sim.traffic_level}%</td>
            <td class="bo-table__date">${formatDateShort(sim.created_at)}</td>
        </tr>
    `).join('');
}

async function searchSimulaciones() {
    const q = document.getElementById('sim-q').value.trim();
    const from = document.getElementById('sim-from').value;
    const to = document.getElementById('sim-to').value;

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    try {
        const data = await requestJson(`/api/admin/simulaciones?${params}`);
        renderSimulaciones(data.simulations);
    } catch (error) {
        showNotice(error.message);
    }
}

function exportSimulacionesCsv() {
    if (!currentSimulations.length) return;

    const headers = ['ID', 'Título', 'Usuario', 'Email', 'Área (m²)', 'Lluvia (%)', 'Tránsito (%)', 'Fecha'];

    const rows = currentSimulations.map((sim) => [
        sim.id,
        `"${(sim.title || '').replace(/"/g, '""')}"`,
        `"${(sim.users?.username || '').replace(/"/g, '""')}"`,
        `"${(sim.users?.email || '').replace(/"/g, '""')}"`,
        sim.area,
        sim.rain_level,
        sim.traffic_level,
        sim.created_at ? new Date(sim.created_at).toISOString().slice(0, 10) : ''
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `simulaciones_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Event binding ─────────────────────────────────────────────────────────────

function bindEvents() {
    document.getElementById('bo-refresh').addEventListener('click', async () => {
        clearNotice();
        const activePanel = document.querySelector('.bo-panel:not([hidden])')?.dataset.panel;
        if (activePanel === 'chat') await loadConversations();
        if (activePanel === 'usuarios') await searchUsers();
        if (activePanel === 'tablon') await searchTablon();
        if (activePanel === 'precios') await loadPrecios();
        if (activePanel === 'simulaciones') await searchSimulaciones();
    });

    document.getElementById('bo-conversations').addEventListener('click', async (event) => {
        const thread = event.target.closest('[data-conversation-id]');
        if (!thread) return;
        clearNotice();
        await loadMessages(thread.dataset.conversationId);
    });

    document.getElementById('bo-reply-form').addEventListener('submit', sendReply);

    document.getElementById('users-search-btn').addEventListener('click', () => {
        clearNotice();
        searchUsers();
    });
    document.getElementById('users-q').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { clearNotice(); searchUsers(); }
    });

    document.getElementById('tablon-search-btn').addEventListener('click', () => {
        clearNotice();
        searchTablon();
    });
    document.getElementById('tablon-q').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { clearNotice(); searchTablon(); }
    });

    document.getElementById('tablon-tbody').addEventListener('click', (e) => {
        const btn = e.target.closest('.bo-featured-btn');
        if (!btn) return;
        clearNotice();
        toggleFeatured(Number(btn.dataset.postId));
    });

    document.getElementById('precios-tbody').addEventListener('click', (e) => {
        const btn = e.target.closest('.bo-edit-btn');
        if (!btn) return;
        clearNotice();
        const matId = Number(btn.dataset.matId);
        if (btn.dataset.editing === 'true') {
            savePrice(matId);
        } else {
            startEditPrice(matId, btn.dataset.cost);
        }
    });

    document.getElementById('sim-search-btn').addEventListener('click', () => {
        clearNotice();
        searchSimulaciones();
    });
    document.getElementById('sim-q').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { clearNotice(); searchSimulaciones(); }
    });
    document.getElementById('sim-export-btn').addEventListener('click', exportSimulacionesCsv);
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function initBackoffice() {
    await initNavbar();
    initFooter();
    activeTab('');

    const { user, token } = getSession();
    if (!user || !token) {
        showNotice('Inicia sesión como administrador para entrar al backoffice.');
        return;
    }

    if (user.role !== 'admin') {
        showNotice('Tu usuario no tiene permisos de administrador.');
        return;
    }

    document.getElementById('bo-main').hidden = false;

    initTabs();
    bindEvents();

    try {
        await loadConversations({ keepSelection: false });
        refreshTimer = setInterval(() => {
            const activePanel = document.querySelector('.bo-panel:not([hidden])')?.dataset.panel;
            if (activePanel === 'chat') loadConversations().catch(() => {});
        }, 10000);
    } catch (error) {
        showNotice(error.message);
    }
}

window.addEventListener('beforeunload', () => {
    clearInterval(refreshTimer);
    leaveConversation(selectedConversationId);
});

initBackoffice();
