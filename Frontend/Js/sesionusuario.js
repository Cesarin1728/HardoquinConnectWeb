/**
 * CONFIGURACIÓN DE SUPABASE
 */
const SUPABASE_URL = 'https://jxrgpqroeechjbbofbfd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iYJmQZxGd4GCDIWtqUWRew_llrsfDSH'; //Esto después no cambiamos, para que la gente no pueda ver esto

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ELEMENTOS DE INTERFAZ ---
const contenedor = document.getElementById('panel-principal');
const btnIrARegistro = document.getElementById('activar-registro');
const btnIrALogin = document.getElementById('activar-login');
const linkIrARegistro = document.getElementById('ir-a-registro');
const linkIrALogin = document.getElementById('ir-a-login');
const formRegistro = document.getElementById('form-registro');
const formLogin = document.getElementById('form-login');

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

    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const username = document.getElementById('reg-username').value.trim();

    const { error } = await supabaseClient.rpc('registrar_usuario', {
        p_username: username,
        p_clave: password,
        p_correo: email,
        p_foto: rutaFotoSeleccionada // Se envía la ruta de la imagen seleccionada
    });

    if (error) {
        alert('Error: ' + error.message);
        return;
    }

    alert('Registro exitoso');
    formRegistro.reset();
    
    // Resetear visualmente el avatar al primero después del registro
    avatares.forEach(img => img.classList.remove('seleccionada'));
    if(avatares[0]) avatares[0].classList.add('seleccionada');
    rutaFotoSeleccionada = 'Assets/ImagenesPerfil/usuarioimg0.png';

    contenedor.classList.remove('estado-registro-activo');
});

/**
 * PROCESO DE LOGIN
 * Verifica credenciales directo contra tabla Usuario
 */
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('log-email').value.trim();
    const password = document.getElementById('log-password').value;

    const { data, error } = await supabaseClient.rpc('login_usuario', {
        p_correo: email,
        p_clave: password
    });

    if (error) {
        alert('Error: ' + error.message);
        return;
    }

    if (!data || data.length === 0) {
        alert('Correo o contraseña incorrectos.');
        return;
    }

    const usuario = data[0];

    // Guardar sesión en sessionStorage
    sessionStorage.setItem('usuario', JSON.stringify(usuario));

    // alert(`¡Hola de nuevo, ${usuario.username}!`);

    // Mostrar foto de perfil y nombre de usuario en el panel de login
    console.log('Usuario logueado:', usuario.username);

    const fotoExistente = document.getElementById('foto-usuario-login');
    if (fotoExistente) fotoExistente.remove();

    const fotoEl = document.createElement('img');
    fotoEl.id = 'foto-usuario-login';
    fotoEl.src = `../${usuario.foto || 'Assets/ImagenesPerfil/usuarioimg0.png'}`;
    fotoEl.alt = usuario.username;

    document.getElementById('form-login').appendChild(fotoEl);

    // Mostrar el nombre de usuario
    const nombreExistente = document.getElementById('nombre-usuario-login');
    if (nombreExistente) nombreExistente.remove();

    const nombreEl = document.createElement('p');
    nombreEl.id = 'nombre-usuario-login';
    nombreEl.textContent = usuario.username;

    document.getElementById('form-login').appendChild(nombreEl);
});