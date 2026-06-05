import { initNavbar } from "./navbar.js";
import { activeTab } from "./navbar.js";
import { initFooter } from "./footer.js";

const categories = {
    all: { label: 'Todas', color: '#028090' },
    experiencia: { label: 'Experiencia', color: '#52B788' },
    'duda-tecnica': { label: 'Duda técnica', color: '#028090' },
    'caso-uso': { label: 'Caso de uso', color: '#1B4F72' },
    general: { label: 'General', color: '#A9CCE3' }
};

let activeCategory = 'all';
let posts = [];
let pendingDeleteTarget = null;

function getApiBaseUrl() {
    if (window.location.port === '4000') return '';

    const localHosts = ['localhost', '127.0.0.1'];
    const apiHost = localHosts.includes(window.location.hostname)
        ? '127.0.0.1'
        : window.location.hostname;

    return `http://${apiHost}:4000`;
}

function getCurrentUser() {
    try {
        return JSON.parse(sessionStorage.getItem('user'));
    } catch (error) {
        return null;
    }
}

function getInitials(username = '') {
    return username
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'HC';
}

function getProfilePhotoSrc(user = {}) {
    const photo = user.profilePhoto || user.img;

    if (!photo) return '';
    if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('/')) return photo;
    if (photo.startsWith('Frontend/')) return `/${photo}`;

    return `../${photo}`;
}

function renderAvatar(user = {}, className = 'avatar') {
    const initials = escapeHtml(getInitials(user.username));
    const photoSrc = getProfilePhotoSrc(user);

    if (!photoSrc) return `<span class="${className}">${initials}</span>`;

    return `
        <span class="${className} avatar--photo">
            <img
                src="${escapeHtml(photoSrc)}"
                alt="${escapeHtml(user.username || 'Usuario')}"
                onerror="this.parentElement.classList.remove('avatar--photo'); this.parentElement.textContent='${initials}'; this.remove();"
            >
        </span>
    `;
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });
    const data = await response.json();

    if (!data.ok) throw new Error(data.message || 'No se pudo completar la accion.');
    return data;
}

const getElements = () => ({
    postList: document.getElementById('post-list'),
    search: document.getElementById('board-search'),
    sort: document.getElementById('board-sort'),
    modal: document.getElementById('new-post-modal'),
    deleteModal: document.getElementById('delete-post-modal'),
    authModal: document.getElementById('auth-modal'),
    authModalMessage: document.getElementById('auth-modal-message'),
    newPostForm: document.getElementById('new-post-form')
});

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
})[char]);

function getCategoryStyle(categoryKey) {
    const category = categories[categoryKey] || categories.general;
    return `background-color: ${category.color}18; color: ${category.color}; border: 1px solid ${category.color}35;`;
}

function getVisiblePosts() {
    const { search, sort } = getElements();
    const query = (search.value || '').toLowerCase();

    const visiblePosts = posts.filter((post) => {
        const matchesCategory = activeCategory === 'all' || post.category === activeCategory;
        const matchesQuery = !query
            || (post.title || '').toLowerCase().includes(query)
            || post.message.toLowerCase().includes(query)
            || post.user.username.toLowerCase().includes(query);

        return matchesCategory && matchesQuery;
    });

    if (sort.value === 'popular') visiblePosts.sort((a, b) => b.likes - a.likes);
    if (sort.value === 'replies') visiblePosts.sort((a, b) => b.replies.length - a.replies.length);

    return visiblePosts;
}

function updateCounts() {
    document.getElementById('count-all').textContent = posts.length;

    ['experiencia', 'duda-tecnica', 'caso-uso', 'general'].forEach((categoryKey) => {
        document.getElementById(`count-${categoryKey}`).textContent = posts.filter((post) => post.category === categoryKey).length;
    });
}

