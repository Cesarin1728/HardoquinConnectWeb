import { initNavbar } from "./navbar.js"; 
import { activeTab } from "./navbar.js";
import { initFooter } from "./footer.js";

function getApiBaseUrl() {
    if (window.location.port === '4000') return '';

    const localHosts = ['localhost', '127.0.0.1'];
    const apiHost = localHosts.includes(window.location.hostname)
        ? '127.0.0.1'
        : window.location.hostname;

    return `http://${apiHost}:4000`;
}

function showSimulationError(message) {
    const errorBox = document.getElementById('simulation-error');
    const errorMessage = document.getElementById('simulation-error-message');

    if (!errorBox || !errorMessage) return;

    errorMessage.textContent = message;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    window.lucide?.createIcons();
}

function clearSimulationError() {
    const errorBox = document.getElementById('simulation-error');
    const errorMessage = document.getElementById('simulation-error-message');

    if (!errorBox || !errorMessage) return;

    errorMessage.textContent = '';
    errorBox.hidden = true;
}

const ranges = document.querySelectorAll('input[type="range"]');
const rainLevels = [
    {
        min: 0,
        max: 10,
        label: 'llovizna'
    },
    {
        min: 11,
        max: 35,
        label: 'leve'
    },
    {
        min: 36,
        max: 60,
        label: 'moderado'
    },
    {
        min: 61,
        max: 85,
        label: 'intensa'
    },
    {
        min: 86,
        max: 100,
        label: 'extrema'
    }
];

const transitLevels = [
    {
        min: 0,
        max: 15,
        label: 'leve'
    },
    {
        min: 16,
        max: 50,
        label: 'bajo'
    },
    {
        min: 51,
        max: 85,
        label: 'medio'
    },
    {
        min: 86,
        max: 100,
        label: 'alto'
    }
];


ranges.forEach(itm => {
    itm.addEventListener("input", () => {
        const field = itm.closest('.request-data__field');
        const valueText = field.querySelector('.request-data__value');

        const value = itm.value;
        itm.style.background = `
            linear-gradient(
                to right,
                rgb(var(--color-acento-azul)) 0%,
                rgb(var(--color-acento-azul)) ${value}%,
                rgb(var(--color-fondo-oscuro)) ${value}%,
                rgb(var(--color-fondo-oscuro)) 100%
            )
        `;
        valueText.textContent = `${value}%`
        const rainRange = document.getElementById('rain-level-input');
        const transitRange = document.getElementById('transit-level-input');
        const rainLevelTexts = document.querySelectorAll('#request-data__range-help--rain [data-level]');
        const transitLevelTexts = document.querySelectorAll('#request-data__range-help--transit [data-level]');

        const currentRainValue = rainLevels.find(level => {
            return rainRange.value >= level.min && rainRange.value <= level.max;
        });

        const currentTransitValue = transitLevels.find(level => {
            return transitRange.value >= level.min && transitRange.value <= level.max;
        });

        rainLevelTexts.forEach(text => {
            text.classList.remove('request-data__range_help-value--active');
        });
        transitLevelTexts.forEach(text => {
            text.classList.remove('request-data__range_help-value--active');
        });

        const activeRainText = document.querySelector(`#request-data__range-help--rain [data-level="${currentRainValue.label}"]`);
        const activeTransitText = document.querySelector(`#request-data__range-help--transit [data-level="${currentTransitValue.label}"]`);

        activeRainText.classList.add('request-data__range_help-value--active');
        activeTransitText.classList.add('request-data__range_help-value--active');
    });
}); 

const form = document.querySelector('.request-data__form');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const submitButton = form.querySelector('.request-data__btn--submit');
    const area = Number(formData.get('area'));
    const rainLevel = Number(formData.get('rain-level'));
    const trafficLevel = Number(formData.get('transit-level'));

    clearSimulationError();

    if (!area || area <= 0) {
        showSimulationError('El área debe ser mayor a 0.');
        return;
    }

    const payload = {
        title: `Simulacion ${new Date().toLocaleDateString('es-MX')}`,
        area,
        rainLevel,
        trafficLevel
    };
    const endpoint = '/api/simulaciones/simular';

    submitButton.disabled = true;
    submitButton.textContent = 'Creando...';

    try {
        const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!data.ok) {
            showSimulationError(data.message || 'No se pudo crear la simulacion.');
            return;
        }

        sessionStorage.setItem('latestSimulation', JSON.stringify(data));
        window.location.href = './resultadoSimulacion.html';
    } catch (error) {
        showSimulationError(`No se pudo conectar con el servidor. Revisa que el backend este corriendo en el puerto 4000.`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Crear Resultados';
    }
});

form.addEventListener('input', clearSimulationError);

const btnRainSense = document.querySelector('.request-data__btn--rain-sense');

btnRainSense.addEventListener('click', () => {
    //CESAR LABURA AQUI 
    console.log('click btn rain sense');
});

document.addEventListener("DOMContentLoaded", async () =>{
    await initNavbar();
    await initFooter();
    activeTab('simulaciones');
});
