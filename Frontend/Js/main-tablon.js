import { initNavbar } from "./navbar.js";
import { activeTab } from "./navbar.js";

const categories = {
    all: { label: 'Todas', color: '#028090' },
    experiencia: { label: 'Experiencia', color: '#52B788' },
    duda: { label: 'Duda técnica', color: '#028090' },
    uso: { label: 'Caso de uso', color: '#1B4F72' },
    general: { label: 'General', color: '#A9CCE3' }
};

let activeCategory = 'all';
let nextPostId = 7;
let pendingDeleteTarget = null;

const posts = [
    {
        id: 1,
        user: 'Carlos Mendoza',
        initials: 'CM',
        avatar: '#028090',
        title: 'Instalamos Hardoquin en el estacionamiento de nuestra empresa',
        text: 'Llevamos 6 meses con la instalación y los resultados son increíbles. En la última temporada de lluvias no tuvimos ninguna inundación.',
        category: 'experiencia',
        time: 'hace 2 días',
        likes: 14,
        liked: false,
        replies: [
            { user: 'Laura Torres', initials: 'LT', avatar: '#52B788', text: '¡Qué buen resultado! ¿Cuántos m² instalaron?', time: 'hace 1 día' },
            { user: 'Ana García', initials: 'AG', avatar: '#1B4F72', text: '¿Fue complicada la instalación?', time: 'hace 18 h' }
        ]
    },
    {
        id: 2,
        user: 'Ing. Patricia Vega',
        initials: 'PV',
        avatar: '#1B4F72',
        title: 'Duda sobre permeabilidad en zonas de alto tráfico',
        text: 'Estoy diseñando un proyecto para una calle secundaria con tránsito mixto. ¿Qué tipo de adoquín recomiendan y la permeabilidad se mantiene con el tiempo?',
        category: 'duda',
        time: 'hace 3 días',
        likes: 8,
        liked: false,
        replies: [
            { user: 'Soporte Hardoquin', initials: 'SH', avatar: '#028090', text: 'Para tránsito mixto recomendamos la línea HQ-300. La permeabilidad se mantiene por encima del 85% con mantenimiento semestral básico.', time: 'hace 2 días' }
        ]
    },
    {
        id: 3,
        user: 'Municipio de San Pedro',
        initials: 'SP',
        avatar: '#52B788',
        title: 'Caso de éxito: Plaza central renaturalizada',
        text: 'Reemplazamos 800m² de concreto por adoquín Hardoquin. Resultado: 0 inundaciones, reducción de temperatura de 4°C y recuperación del manto freático.',
        category: 'uso',
        time: 'hace 1 semana',
        likes: 31,
        liked: false,
        replies: []
    },
    {
        id: 4,
        user: 'Roberto Kim',
        initials: 'RK',
        avatar: '#0D2646',
        title: '¿Cómo exportar los resultados de la simulación?',
        text: 'Hice una simulación y me gustaría compartir los resultados con mi equipo de obras en PDF.',
        category: 'duda',
        time: 'hace 4 días',
        likes: 5,
        liked: false,
        replies: [
            { user: 'Ana García', initials: 'AG', avatar: '#028090', text: 'En tu panel hay un botón "Exportar" en la esquina superior derecha que genera el PDF completo.', time: 'hace 3 días' }
        ]
    },
    {
        id: 5,
        user: 'Fernanda Ríos',
        initials: 'FR',
        avatar: '#52B788',
        title: 'Mi experiencia como vecina, ya no hay inundaciones',
        text: 'El municipio instaló Hardoquin en las banquetas hace 8 meses. Esta temporada fue la primera en 10 años sin inundaciones.',
        category: 'experiencia',
        time: 'hace 5 días',
        likes: 22,
        liked: false,
        replies: []
    },
    {
        id: 6,
        user: 'Diego Salinas',
        initials: 'DS',
        avatar: '#028090',
        title: '¿Conocen productos compatibles para captar agua pluvial?',
        text: 'Evaluamos complementar Hardoquin con sistemas de recolección de agua pluvial. ¿Alguien ha integrado ambos?',
        category: 'general',
        time: 'hace 6 días',
        likes: 7,
        liked: false,
        replies: []
    }
];

