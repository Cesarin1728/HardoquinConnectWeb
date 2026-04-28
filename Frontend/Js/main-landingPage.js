import {initHero} from './heroAnimation.js';
import {initUI} from './ui-landingPage.js';
import { initNavbar } from './navbar.js';

document.addEventListener("DOMContentLoaded", async () => {
    initHero();
    initUI();
    await initNavbar();
    lucide.createIcons();
});