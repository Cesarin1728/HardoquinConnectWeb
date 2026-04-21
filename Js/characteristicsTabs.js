function initTabs() {
    const tabs = document.querySelectorAll('.characteristics__tabs-item');
    const panels = document.querySelectorAll('.characteristics__panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('characteristics__tabs-item--active'));
            panels.forEach(panel => panel.classList.remove('characteristics__panel--active'));

            tab.classList.add('characteristics__tabs-item--active');

            const activePanel = document.querySelector(`[data-panel="${target}"]`);
            activePanel.classList.add('characteristics__panel--active');
        });
    });
}

initTabs();