const getElements = () => ({
    postList: document.getElementById('post-list'),
    search: document.getElementById('board-search'),
    sort: document.getElementById('board-sort'),
    modal: document.getElementById('new-post-modal'),
    deleteModal: document.getElementById('delete-post-modal'),
    newPostForm: document.getElementById('new-post-form')
});

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
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
            || post.title.toLowerCase().includes(query)
            || post.text.toLowerCase().includes(query)
            || post.user.toLowerCase().includes(query);

        return matchesCategory && matchesQuery;
    });

    if (sort.value === 'popular') {
        visiblePosts.sort((a, b) => b.likes - a.likes);
    }

    if (sort.value === 'replies') {
        visiblePosts.sort((a, b) => b.replies.length - a.replies.length);
    }

    return visiblePosts;
}

function updateCounts() {
    document.getElementById('count-all').textContent = posts.length;

    ['experiencia', 'duda', 'uso', 'general'].forEach((categoryKey) => {
        document.getElementById(`count-${categoryKey}`).textContent = posts.filter((post) => post.category === categoryKey).length;
    });
}

function renderReplies(post) {
    const replies = post.replies.map((reply, replyIndex) => {
        const menuId = `reply-menu-${post.id}-${replyIndex}`;

        return `
        <li class="reply">
            <span class="avatar reply__avatar" style="background-color: ${reply.avatar};">${escapeHtml(reply.initials)}</span>
            <article class="reply__bubble">
                <header class="reply__header">
                    <section class="reply__meta">
                        <strong class="reply__author">${escapeHtml(reply.user)}</strong>
                        <time class="reply__time">${escapeHtml(reply.time)}</time>
                    </section>
                    <section class="post-menu reply__menu">
                        <button class="post-menu__trigger" type="button" data-toggle-menu="${menuId}" aria-expanded="false" aria-controls="${menuId}" aria-label="Opciones de respuesta">
                            <i data-lucide="ellipsis" aria-hidden="true"></i>
                        </button>
                        <menu class="post-menu__list" id="${menuId}">
                            <li>
                                <button class="post-menu__item post-menu__item--danger" type="button" data-delete-reply data-post-id="${post.id}" data-reply-index="${replyIndex}">
                                    <i data-lucide="trash-2" aria-hidden="true"></i>
                                    Eliminar
                                </button>
                            </li>
                        </menu>
                    </section>
                </header>
                <p class="reply__text">${escapeHtml(reply.text)}</p>
            </article>
        </li>
        `;
    }).join('');

    return `
        <section class="reply-section" id="reply-section-${post.id}" aria-label="Respuestas de ${escapeHtml(post.title)}">
            <section class="reply-section__inner">
                <ol class="reply-list">${replies}</ol>
                <form class="reply-form" data-reply-form data-post-id="${post.id}">
                    <span class="reply-form__avatar">AG</span>
                    <label class="sr-only" for="reply-${post.id}">Escribe una respuesta</label>
                    <textarea class="reply-form__textarea" id="reply-${post.id}" rows="1" placeholder="Escribe una respuesta..."></textarea>
                    <button class="reply-form__send" type="submit">
                        <i data-lucide="send" aria-hidden="true"></i>
                        Enviar
                    </button>
                </form>
            </section>
        </section>
    `;
}

