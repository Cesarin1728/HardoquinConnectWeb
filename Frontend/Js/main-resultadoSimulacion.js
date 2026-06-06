import { initNavbar, activeTab } from "./navbar.js";
import { initFooter } from "./footer.js";
import { centerTextPlugin } from "./simulaciones/charts.js";
import { calculateCostDifference, calculateWaterDifference, formatNumberWithCommas, round2 } from "./simulaciones/calculations.js";

let hardoquinChart;
let alternateChart;
let lifespanChart;
let waterManagementChart;

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

function getLatestSimulation() {
    try {
        return JSON.parse(sessionStorage.getItem('latestSimulation'));
    } catch (error) {
        return null;
    }
}

function getStoredUser() {
    try {
        return JSON.parse(sessionStorage.getItem('user'));
    } catch (error) {
        return null;
    }
}

function normalizeMaterialName(name = '') {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function findHardoquin(results) {
    return results.find((result) => normalizeMaterialName(result.materialName).includes('hardoquin'));
}

function getAlternateResults(results, hardoquin) {
    return results.filter((result) => result.materialId !== hardoquin?.materialId);
}

function getResultTotalWater(result) {
    return Number(result.filteredWater || 0) + Number(result.unfilteredWater || 0);
}

function getPermeability(result) {
    const total = getResultTotalWater(result);
    if (!total) return 0;
    return Number(result.filteredWater || 0) / total;
}

function renderMissingSimulation() {
    document.querySelector('main').innerHTML = `
        <section class="result-empty">
            <h1>No hay resultados para mostrar</h1>
            <p>Crea una simulación para ver el análisis comparativo.</p>
            <a href="/Frontend/Pages/datosSimulacion.html">Crear simulación</a>
        </section>
    `;
}

function createDoughnutFromResult(canvas, result, color) {
    return new Chart(canvas, {
        type: "doughnut",
        plugins: [centerTextPlugin],
        data: {
            labels: ["Agua filtrada", "Agua no filtrada"],
            datasets: [{
                data: [Number(result.filteredWater || 0), Number(result.unfilteredWater || 0)],
                backgroundColor: [color, "#e5e7eb"],
                borderWidth: 0,
                hoverOffset: 5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "75%",
            animation: { duration: 800 },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => `${Math.round(context.raw)} L` } }
            }
        }
    });
}

function createLifespanFromResults(canvas, trafficLevel, hardoquin, alternate) {
    return new Chart(canvas, {
        type: "bar",
        data: {
            labels: ["Hardoquín", alternate.materialName],
            datasets: [{
                label: "Vida útil (años)",
                data: [hardoquin.usefulLife, alternate.usefulLife],
                backgroundColor: ["#22c55e", "#3b82f6"],
                borderRadius: 6,
                maxBarThickness: 54
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, grid: { color: "rgba(15,23,42,0.08)" } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => `${context.parsed.y} años` } },
                title: { display: true, text: `Nivel de tránsito ${trafficLevel}%` }
            }
        }
    });
}

