async function createFooter() {
    const url = '/Frontend/Components/footer.html';
    const footerContainer = document.getElementById('main__footer');

    if (!footerContainer) return;

    const response = await fetch(url);
    const html = await response.text();

    footerContainer.innerHTML = html;
    const user = sessionStorage.getItem('user');
    footerContainer.querySelectorAll('[data-requires-auth]').forEach((link) => {
        link.hidden = !user;
    });
    window.lucide?.createIcons();
}

export async function initFooter() {
    await createFooter();
}