function renderReplies(post, isOpen) {
    const currentUser = getCurrentUser();
    const replies = post.replies.map((reply) => {
        const menuId = `reply-menu-${post.id}-${reply.id}`;
        const canDelete = currentUser?.id === reply.user.id;

        return `
        <li class="reply">
            ${renderAvatar(reply.user, 'avatar reply__avatar')}
            <article class="reply__bubble">
                <header class="reply__header">
                    <section class="reply__meta">
                        <strong class="reply__author">${escapeHtml(reply.user.username)}</strong>
                        <time class="reply__time">${escapeHtml(reply.relativeCreatedDate)}</time>
                    </section>
                    ${canDelete ? `
                    <section class="post-menu reply__menu">
                        <button class="post-menu__trigger" type="button" data-toggle-menu="${menuId}" aria-expanded="false" aria-controls="${menuId}" aria-label="Opciones de respuesta">
                            <i data-lucide="ellipsis" aria-hidden="true"></i>
                        </button>
                        <menu class="post-menu__list" id="${menuId}">
                            <li>
                                <button class="post-menu__item post-menu__item--danger" type="button" data-delete-reply data-post-id="${post.id}" data-reply-id="${reply.id}">
                                    <i data-lucide="trash-2" aria-hidden="true"></i>
                                    Eliminar
                                </button>
                            </li>
                        </menu>
                    </section>
                    ` : ''}
                </header>
                <p class="reply__text">${escapeHtml(reply.message)}</p>
            </article>
        </li>
        `;
    }).join('');
    const replyComposer = currentUser?.id ? `
        <form class="reply-form" data-reply-form data-post-id="${post.id}">
            ${renderAvatar(currentUser, 'reply-form__avatar')}
            <label class="sr-only" for="reply-${post.id}">Escribe una respuesta</label>
            <textarea class="reply-form__textarea" id="reply-${post.id}" rows="1" placeholder="Escribe una respuesta..."></textarea>
            <button class="reply-form__send" type="submit">
                <i data-lucide="send" aria-hidden="true"></i>
                Enviar
            </button>
        </form>
    ` : `
        <section class="reply-login">
            <p class="reply-login__text">Inicia sesión para comentar en esta publicación.</p>
            <button class="reply-login__button" type="button" data-auth-prompt="comment">
                Iniciar sesión
            </button>
        </section>
    `;

    return `
        <section class="reply-section ${isOpen ? 'reply-section--open' : ''}" id="reply-section-${post.id}" aria-label="Respuestas de ${escapeHtml(post.title || 'publicacion')}">
            <section class="reply-section__inner">
                <ol class="reply-list">${replies}</ol>
                ${replyComposer}
            </section>
        </section>
    `;
}

function renderPost(post, openReplyIds) {
    const currentUser = getCurrentUser();
    const isOpen = openReplyIds.has(String(post.id)) || post.replies.length > 0;
    const category = categories[post.category] || categories.general;
    const menuId = `post-menu-${post.id}`;
    const canDelete = currentUser?.id === post.user.id;

    return `
        <article class="community-post">
            <header class="community-post__header">
                ${renderAvatar(post.user)}
                <section class="community-post__meta">
                    <strong class="community-post__author">${escapeHtml(post.user.username)}</strong>
                    <time class="community-post__time">${escapeHtml(post.relativeCreatedDate)}</time>
                </section>
                <section class="community-post__controls">
                    <span class="community-post__category" style="${getCategoryStyle(post.category)}">${escapeHtml(category.label)}</span>
                    ${canDelete ? `
                    <section class="post-menu">
                        <button class="post-menu__trigger" type="button" data-toggle-menu="${menuId}" aria-expanded="false" aria-controls="${menuId}" aria-label="Opciones de publicación">
                            <i data-lucide="ellipsis" aria-hidden="true"></i>
                        </button>
                        <menu class="post-menu__list" id="${menuId}">
                            <li>
                                <button class="post-menu__item post-menu__item--danger" type="button" data-delete-post="${post.id}">
                                    <i data-lucide="trash-2" aria-hidden="true"></i>
                                    Eliminar
                                </button>
                            </li>
                        </menu>
                    </section>
                    ` : ''}
                </section>
            </header>

            <section class="community-post__body">
                ${post.title ? `<h2 class="community-post__title">${escapeHtml(post.title)}</h2>` : ''}
                <p class="community-post__text">${escapeHtml(post.message)}</p>
            </section>

            <footer class="community-post__actions">
                <button class="post-action ${isOpen ? 'post-action--active' : ''}" type="button" data-toggle-replies="${post.id}" aria-expanded="${isOpen}" aria-controls="reply-section-${post.id}">
                    <i data-lucide="message-circle" aria-hidden="true"></i>
                    ${post.replies.length} ${post.replies.length === 1 ? 'respuesta' : 'respuestas'}
                </button>
                <span class="community-post__spacer" aria-hidden="true"></span>
                <button class="post-action ${post.liked ? 'post-action--liked' : ''}" type="button" data-like-post="${post.id}" aria-label="Me gusta">
                    <i data-lucide="heart" aria-hidden="true"></i>
                    ${post.likes}
                </button>
            </footer>

            ${renderReplies(post, isOpen)}
        </article>
    `;
}

