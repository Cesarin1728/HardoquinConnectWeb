import { initNavbar, activeTab } from "./navbar.js";
import { initFooter } from "./footer.js";

let selectedPhoto = 'Assets/ImagenesPerfil/usuarioimg0.png';
let originalUsername = '';

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

function getPhotoSrc(photo) {
    if (!photo) return '/Frontend/Assets/ImagenesPerfil/usuarioimg0.png';
    if (photo.startsWith('/')) return photo;
    if (photo.startsWith('Frontend/')) return `/${photo}`;
    return `/Frontend/${photo}`;
}

function showFeedback(message, type = 'error') {
    const feedback = document.getElementById('profile-feedback');
    feedback.textContent = message;
    feedback.hidden = false;
    feedback.classList.toggle('profile-feedback--error', type === 'error');
    feedback.classList.toggle('profile-feedback--success', type === 'success');
}

function clearFeedback() {
    const feedback = document.getElementById('profile-feedback');
    feedback.textContent = '';
    feedback.hidden = true;
    feedback.classList.remove('profile-feedback--error', 'profile-feedback--success');
}

function setSelectedPhoto(photo) {
    selectedPhoto = photo;
    document.getElementById('profile-preview-img').src = getPhotoSrc(photo);
    document.querySelectorAll('.profile-avatar__option').forEach((button) => {
        button.classList.toggle('profile-avatar__option--selected', button.dataset.photo === photo);
    });
}

function fillProfile(user) {
    originalUsername = user.username || user.name || '';
    document.getElementById('profile-username').value = originalUsername;
    document.getElementById('profile-preview-name').textContent = originalUsername || 'Mi perfil';
    document.getElementById('profile-preview-email').textContent = user.email || '';
    setSelectedPhoto(user.profilePhoto || user.img || selectedPhoto);

    document.querySelector('.nav__user-name')?.replaceChildren(document.createTextNode(user.username || user.name || 'Usuario'));
    document.querySelector('.nav__dropdown-username')?.replaceChildren(document.createTextNode(user.username || user.name || 'Usuario'));

    const navPhoto = getPhotoSrc(user.profilePhoto || user.img);
    const navImage = document.querySelector('.nav__user_img-perfil');
    const dropdownImage = document.querySelector('.nav__dropdown-img');
    if (navImage) navImage.src = navPhoto;
    if (dropdownImage) dropdownImage.src = navPhoto;
    updatePasswordVisibility();
}

function updatePasswordVisibility() {
    const username = document.getElementById('profile-username').value.trim();
    const passwordSection = document.getElementById('profile-password-section');
    const passwordInput = document.getElementById('profile-password');
    const usernameChanged = username !== originalUsername;

    passwordSection.hidden = !usernameChanged;
    passwordInput.required = usernameChanged;

    if (!usernameChanged) {
        passwordInput.value = '';
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

async function updateProfile(user, payload) {
    const response = await fetch(`${getApiBaseUrl()}/api/usuarios/${user.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!data.ok) throw new Error(data.message || 'No se pudo actualizar el perfil.');
    return data.user;
}

function setUpEvents(user) {
    const form = document.getElementById('profile-form');

    document.querySelectorAll('.profile-avatar__option').forEach((button) => {
        button.addEventListener('click', () => {
            clearFeedback();
            setSelectedPhoto(button.dataset.photo);
        });
    });

    document.getElementById('profile-username').addEventListener('input', () => {
        clearFeedback();
        updatePasswordVisibility();
    });

    form.addEventListener('input', (event) => {
        if (event.target.id !== 'profile-username') clearFeedback();
    });
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearFeedback();

        const submitButton = form.querySelector('.profile-form__submit');
        const username = document.getElementById('profile-username').value.trim();
        const password = document.getElementById('profile-password').value;
        const usernameChanged = username !== originalUsername;

        if (!username) {
            showFeedback('El nombre de usuario no puede estar vacio.');
            return;
        }

        if (usernameChanged && !password) {
            showFeedback('Escribe tu contraseña actual para confirmar los cambios.');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';

        try {
            const updatedUser = await updateProfile(user, {
                username,
                profilePhoto: selectedPhoto,
                ...(usernameChanged ? { password } : {})
            });

            sessionStorage.setItem('user', JSON.stringify(updatedUser));
            document.getElementById('profile-password').value = '';
            fillProfile(updatedUser);
            showFeedback('Perfil actualizado correctamente.', 'success');
        } catch (error) {
            showFeedback(error.message);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar cambios';
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await initNavbar();
    await initFooter();
    activeTab('');

    const user = requireUser();
    if (!user) return;

    fillProfile(user);
    setUpEvents(user);
});
