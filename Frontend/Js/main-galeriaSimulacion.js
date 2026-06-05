import { initNavbar } from "./navbar.js";
import { activeTab } from "./navbar.js";
import { initFooter } from "./footer.js";
import { createWave } from "./simulaciones/simulationCards.js";

let simulations = [];

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

async function apiRequest(path) {
    const response = await fetch(`${getApiBaseUrl()}${path}`);
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
        <h3 class="sim-card__title">${escapeHtml(simulation.simulationTitle)}</h3>
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

document.addEventListener("DOMContentLoaded", async () => {
    await initNavbar();
    await initFooter();
    activeTab("simulaciones");

    const user = requireUser();
    if (!user) return;

    setUpSearch();

    try {
        const data = await apiRequest(`/api/simulaciones/usuario/${user.id}`);
        simulations = data.simulations || [];
        renderGallery();
    } catch (error) {
        renderEmptyState(error.message);
    }
});