function renderPosts() {
    const { postList } = getElements();
    const openReplyIds = new Set(
        [...document.querySelectorAll('.reply-section--open')]
            .map((section) => section.id.replace('reply-section-', ''))
    );
    const visiblePosts = getVisiblePosts();

    updateCounts();

    if (!visiblePosts.length) {
        postList.innerHTML = `
            <section class="empty-board">
                <i data-lucide="messages-square" aria-hidden="true"></i>
                <p>Sin publicaciones aquí todavía.<br>¡Sé el primero en compartir!</p>
            </section>
        `;
        lucide.createIcons();
        return;
    }

    postList.innerHTML = visiblePosts.map((post) => renderPost(post, openReplyIds)).join('');

    openReplyIds.forEach((postId) => {
        document.getElementById(`reply-section-${postId}`)?.classList.add('reply-section--open');
    });

    lucide.createIcons();
}

async function loadPosts() {
    const currentUser = getCurrentUser();
    const userParam = currentUser?.id ? `?userId=${currentUser.id}` : '';
    const data = await apiRequest(`/api/tablon${userParam}`);
    posts = data.posts;
    renderPosts();
}

function setActiveCategory(categoryKey) {
    activeCategory = categoryKey;

    document.querySelectorAll('.category-nav__button').forEach((button) => {
        button.classList.toggle('category-nav__button--active', button.dataset.category === categoryKey);
    });

    renderPosts();
}

