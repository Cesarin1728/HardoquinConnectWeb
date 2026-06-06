import {initHero} from './landing page/heroAnimation.js';
import {initUI} from './landing page/ui-landingPage.js';
import { initNavbar } from './navbar.js';
import { activeTab } from './navbar.js';
import { initFooter } from './footer.js';

document.addEventListener("DOMContentLoaded", async () => {
    initHero();
    initUI();
    await initNavbar();
    await initFooter();
    activeTab('inicio');
    lucide.createIcons();

    const track = document.querySelector('.benefits-slider__track');
    const dots = document.querySelectorAll('.benefits-indicator__bar');
    const previousButton = document.getElementById('benefits-slider__previous');
    const nextButton = document.getElementById('benefits-slider__next');

    if (track && dots.length > 0) {
        const updateActiveDot = () => {
            const maxScroll = track.scrollWidth - track.clientWidth;
            const index = maxScroll > 0
                ? Math.round((track.scrollLeft / maxScroll) * (dots.length - 1))
                : 0;

            dots.forEach(dot => dot.classList.remove('active'));
            dots[index]?.classList.add('active');
        };

        const scrollBenefits = (direction) => {
            const card = track.querySelector('.benefits-card');
            const gap = parseFloat(getComputedStyle(track).gap) || 0;
            const distance = card ? card.getBoundingClientRect().width + gap : track.clientWidth;

            track.scrollBy({
                left: direction * distance,
                behavior: 'smooth'
            });
        };

        track.addEventListener('scroll', updateActiveDot);
        previousButton?.addEventListener('click', () => scrollBenefits(-1));
        nextButton?.addEventListener('click', () => scrollBenefits(1));
        updateActiveDot();
    }
});
