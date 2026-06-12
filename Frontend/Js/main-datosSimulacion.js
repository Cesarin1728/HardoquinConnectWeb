import { initNavbar } from "./navbar.js"; 
import { activeTab } from "./navbar.js";
import { initFooter } from "./footer.js";

const UUID_SERVICIO_UART     = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const UUID_CARACTERISTICA_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

let dispositivoBluetooth = null;
let caracteristicaTx     = null;

function getApiBaseUrl() {
    const localHosts = ['localhost', '127.0.0.1'];
    const isLocalDev = localHosts.includes(window.location.hostname);
    if (window.location.protocol !== 'file:' && (!isLocalDev || window.location.port === '8088' || window.location.port === '')) return '';
    const apiHost = localHosts.includes(window.location.hostname) ? '127.0.0.1' : window.location.hostname;
    return `http://${apiHost}:8088`;
}

function showSimulationError(message) {
    const errorBox     = document.getElementById('simulation-error');
    const errorMessage = document.getElementById('simulation-error-message');
    if (!errorBox || !errorMessage) return;
    errorMessage.textContent = message;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    window.lucide?.createIcons();
}

function clearSimulationError() {
    const errorBox     = document.getElementById('simulation-error');
    const errorMessage = document.getElementById('simulation-error-message');
    if (!errorBox || !errorMessage) return;
    errorMessage.textContent = '';
    errorBox.hidden = true;
}

const rainLevels = [
    { min: 0,  max: 10,  label: 'llovizna' },
    { min: 11, max: 35,  label: 'leve'     },
    { min: 36, max: 60,  label: 'moderado' },
    { min: 61, max: 85,  label: 'intensa'  },
    { min: 86, max: 100, label: 'extrema'  }
];
const transitLevels = [
    { min: 0,  max: 15,  label: 'leve'  },
    { min: 16, max: 50,  label: 'bajo'  },
    { min: 51, max: 85,  label: 'medio' },
    { min: 86, max: 100, label: 'alto'  }
];

function updateRangeUI(input) {
    const field     = input.closest('.request-data__field');
    const valueText = field.querySelector('.request-data__value');
    const value     = input.value;

    input.style.background = `
        linear-gradient(to right,
            rgb(var(--color-acento-azul)) 0%,
            rgb(var(--color-acento-azul)) ${value}%,
            rgb(var(--color-fondo-oscuro)) ${value}%,
            rgb(var(--color-fondo-oscuro)) 100%)
    `;
    valueText.textContent = `${value}%`;

    const rainRange    = document.getElementById('rain-level-input');
    const transitRange = document.getElementById('transit-level-input');

    document.querySelectorAll('#request-data__range-help--rain [data-level]')
        .forEach(t => t.classList.remove('request-data__range_help-value--active'));
    document.querySelectorAll('#request-data__range-help--transit [data-level]')
        .forEach(t => t.classList.remove('request-data__range_help-value--active'));

    const cRain    = rainLevels.find(l => rainRange.value >= l.min && rainRange.value <= l.max);
    const cTransit = transitLevels.find(l => transitRange.value >= l.min && transitRange.value <= l.max);

    document.querySelector(`#request-data__range-help--rain [data-level="${cRain.label}"]`)
        ?.classList.add('request-data__range_help-value--active');
    document.querySelector(`#request-data__range-help--transit [data-level="${cTransit.label}"]`)
        ?.classList.add('request-data__range_help-value--active');
}

document.querySelectorAll('input[type="range"]')
    .forEach(itm => itm.addEventListener('input', () => updateRangeUI(itm)));

function aplicarNivelLluvia(porcentaje) {
    const rainRange = document.getElementById('rain-level-input');
    rainRange.value = Math.max(1, Math.min(100, Math.round(porcentaje)));
    updateRangeUI(rainRange);
}

