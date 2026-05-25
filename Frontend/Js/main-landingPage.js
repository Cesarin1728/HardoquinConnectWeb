import {initHero} from './heroAnimation.js';
import {initUI} from './ui-landingPage.js';
import { initNavbar } from './navbar.js';
import { activeTab } from './navbar.js';

document.addEventListener("DOMContentLoaded", async () => {
    initHero();
    initUI();
    await initNavbar();
    activeTab('inicio');
    lucide.createIcons();

    const track = document.querySelector('.benefits-slider__track');
    const dots = document.querySelectorAll('.benefits-indicator__bar');

    if (track && dots.length > 0) {
        track.addEventListener('scroll', () => {
            const scrollLeft = track.scrollLeft;
            const maxScroll = track.scrollWidth - track.clientWidth;
            const index = Math.round((scrollLeft / maxScroll) * (dots.length - 1));
            dots.forEach(dot => dot.classList.remove('active'));
            if (dots[index]) {
                dots[index].classList.add('active');
            }
        });
    }
});