/**
 * CONFIGURACIÓN DE SUPABASE
 */
// const SUPABASE_URL = 'https://jxrgpqroeechjbbofbfd.supabase.co';
// const SUPABASE_ANON_KEY = 'sb_publishable_iYJmQZxGd4GCDIWtqUWRew_llrsfDSH'; //Esto después no cambiamos, para que la gente no pueda ver esto

// const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ELEMENTOS DE INTERFAZ ---
const contenedor = document.getElementById('panel-principal');
const btnIrARegistro = document.getElementById('activar-registro');
const btnIrALogin = document.getElementById('activar-login');
const linkIrARegistro = document.getElementById('ir-a-registro');
const linkIrALogin = document.getElementById('ir-a-login');
const formRegistro = document.getElementById('form-registro');
const formLogin = document.getElementById('form-login');

function getReturnTo() {
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo') || sessionStorage.getItem('authReturnTo');

    if (!returnTo) return '../index.html';
    if (returnTo.includes('/Pages/sesionusuario.html')) return '../index.html';

    return returnTo;
}

function finishAuth(user) {
    sessionStorage.setItem('user', JSON.stringify(user));
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
    if (window.location.port === '4000') return '';

    const localHosts = ['localhost', '127.0.0.1'];
    const apiHost = localHosts.includes(window.location.hostname)
        ? '127.0.0.1'
        : window.location.hostname;

    return `http://${apiHost}:4000`;
}

// --- LÓGICA DE SELECCIÓN DE AVATAR ---
let rutaFotoSeleccionada = 'Assets/ImagenesPerfil/usuarioimg0.png'; // Ruta por defecto
const avatares = document.querySelectorAll('.avatar-opcion');

avatares.forEach(avatar => {
    avatar.addEventListener('click', () => {
        // Quitar la clase seleccionada de todos los avatares
        avatares.forEach(img => img.classList.remove('seleccionada'));
        
        // Añadir la clase al avatar clickeado
        avatar.classList.add('seleccionada');
        
        // Obtener la ruta del atributo data-ruta
        rutaFotoSeleccionada = avatar.getAttribute('data-ruta');
    });
});

/**
 * CONTROL DE ANIMACIÓN
 */
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

/**
 * PROCESO DE REGISTRO
 * Inserta directo en tabla Usuario, sin Auth de Supabase
 */
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
        showFeedback('register-feedback', 'No se pudo conectar con el servidor. Revisa que el backend este corriendo en el puerto 4000.');
        return;
    }

    const data = await res.json();

    if (!data.ok) {
        showFeedback('register-feedback', data.message);
        return;
    }

    showFeedback('register-feedback', 'Registro exitoso. Entrando a tu cuenta...', 'success');
    formRegistro.reset();
    
    // Resetear visualmente el avatar al primero después del registro
    avatares.forEach(img => img.classList.remove('seleccionada'));
    if(avatares[0]) avatares[0].classList.add('seleccionada');
    rutaFotoSeleccionada = 'Assets/ImagenesPerfil/usuarioimg0.png';

    finishAuth(data.user);
});

/**
 * PROCESO DE LOGIN
 * Verifica credenciales directo contra tabla Usuario
 */
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFeedback('login-feedback');

    const email = document.getElementById('log-email').value.trim();
    const password = document.getElementById('log-password').value;

    // const { data, error } = await supabaseClient.rpc('login_usuario', {
    //     p_correo: email,
    //     p_clave: password
    // });

    // if (error) {
    //     alert('Error: ' + error.message);
    //     return;
    // }

    // if (!data || data.length === 0) {
    //     alert('Correo o contraseña incorrectos.');
    //     return;
    // }

    // const usuario = data[0];

    // const user = {
    //     id: usuario.id,
    //     name: usuario.username,
    //     email: usuario.correo, 
    //     img: usuario.foto
    // };

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
        showFeedback('login-feedback', 'No se pudo conectar con el servidor. Revisa que el backend este corriendo en el puerto 4000.');
        return;
    }

    const data = await res.json();

    if (!data.ok) {
        showFeedback('login-feedback', data.message || 'Correo o contraseña incorrectos.');
        return;
    }

    showFeedback('login-feedback', 'Sesión iniciada. Regresando...', 'success');
    finishAuth(data.user);

    // alert(`¡Hola de nuevo, ${usuario.username}!`);

    // Mostrar foto de perfil y nombre de usuario en el panel de login
    // console.log('Usuario logueado:', usuario.username);

    // const fotoExistente = document.getElementById('foto-usuario-login');
    // if (fotoExistente) fotoExistente.remove();

    // const fotoEl = document.createElement('img');
    // fotoEl.id = 'foto-usuario-login';
    // fotoEl.src = `../${usuario.foto || 'Assets/ImagenesPerfil/usuarioimg0.png'}`;
    // fotoEl.alt = usuario.username;

    // document.getElementById('form-login').appendChild(fotoEl);

    // // Mostrar el nombre de usuario
    // const nombreExistente = document.getElementById('nombre-usuario-login');
    // if (nombreExistente) nombreExistente.remove();

    // const nombreEl = document.createElement('p');
    // nombreEl.id = 'nombre-usuario-login';
    // nombreEl.textContent = usuario.username;

    // document.getElementById('form-login').appendChild(nombreEl);
});

formLogin.addEventListener('input', () => clearFeedback('login-feedback'));
formRegistro.addEventListener('input', () => clearFeedback('register-feedback'));
