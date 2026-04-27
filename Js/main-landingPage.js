import {initHero} from './heroAnimation.js';
import {initUI} from './ui-landingPage.js';

document.addEventListener("DOMContentLoaded", () => {
    initHero();
    initUI();
    lucide.createIcons();
});