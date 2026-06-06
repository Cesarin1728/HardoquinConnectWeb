const contenedor = document.getElementById('panel-principal');
const btnIrARegistro = document.getElementById('activar-registro');
const btnIrALogin = document.getElementById('activar-login');
const linkIrARegistro = document.getElementById('ir-a-registro');
const linkIrALogin = document.getElementById('ir-a-login');
const formRegistro = document.getElementById('form-registro');
const formLogin = document.getElementById('form-login');
const userStateKeys = ['user', 'authToken', 'latestSimulation'];

function clearPreviousUserState() {
    userStateKeys.forEach((key) => sessionStorage.removeItem(key));
}

function getReturnTo() {
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo') || sessionStorage.getItem('authReturnTo');

    if (!returnTo) return '../index.html';
    if (returnTo.includes('/Pages/sesionusuario.html')) return '../index.html';

    return returnTo;
}

function finishAuth(user, token) {
    clearPreviousUserState();
    sessionStorage.setItem('user', JSON.stringify(user));
    if (token) sessionStorage.setItem('authToken', token);
    const returnTo = getReturnTo();
    sessionStorage.removeItem('authReturnTo');
    window.location.href = returnTo;
}

function showFeedback(target, message, type = 'error') {
    const feedback = document.getElementById(target);
    if (!feedback) return;

    feedback.textContent = message;
    feedback.hidden = false;
    feedback.classList.toggle('auth-feedback--error', type === 'error');
    feedback.classList.toggle('auth-feedback--success', type === 'success');
}

function clearFeedback(target) {
    const feedback = document.getElementById(target);
    if (!feedback) return;

    feedback.textContent = '';
    feedback.hidden = true;
    feedback.classList.remove('auth-feedback--error', 'auth-feedback--success');
}

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

let rutaFotoSeleccionada = 'Assets/ImagenesPerfil/usuarioimg0.png';
const avatares = document.querySelectorAll('.avatar-opcion');

avatares.forEach(avatar => {
    avatar.addEventListener('click', () => {
        avatares.forEach(img => img.classList.remove('seleccionada'));
        avatar.classList.add('seleccionada');
        rutaFotoSeleccionada = avatar.getAttribute('data-ruta');
    });
});

btnIrARegistro.addEventListener('click', () => {
    contenedor.classList.add('estado-registro-activo');
});

btnIrALogin.addEventListener('click', () => {
    contenedor.classList.remove('estado-registro-activo');
});

linkIrARegistro.addEventListener('click', (e) => {
    e.preventDefault();
    contenedor.classList.add('estado-registro-activo');
})

linkIrALogin.addEventListener('click', (e) => {
    e.preventDefault();
    contenedor.classList.remove('estado-registro-activo');
})

formRegistro.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFeedback('register-feedback');

    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const username = document.getElementById('reg-username').value.trim();

    const apiBaseUrl = getApiBaseUrl();
    let res;

    try {
        res = await fetch(`${apiBaseUrl}/api/usuarios/registro`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                username,
                foto: rutaFotoSeleccionada
            })
        });
    } catch (error) {
        showFeedback('register-feedback', 'No se pudo conectar con el servidor. Revisa que Docker este corriendo en http://localhost:8088.');
        return;
    }

    const data = await res.json();

    if (!data.ok) {
        showFeedback('register-feedback', data.message);
        return;
    }

    showFeedback('register-feedback', 'Registro exitoso. Entrando a tu cuenta...', 'success');
    formRegistro.reset();
    
    avatares.forEach(img => img.classList.remove('seleccionada'));
    if(avatares[0]) avatares[0].classList.add('seleccionada');
    rutaFotoSeleccionada = 'Assets/ImagenesPerfil/usuarioimg0.png';

    finishAuth(data.user, data.token);
});

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFeedback('login-feedback');

    const email = document.getElementById('log-email').value.trim();
    const password = document.getElementById('log-password').value;

    const apiBaseUrl = getApiBaseUrl();
    const url = `${apiBaseUrl}/api/usuarios/login`;

    let res;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });
    } catch (error) {
        showFeedback('login-feedback', 'No se pudo conectar con el servidor. Revisa que Docker este corriendo en http://localhost:8088.');
        return;
    }

    const data = await res.json();

    if (!data.ok) {
        showFeedback('login-feedback', data.message || 'Correo o contraseña incorrectos.');
        return;
    }

    showFeedback('login-feedback', 'Sesión iniciada. Regresando...', 'success');
    finishAuth(data.user, data.token);
});

document.addEventListener('DOMContentLoaded', () => {
    clearPreviousUserState();
});

formLogin.addEventListener('input', () => clearFeedback('login-feedback'));
formRegistro.addEventListener('input', () => clearFeedback('register-feedback'));