function createWaterManagementFromResults(canvas, hardoquin, alternate) {
    return new Chart(canvas, {
        type: "bar",
        data: {
            labels: ["Hardoquín", alternate.materialName],
            datasets: [
                {
                    label: "Agua filtrada (L)",
                    data: [round2(hardoquin.filteredWater), round2(alternate.filteredWater)],
                    backgroundColor: "#3498DB",
                    borderRadius: 6
                },
                {
                    label: "Agua evaporada (L)",
                    data: [round2(hardoquin.evaporatedWater || 0), round2(alternate.evaporatedWater || 0)],
                    backgroundColor: "#2ECC71",
                    borderRadius: 6
                },
                {
                    label: "Agua no filtrada (L)",
                    data: [
                        round2(hardoquin.finalUnfilteredWater ?? hardoquin.unfilteredWater),
                        round2(alternate.finalUnfilteredWater ?? alternate.unfilteredWater)
                    ],
                    backgroundColor: "#E74C3C",
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { beginAtZero: true, stacked: true, grid: { color: "rgba(15,23,42,0.08)" } }
            },
            plugins: {
                legend: { display: true, position: "bottom" },
                tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${context.parsed.y} L` } },
                title: { display: true, text: "Manejo del agua por material" }
            }
        }
    });
}

function updateComparison(simulation, hardoquin, alternate) {
    const alternateMaterialLabel = document.querySelector(".comparison__label--alternate");
    const alternateCostMaterial = document.querySelector(".cost__material--alternate");
    const hardoquinCostElement = document.getElementById("cost-hardoquin");
    const alternateCostElement = document.getElementById("cost-alternate");
    const hardoquinCostDetails = document.getElementById("cost-hardoquin-details");
    const alternateCostDetails = document.getElementById("cost-alternate-details");
    const savingsAmountElement = document.getElementById("savings-amount");
    const savingsContextElement = document.getElementById("savings-context");
    const comparisonText = document.getElementById("comparison-text");
    const comparisonHighlight = document.getElementById("comparison-difference");

    alternateMaterialLabel.textContent = alternate.materialName;
    alternateCostMaterial.textContent = `${alternate.materialName} - instalación inicial`;

    const hardoquinCost = Number(hardoquin.applicationCost || 0);
    const alternateCost = Number(alternate.applicationCost || 0);
    const savingsAmount = alternate.savingsVsHardoquin ?? calculateCostDifference(hardoquinCost, alternateCost);
    const filteredDiff = alternate.filteredWaterVsHardoquin ?? calculateWaterDifference(hardoquin.filteredWater, alternate.filteredWater);

    hardoquinCostElement.textContent = `$${formatNumberWithCommas(hardoquinCost)}`;
    alternateCostElement.textContent = `$${formatNumberWithCommas(alternateCost)}`;
    hardoquinCostDetails.textContent = `${simulation.area}m²`;
    alternateCostDetails.textContent = `${simulation.area}m²`;
    savingsAmountElement.textContent = `$${formatNumberWithCommas(savingsAmount)}`;
    savingsContextElement.textContent = `vs ${alternate.materialName} en ${simulation.area}m²`;
    comparisonText.textContent = `Hardoquin permeabiliza aproximadamente ${formatNumberWithCommas(filteredDiff)} L más que ${alternate.materialName.toLowerCase()} bajo las mismas condiciones de lluvia y tránsito.`;
    comparisonHighlight.textContent = `+${formatNumberWithCommas(filteredDiff)}L`;
}

function replaceChart(chart, createNextChart) {
    chart?.destroy();
    return createNextChart();
}

function setSaveFeedback(message, type = 'error') {
    const feedback = document.getElementById('save-simulation-feedback');
    if (!feedback) return;

    feedback.textContent = message;
    feedback.dataset.type = type;
}

function updateSaveButton(saved = false) {
    const saveButton = document.getElementById('save-simulation-btn');
    if (!saveButton) return;

    saveButton.disabled = saved;
    saveButton.innerHTML = saved
        ? '<i data-lucide="check"></i> Guardada'
        : '<i data-lucide="save"></i> Guardar';
    window.lucide?.createIcons();
}

function redirectToLogin() {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    sessionStorage.setItem('authReturnTo', returnTo);
    window.location.href = `/Frontend/Pages/sesionusuario.html?returnTo=${encodeURIComponent(returnTo)}`;
}

function setupSaveSimulation(simulation) {
    const modal = document.getElementById('save-simulation-modal');
    const form = document.getElementById('save-simulation-form');
    const input = document.getElementById('simulation-name');
    const saveButton = document.getElementById('save-simulation-btn');
    const submitButton = form?.querySelector('.save-modal__submit');

    if (!modal || !form || !input || !saveButton || !submitButton) return;

    updateSaveButton(Boolean(simulation.simulationId));
    input.value = simulation.simulationTitle || simulation.title || '';

    saveButton.addEventListener('click', () => {
        const user = getStoredUser();

        if (!user?.id) {
            redirectToLogin();
            return;
        }

        setSaveFeedback('');
        input.value = simulation.simulationTitle || simulation.title || input.value;
        modal.showModal();
        input.focus();
        input.select();
    });

    document.querySelectorAll('[data-close-save-modal]').forEach((button) => {
        button.addEventListener('click', () => modal.close());
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.close();
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const user = getStoredUser();
        const title = input.value.trim();

        if (!user?.id) {
            redirectToLogin();
            return;
        }

        if (!title) {
            setSaveFeedback('Escribe un nombre para guardar la simulación.');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';
        setSaveFeedback('');

        try {
            const response = await fetch(`${getApiBaseUrl()}/api/simulaciones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    area: simulation.area,
                    rainLevel: simulation.rainLevel,
                    trafficLevel: simulation.trafficLevel,
                    userId: user.id
                })
            });
            const data = await response.json();

            if (!data.ok) {
                setSaveFeedback(data.message || 'No se pudo guardar la simulación.');
                return;
            }

            const savedSimulation = {
                ...simulation,
                ...data,
                simulationTitle: data.simulationTitle || title,
                title: data.simulationTitle || title
            };

            sessionStorage.setItem('latestSimulation', JSON.stringify(savedSimulation));
            document.getElementById('results-title').textContent = savedSimulation.simulationTitle;
            updateSaveButton(true);
            setSaveFeedback('Simulación guardada.', 'success');
            modal.close();
        } catch (error) {
            setSaveFeedback('No se pudo conectar con el servidor. Revisa que Docker esté corriendo en http://localhost:8088.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar';
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await initNavbar();
    await initFooter();
    activeTab("simulaciones");

    const simulation = getLatestSimulation();
    const results = simulation?.results || [];
    const hardoquin = findHardoquin(results);
    const alternates = getAlternateResults(results, hardoquin);

    if (!simulation || !hardoquin || !alternates.length) {
        renderMissingSimulation();
        return;
    }

    const selectMaterial = document.getElementById("select-material");
    const hardoquinCanvas = document.getElementById("chart-hardoquin-permeability");
    const alternateCanvas = document.getElementById("chart-alternate-permeability");
    const lifespanCanvas = document.getElementById("chart-lifespan");
    const waterManagementCanvas = document.getElementById("chart-water-managed");
    const areaElement = document.querySelector(".results__data-value--area");
    const rainfallElement = document.querySelector(".results__data-value--rainfall");
    const transitElement = document.querySelector(".results__data-value--traffic");
    const resultsTitle = document.getElementById("results-title");

    resultsTitle.textContent = simulation.simulationTitle || simulation.title || "Análisis comparativo";
    areaElement.textContent = `${simulation.area} m²`;
    rainfallElement.textContent = `${simulation.rainLevel}%`;
    transitElement.textContent = `${simulation.trafficLevel}%`;
    setupSaveSimulation(simulation);

    selectMaterial.innerHTML = alternates.map((material) => {
        return `<option value="${material.materialId}">${material.materialName}</option>`;
    }).join('');

    const renderSelectedMaterial = () => {
        const selectedMaterialId = Number(selectMaterial.value);
        const alternate = alternates.find((material) => material.materialId === selectedMaterialId) || alternates[0];

        updateComparison(simulation, hardoquin, alternate);

        hardoquinChart = replaceChart(hardoquinChart, () => createDoughnutFromResult(hardoquinCanvas, hardoquin, "#22c55e"));
        alternateChart = replaceChart(alternateChart, () => createDoughnutFromResult(alternateCanvas, alternate, "#3b82f6"));
        lifespanChart = replaceChart(lifespanChart, () => createLifespanFromResults(lifespanCanvas, simulation.trafficLevel, hardoquin, alternate));
        waterManagementChart = replaceChart(waterManagementChart, () => createWaterManagementFromResults(waterManagementCanvas, hardoquin, alternate));
    };

    renderSelectedMaterial();
    selectMaterial.addEventListener("change", renderSelectedMaterial);
});