function renderPost(post, openReplyIds) {
    const isOpen = openReplyIds.has(String(post.id));
    const category = categories[post.category] || categories.general;
    const menuId = `post-menu-${post.id}`;

    return `
        <article class="community-post">
            <header class="community-post__header">
                <span class="avatar" style="background-color: ${post.avatar};">${escapeHtml(post.initials)}</span>
                <section class="community-post__meta">
                    <strong class="community-post__author">${escapeHtml(post.user)}</strong>
                    <time class="community-post__time">${escapeHtml(post.time)}</time>
                </section>
                <section class="community-post__controls">
                    <span class="community-post__category" style="${getCategoryStyle(post.category)}">${escapeHtml(category.label)}</span>
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
                </section>
            </header>

            <section class="community-post__body">
                ${post.title ? `<h2 class="community-post__title">${escapeHtml(post.title)}</h2>` : ''}
                <p class="community-post__text">${escapeHtml(post.text)}</p>
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

            ${renderReplies(post)}
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

function setActiveCategory(categoryKey) {
    activeCategory = categoryKey;

    document.querySelectorAll('.category-nav__button').forEach((button) => {
        button.classList.toggle('category-nav__button--active', button.dataset.category === categoryKey);
    });

    renderPosts();
}

function toggleReplies(postId) {
    const replySection = document.getElementById(`reply-section-${postId}`);
    const button = document.querySelector(`[data-toggle-replies="${postId}"]`);
    const isOpen = replySection.classList.toggle('reply-section--open');

    button.classList.toggle('post-action--active', isOpen);
    button.setAttribute('aria-expanded', isOpen);
}

function toggleLike(postId) {
    const post = posts.find((item) => item.id === Number(postId));
    if (!post) return;

    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
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
    const post = posts.find((item) => item.id === Number(postId));
    if (!post) return;

    pendingDeleteTarget = { type: 'post', postId: post.id };
    closePostMenus();
    deleteModal.showModal();
}

function openDeleteReplyModal(postId, replyIndex) {
    const { deleteModal } = getElements();
    const post = posts.find((item) => item.id === Number(postId));
    const index = Number(replyIndex);

    if (!post || !post.replies[index]) return;

    pendingDeleteTarget = { type: 'reply', postId: post.id, replyIndex: index };
    closePostMenus();
    deleteModal.showModal();
}

function closeDeleteModal() {
    const { deleteModal } = getElements();
    pendingDeleteTarget = null;
    deleteModal.close();
}

function confirmDelete() {
    if (!pendingDeleteTarget) {
        closeDeleteModal();
        return;
    }

    if (pendingDeleteTarget.type === 'post') {
        const index = posts.findIndex((item) => item.id === pendingDeleteTarget.postId);
        if (index !== -1) posts.splice(index, 1);
    }

    if (pendingDeleteTarget.type === 'reply') {
        const post = posts.find((item) => item.id === pendingDeleteTarget.postId);
        post?.replies.splice(pendingDeleteTarget.replyIndex, 1);
    }

    closeDeleteModal();
    renderPosts();
}

function sendReply(form) {
    const postId = Number(form.dataset.postId);
    const textarea = form.querySelector('.reply-form__textarea');
    const text = textarea.value.trim();
    const post = posts.find((item) => item.id === postId);

    if (!text || !post) return;

    post.replies.push({
        user: 'Ana García',
        initials: 'AG',
        avatar: '#028090',
        text,
        time: 'ahora'
    });

    renderPosts();
    document.getElementById(`reply-section-${postId}`)?.classList.add('reply-section--open');
    document.querySelector(`[data-toggle-replies="${postId}"]`)?.classList.add('post-action--active');
}

function openModal() {
    const { modal } = getElements();
    modal.showModal();
    document.getElementById('post-title')?.focus();
}

function closeModal() {
    const { modal } = getElements();
    modal.close();
}

function submitPost(form) {
    const formData = new FormData(form);
    const title = String(formData.get('title')).trim();
    const text = String(formData.get('message')).trim();
    const category = String(formData.get('category'));

    if (!text) return;

    posts.unshift({
        id: nextPostId++,
        user: 'Ana García',
        initials: 'AG',
        avatar: '#028090',
        title,
        text,
        category,
        time: 'ahora',
        likes: 0,
        liked: false,
        replies: []
    });

    form.reset();
    closeModal();
    setActiveCategory('all');
}

function setUpBoardEvents() {
    const { postList, search, sort, modal, deleteModal, newPostForm } = getElements();

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
            openDeleteReplyModal(deleteReplyButton.dataset.postId, deleteReplyButton.dataset.replyIndex);
            return;
        }

        if (replyButton) toggleReplies(replyButton.dataset.toggleReplies);
        if (likeButton) toggleLike(likeButton.dataset.likePost);
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
}

document.addEventListener('DOMContentLoaded', async () => {
    await initNavbar();
    activeTab('tablon');
    setUpBoardEvents();
    renderPosts();
});