function openAuthModal(message = 'Para participar en el tablón necesitas iniciar sesión.') {
    const { authModal, authModalMessage } = getElements();
    const loginLink = authModal.querySelector('.auth-modal__submit');

    authModalMessage.textContent = message;
    if (loginLink) {
        loginLink.href = `/Frontend/Pages/sesionusuario.html?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }
    authModal.showModal();
}

function closeAuthModal() {
    getElements().authModal.close();
}

function requireUser(message) {
    const user = getCurrentUser();
    if (!user?.id) {
        openAuthModal(message);
        return null;
    }
    return user;
}

function toggleReplies(postId) {
    const replySection = document.getElementById(`reply-section-${postId}`);
    const button = document.querySelector(`[data-toggle-replies="${postId}"]`);
    const isOpen = replySection.classList.toggle('reply-section--open');

    button.classList.toggle('post-action--active', isOpen);
    button.setAttribute('aria-expanded', isOpen);
}

async function toggleLike(postId) {
    const user = requireUser('Para dar me gusta necesitas iniciar sesión. ¿Deseas iniciar sesión ahora?');
    if (!user) return;

    const post = posts.find((item) => item.id === Number(postId));
    if (!post) return;

    if (post.liked) {
        const data = await apiRequest(`/api/tablon/${postId}/likes/${user.id}`, { method: 'DELETE' });
        post.likes = data.likes;
        post.liked = false;
    } else {
        const data = await apiRequest(`/api/tablon/${postId}/likes`, {
            method: 'POST',
            body: JSON.stringify({ userId: user.id })
        });
        post.likes = data.likes;
        post.liked = true;
    }

    renderPosts();
}

function closePostMenus() {
    document.querySelectorAll('.post-menu--open').forEach((menu) => {
        menu.classList.remove('post-menu--open');
        menu.querySelector('.post-menu__trigger')?.setAttribute('aria-expanded', 'false');
    });
}

function togglePostMenu(menuId) {
    const menu = document.querySelector(`[data-toggle-menu="${menuId}"]`)?.closest('.post-menu');
    if (!menu) return;

    const shouldOpen = !menu.classList.contains('post-menu--open');
    closePostMenus();
    menu.classList.toggle('post-menu--open', shouldOpen);
    menu.querySelector('.post-menu__trigger')?.setAttribute('aria-expanded', String(shouldOpen));
}

function openDeleteModal(postId) {
    const { deleteModal } = getElements();
    pendingDeleteTarget = { type: 'post', postId: Number(postId) };
    closePostMenus();
    deleteModal.showModal();
}

function openDeleteReplyModal(postId, replyId) {
    const { deleteModal } = getElements();
    pendingDeleteTarget = { type: 'reply', postId: Number(postId), replyId: Number(replyId) };
    closePostMenus();
    deleteModal.showModal();
}

function closeDeleteModal() {
    const { deleteModal } = getElements();
    pendingDeleteTarget = null;
    deleteModal.close();
}

async function confirmDelete() {
    if (!pendingDeleteTarget) {
        closeDeleteModal();
        return;
    }

    try {
        if (pendingDeleteTarget.type === 'post') {
            await apiRequest(`/api/tablon/${pendingDeleteTarget.postId}`, { method: 'DELETE' });
        }

        if (pendingDeleteTarget.type === 'reply') {
            await apiRequest(`/api/tablon/respuestas/${pendingDeleteTarget.replyId}`, { method: 'DELETE' });
        }

        closeDeleteModal();
        await loadPosts();
    } catch (error) {
        alert(error.message);
    }
}

async function sendReply(form) {
    const user = requireUser('Para comentar en el tablón necesitas iniciar sesión. ¿Deseas iniciar sesión ahora?');
    if (!user) return;

    const postId = Number(form.dataset.postId);
    const textarea = form.querySelector('.reply-form__textarea');
    const message = textarea.value.trim();

    if (!message) return;

    try {
        await apiRequest(`/api/tablon/${postId}/respuestas`, {
            method: 'POST',
            body: JSON.stringify({ message, userId: user.id })
        });
        textarea.value = '';
        await loadPosts();
        document.getElementById(`reply-section-${postId}`)?.classList.add('reply-section--open');
        document.querySelector(`[data-toggle-replies="${postId}"]`)?.classList.add('post-action--active');
    } catch (error) {
        alert(error.message);
    }
}

function openModal() {
    if (!requireUser('Para crear una publicación necesitas iniciar sesión. ¿Deseas iniciar sesión ahora?')) return;

    const { modal } = getElements();
    modal.showModal();
    document.getElementById('post-title')?.focus();
}

function closeModal() {
    const { modal } = getElements();
    modal.close();
}

async function submitPost(form) {
    const user = requireUser('Para crear una publicación necesitas iniciar sesión. ¿Deseas iniciar sesión ahora?');
    if (!user) return;

    const formData = new FormData(form);
    const title = String(formData.get('title')).trim();
    const message = String(formData.get('message')).trim();
    const category = String(formData.get('category'));

    if (!message) return;

    try {
        await apiRequest('/api/tablon', {
            method: 'POST',
            body: JSON.stringify({
                title,
                message,
                category,
                userId: user.id
            })
        });
        form.reset();
        closeModal();
        activeCategory = 'all';
        await loadPosts();
        setActiveCategory('all');
    } catch (error) {
        alert(error.message);
    }
}

function setUpBoardEvents() {
    const { postList, search, sort, modal, deleteModal, authModal, newPostForm } = getElements();

    document.querySelectorAll('.category-nav__button').forEach((button) => {
        button.addEventListener('click', () => setActiveCategory(button.dataset.category));
    });

    search.addEventListener('input', renderPosts);
    sort.addEventListener('change', renderPosts);

    document.querySelector('[data-open-modal]').addEventListener('click', openModal);
    document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));

    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });

    deleteModal.addEventListener('click', (event) => {
        if (event.target === deleteModal) closeDeleteModal();
    });

    authModal.addEventListener('click', (event) => {
        if (event.target === authModal) closeAuthModal();
    });

    document.querySelectorAll('[data-close-auth-modal]').forEach((button) => {
        button.addEventListener('click', closeAuthModal);
    });

    document.querySelector('[data-confirm-delete-post]').addEventListener('click', confirmDelete);
    document.querySelectorAll('[data-close-delete-modal]').forEach((button) => {
        button.addEventListener('click', closeDeleteModal);
    });

    newPostForm.addEventListener('submit', (event) => {
        event.preventDefault();
        submitPost(newPostForm);
    });

    postList.addEventListener('click', (event) => {
        const menuButton = event.target.closest('[data-toggle-menu]');
        const deleteButton = event.target.closest('[data-delete-post]');
        const deleteReplyButton = event.target.closest('[data-delete-reply]');
        const replyButton = event.target.closest('[data-toggle-replies]');
        const likeButton = event.target.closest('[data-like-post]');

        if (menuButton) {
            event.stopPropagation();
            togglePostMenu(menuButton.dataset.toggleMenu);
            return;
        }

        if (deleteButton) {
            event.stopPropagation();
            openDeleteModal(deleteButton.dataset.deletePost);
            return;
        }

        if (deleteReplyButton) {
            event.stopPropagation();
            openDeleteReplyModal(deleteReplyButton.dataset.postId, deleteReplyButton.dataset.replyId);
            return;
        }

        if (replyButton) toggleReplies(replyButton.dataset.toggleReplies);
        if (likeButton) toggleLike(likeButton.dataset.likePost);

        const authPromptButton = event.target.closest('[data-auth-prompt]');
        if (authPromptButton) {
            openAuthModal('Para comentar en el tablón necesitas iniciar sesión. ¿Deseas iniciar sesión ahora?');
        }
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.post-menu')) closePostMenus();
    });

    postList.addEventListener('submit', (event) => {
        const replyForm = event.target.closest('[data-reply-form]');
        if (!replyForm) return;

        event.preventDefault();
        sendReply(replyForm);
    });

    postList.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || event.shiftKey) return;

        const textarea = event.target.closest('.reply-form__textarea');
        if (!textarea) return;

        event.preventDefault();
        sendReply(textarea.closest('[data-reply-form]'));
    });

    postList.addEventListener('focusin', (event) => {
        const textarea = event.target.closest('.reply-form__textarea');
        if (!textarea || getCurrentUser()?.id) return;

        textarea.blur();
        openAuthModal('Para comentar en el tablón necesitas iniciar sesión. ¿Deseas iniciar sesión ahora?');
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await initNavbar();
    await initFooter();
    activeTab('tablon');
    setUpBoardEvents();

    try {
        await loadPosts();
    } catch (error) {
        getElements().postList.innerHTML = `
            <section class="empty-board">
                <i data-lucide="messages-square" aria-hidden="true"></i>
                <p>No se pudo cargar el tablon.<br>${escapeHtml(error.message)}</p>
            </section>
        `;
        lucide.createIcons();
    }
});
