import { initNavbar } from "./navbar.js";
import { activeTab } from "./navbar.js";
import { initFooter } from "./footer.js";
import { createWave } from "./simulaciones/simulationCards.js";

let simulations = [];
let simulationToDelete = null;

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

function requireUser() {
    const user = getCurrentUser();
    if (user?.id) return user;

    const returnTo = window.location.pathname + window.location.search;
    sessionStorage.setItem('authReturnTo', returnTo);
    window.location.href = `/Frontend/Pages/sesionusuario.html?returnTo=${encodeURIComponent(returnTo)}`;
    return null;
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${getApiBaseUrl()}${path}`, options);
    const data = await response.json();

    if (!data.ok) throw new Error(data.message || 'No se pudo cargar la galeria.');
    return data;
}

function formatPercent(value) {
    return `${Math.round(Number(value) || 0)}%`;
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[char]);
}

function renderEmptyState(message) {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = `
        <section class="gallery-empty">
            <i data-lucide="folder-open" aria-hidden="true"></i>
            <p>${escapeHtml(message)}</p>
            <a class="gallery-empty__link" href="/Frontend/Pages/datosSimulacion.html">Crear simulación</a>
        </section>
    `;
    window.lucide?.createIcons();
}

function createSimulationCard(simulation) {
    const card = document.createElement('article');
    card.className = 'sim-card';
    card.dataset.simulationId = simulation.simulationId;

    card.innerHTML = `
        <figure class="sim-card__visual" aria-hidden="true">
            <canvas class="sim-card__wave" aria-hidden="true"></canvas>
            <span class="sim-card__badge sim-card__badge--with-hq">con HQ: ${formatPercent(100 - simulation.hardoquinUnfilteredPercentage)}</span>
            <span class="sim-card__badge sim-card__badge--no-hq">sin HQ: ${formatPercent(100 - simulation.asphaltUnfilteredPercentage)}</span>
        </figure>
        <section class="sim-card__body">
            <h3 class="sim-card__title">${escapeHtml(simulation.simulationTitle)}</h3>
            <section class="sim-card__overflow">
                <button class="sim-card__menu-btn" type="button" aria-label="Opciones de simulación" aria-expanded="false" data-open-simulation-menu>
                    <i data-lucide="ellipsis-vertical"></i>
                </button>
                <section class="sim-card__menu" hidden>
                    <button class="sim-card__menu-item sim-card__menu-item--danger" type="button" data-delete-simulation>
                        <i data-lucide="trash-2"></i>
                        Eliminar
                    </button>
                </section>
            </section>
        </section>
        <footer class="sim-card__meta">
            <time class="sim-card__time">
                <span class="sim-card__time-icon" data-lucide="clock"></span>
                ${escapeHtml(simulation.relativeCreatedDate)}
            </time>
            <span class="sim-card__area">${simulation.area} m²</span>
        </footer>
    `;

    return card;
}

function closeSimulationMenus(exceptCard = null) {
    document.querySelectorAll('.sim-card').forEach((card) => {
        if (card === exceptCard) return;

        const menu = card.querySelector('.sim-card__menu');
        const button = card.querySelector('[data-open-simulation-menu]');
        if (menu) menu.hidden = true;
        button?.setAttribute('aria-expanded', 'false');
    });
}

function openDeleteSimulationModal(simulation) {
    const modal = document.getElementById('delete-simulation-modal');
    const message = document.getElementById('delete-simulation-message');
    const feedback = document.getElementById('delete-simulation-feedback');

    if (!modal || !simulation) return;

    simulationToDelete = simulation;
    message.textContent = `La simulación "${simulation.simulationTitle}" se eliminará permanentemente.`;
    feedback.textContent = '';
    modal.showModal();
}

function closeDeleteSimulationModal() {
    const modal = document.getElementById('delete-simulation-modal');
    const feedback = document.getElementById('delete-simulation-feedback');

    simulationToDelete = null;
    if (feedback) feedback.textContent = '';
    modal?.close();
}

async function openStoredSimulation(simulationId) {
    const data = await apiRequest(`/api/simulaciones/${simulationId}`);
    sessionStorage.setItem('latestSimulation', JSON.stringify(data.simulation));
    window.location.href = '/Frontend/Pages/resultadoSimulacion.html';
}

function startCardWave(card, index) {
    const canvas = card.querySelector('.sim-card__wave');
    if (!canvas) return;

    const withHardoquin = Math.max(0, 100 - Number(card.dataset.hardoquinUnfiltered || 0));
    const withoutHardoquin = Math.max(0, 100 - Number(card.dataset.asphaltUnfiltered || 0));
    const initialLevel = withHardoquin || 45 + (index * 6);
    const hoverLevel = withoutHardoquin || 82;
    const wave = createWave(canvas, {
        level: initialLevel,
        color: "#4b8eff",
        amplitude: 10,
        speed: 0.008,
        frequency: 0.016
    });

    card.addEventListener("mouseenter", () => {
        wave.setLevel(hoverLevel);
        wave.setColor("#0A2342");
    });
    card.addEventListener("mouseleave", () => {
        wave.setLevel(initialLevel);
        wave.setColor("#4b8eff");
    });
}

function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    const search = document.querySelector('.gallery__search-input');
    const query = (search?.value || '').trim().toLowerCase();
    const visibleSimulations = simulations.filter((simulation) => {
        return !query || simulation.simulationTitle.toLowerCase().includes(query);
    });

    if (!visibleSimulations.length) {
        renderEmptyState(query
            ? 'No hay simulaciones que coincidan con tu busqueda.'
            : 'Todavia no tienes simulaciones guardadas.');
        return;
    }

    grid.innerHTML = '';
    visibleSimulations.forEach((simulation, index) => {
        const card = createSimulationCard(simulation);
        card.dataset.hardoquinUnfiltered = simulation.hardoquinUnfilteredPercentage;
        card.dataset.asphaltUnfiltered = simulation.asphaltUnfilteredPercentage;
        grid.appendChild(card);
        startCardWave(card, index);
    });
    window.lucide?.createIcons();
}

function setUpSearch() {
    const searchForm = document.querySelector('.gallery__search');
    const searchInput = document.querySelector('.gallery__search-input');

    searchInput?.addEventListener('input', renderGallery);
    searchForm?.addEventListener('reset', () => {
        requestAnimationFrame(renderGallery);
    });
}

function setUpSimulationActions() {
    const grid = document.getElementById('gallery-grid');
    const deleteModal = document.getElementById('delete-simulation-modal');
    const confirmDeleteButton = document.getElementById('confirm-delete-simulation');
    const deleteFeedback = document.getElementById('delete-simulation-feedback');

    grid?.addEventListener('click', (event) => {
        const menuButton = event.target.closest('[data-open-simulation-menu]');
        const deleteButton = event.target.closest('[data-delete-simulation]');
        const clickedOverflow = event.target.closest('.sim-card__overflow');

        if (menuButton) {
            event.stopPropagation();

            const card = menuButton.closest('.sim-card');
            const menu = card?.querySelector('.sim-card__menu');
            if (!card || !menu) return;

            const willOpen = menu.hidden;
            closeSimulationMenus(card);
            menu.hidden = !willOpen;
            menuButton.setAttribute('aria-expanded', String(willOpen));
            return;
        }

        if (deleteButton) {
            event.stopPropagation();

            const card = deleteButton.closest('.sim-card');
            const simulationId = Number(card?.dataset.simulationId);
            const simulation = simulations.find((item) => item.simulationId === simulationId);

            closeSimulationMenus();
            openDeleteSimulationModal(simulation);
            return;
        }

        if (!clickedOverflow) {
            const card = event.target.closest('.sim-card');
            const simulationId = Number(card?.dataset.simulationId);

            if (simulationId) {
                openStoredSimulation(simulationId).catch((error) => {
                    renderEmptyState(error.message);
                });
            }
        }
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.sim-card__overflow')) closeSimulationMenus();
    });

    document.querySelectorAll('[data-close-delete-simulation]').forEach((button) => {
        button.addEventListener('click', closeDeleteSimulationModal);
    });

    deleteModal?.addEventListener('click', (event) => {
        if (event.target === deleteModal) closeDeleteSimulationModal();
    });

    confirmDeleteButton?.addEventListener('click', async () => {
        if (!simulationToDelete) return;

        confirmDeleteButton.disabled = true;
        confirmDeleteButton.textContent = 'Eliminando...';
        deleteFeedback.textContent = '';

        try {
            await apiRequest(`/api/simulaciones/${simulationToDelete.simulationId}`, {
                method: 'DELETE'
            });

            simulations = simulations.filter((item) => item.simulationId !== simulationToDelete.simulationId);
            closeDeleteSimulationModal();
            renderGallery();
        } catch (error) {
            deleteFeedback.textContent = error.message;
        } finally {
            confirmDeleteButton.disabled = false;
            confirmDeleteButton.textContent = 'Eliminar';
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await initNavbar();
    await initFooter();
    activeTab("simulaciones");

    const user = requireUser();
    if (!user) return;

    setUpSearch();
    setUpSimulationActions();

    try {
        const data = await apiRequest(`/api/simulaciones/usuario/${user.id}`);
        simulations = data.simulations || [];
        renderGallery();
    } catch (error) {
        renderEmptyState(error.message);
    }
});