function procesarDatosRecibidos(event) {
    const cadena = new TextDecoder('utf-8').decode(event.target.value).trim();
    const valor  = parseInt(cadena, 10);
    if (!isNaN(valor) && valor >= 0 && valor <= 100) {
        aplicarNivelLluvia(valor);
    }
}

function alDesconectar() {
    const estado = document.getElementById('estado-conexion');
    if (estado) estado.textContent = 'Dispositivo desconectado.';
}

const modal          = document.getElementById('modal-bluetooth');
const estadoConexion = document.getElementById('estado-conexion');
const btnCerrar      = document.getElementById('btn-cerrar-modal');
const btnConectar    = document.getElementById('btn-iniciar-conexion');

document.querySelector('.request-data__btn--rain-sense')
    .addEventListener('click', () => {
        estadoConexion.textContent = 'Asegúrate de que el ESP32 esté encendido.';
        modal.style.display = 'flex'; 
    });

btnCerrar.addEventListener('click', () => { modal.style.display = 'none'; });

modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
});

btnConectar.addEventListener('click', async () => {
    if (!navigator.bluetooth) {
        estadoConexion.textContent = 'Tu navegador no soporta Web Bluetooth. Usa Chrome o Edge.';
        return;
    }

    try {
        estadoConexion.textContent = 'Abriendo selector de dispositivos...';

        dispositivoBluetooth = await navigator.bluetooth.requestDevice({
            filters: [{ name: 'RainSense_ESP32' }],
            optionalServices: [UUID_SERVICIO_UART]
        });

        estadoConexion.textContent = `Conectando a ${dispositivoBluetooth.name}...`;
        dispositivoBluetooth.addEventListener('gattserverdisconnected', alDesconectar);

        const servidor  = await dispositivoBluetooth.gatt.connect();
        estadoConexion.textContent = 'Accediendo al servicio UART...';

        const servicio  = await servidor.getPrimaryService(UUID_SERVICIO_UART);
        estadoConexion.textContent = 'Vinculando flujo de datos...';

        caracteristicaTx = await servicio.getCharacteristic(UUID_CARACTERISTICA_TX);
        await caracteristicaTx.startNotifications();
        caracteristicaTx.addEventListener('characteristicvaluechanged', procesarDatosRecibidos);

        estadoConexion.textContent = '¡Conectado! Recibiendo datos...';

        setTimeout(() => { modal.style.display = 'none'; }, 1200);

    } catch (error) {
        if (error.name === 'NotFoundError') {
            estadoConexion.textContent = 'Búsqueda cancelada.';
        } else {
            estadoConexion.textContent = `Error: ${error.message}`;
        }
    }
});

const form = document.querySelector('.request-data__form');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData     = new FormData(form);
    const submitButton = form.querySelector('.request-data__btn--submit');
    const area         = Number(formData.get('area'));
    const rainLevel    = Number(formData.get('rain-level'));
    const trafficLevel = Number(formData.get('transit-level'));

    clearSimulationError();
    if (!area || area <= 0) { showSimulationError('El área debe ser mayor a 0.'); return; }

    const payload  = { title: `Simulacion ${new Date().toLocaleDateString('es-MX')}`, area, rainLevel, trafficLevel };

    submitButton.disabled    = true;
    submitButton.textContent = 'Creando...';

    try {
        const response = await fetch(`${getApiBaseUrl()}/api/simulaciones/simular`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!data.ok) { showSimulationError(data.message || 'No se pudo crear la simulacion.'); return; }
        sessionStorage.setItem('latestSimulation', JSON.stringify(data));
        window.location.href = './resultadoSimulacion.html';
    } catch {
        showSimulationError('No se pudo conectar con el servidor. Revisa que Docker esté corriendo.');
    } finally {
        submitButton.disabled    = false;
        submitButton.textContent = 'Crear Resultados';
    }
});

form.addEventListener('input', clearSimulationError);

document.addEventListener('DOMContentLoaded', async () => {
    await initNavbar();
    await initFooter();
    activeTab('simulaciones');
});