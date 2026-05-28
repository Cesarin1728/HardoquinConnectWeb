import { initNavbar } from "./navbar.js";
import { activeTab } from "./navbar.js";
import { createWave } from "./simulaciones/simulationCards.js";

document.addEventListener("DOMContentLoaded", async () => {

    await initNavbar();
    activeTab("simulaciones");

    const waveCanvases = document.querySelectorAll(".sim-card__wave");
    

    waveCanvases.forEach((canvas, index) => {
        const initialLevel = 45 + (index * 6);

        const wave = createWave(canvas, {
            level: initialLevel,
            color: "#4b8eff",
            amplitude: 10,
            speed: 0.008,
            frequency: 0.016
        });

        const card = canvas.closest(".sim-card");

        card.addEventListener("mouseenter", () => {
            wave.setLevel(82);
            wave.setColor("#0A2342");
        });
        card.addEventListener("mouseleave", () => {
            wave.setLevel(initialLevel);
            wave.setColor("#4b8eff");
        });
    });
});