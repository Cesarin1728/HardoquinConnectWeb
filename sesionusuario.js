/**
 * CONFIGURACIÓN DE SUPABASE
 */
const SUPABASE_URL = 'https://jxrgpqroeechjbbofbfd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iYJmQZxGd4GCDIWtqUWRew_llrsfDSH'; //Esto después no cambiamos, para que la gente no pueda ver esto

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ELEMENTOS DE INTERFAZ ---
const contenedor     = document.getElementById('panel-principal');
const btnIrARegistro = document.getElementById('activar-registro');
const btnIrALogin    = document.getElementById('activar-login');
const formRegistro   = document.getElementById('form-registro');
const formLogin      = document.getElementById('form-login');

/**
 * CONTROL DE ANIMACIÓN
 */
btnIrARegistro.addEventListener('click', () => {
    contenedor.classList.add('estado-registro-activo');
});

btnIrALogin.addEventListener('click', () => {
    contenedor.classList.remove('estado-registro-activo');
});

/**
 * PROCESO DE REGISTRO
 * Inserta directo en tabla Usuario, sin Auth de Supabase
 */
formRegistro.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const username = document.getElementById('reg-username').value.trim();

    const { error } = await supabaseClient.rpc('registrar_usuario', {
        p_username: username,
        p_clave:    password,
        p_correo:   email
    });

    if (error) {
        alert('Error al registrarse: ' + error.message);
        return;
    }

    alert('¡Registro exitoso! Ya puedes iniciar sesión.');
    formRegistro.reset();
    contenedor.classList.remove('estado-registro-activo');
});

/**
 * PROCESO DE LOGIN
 * Verifica credenciales directo contra tabla Usuario
 */
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('log-email').value.trim();
    const password = document.getElementById('log-password').value;

    const { data, error } = await supabaseClient.rpc('login_usuario', {
        p_correo: email,
        p_clave:  password
    });

    if (error) {
        alert('Error de acceso: ' + error.message);
        return;
    }

    if (!data || data.length === 0) {
        alert('Correo o contraseña incorrectos.');
        return;
    }

    const usuario = data[0];

    // Guardar sesión en sessionStorage
    sessionStorage.setItem('usuario', JSON.stringify(usuario));

    alert(`¡Hola de nuevo, ${usuario.username}!`);
});