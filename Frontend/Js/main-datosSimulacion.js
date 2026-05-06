import { initNavbar } from "./navbar.js"; 
import { activeTab } from "./navbar.js";

const ranges = document.querySelectorAll('input[type="range"]');

ranges.forEach(itm => {
    itm.addEventListener("input", () => {
        const field = itm.closest('.request-data__field');
        const valueText = field.querySelector('.request-data__value');

        const value = itm.value;
        itm.style.background = `
            linear-gradient(
                to right,
                rgb(var(--color-acento-azul)) 0%,
                rgb(var(--color-acento-azul)) ${value}%,
                rgb(var(--color-fondo-oscuro)) ${value}%,
                rgb(var(--color-fondo-oscuro)) 100%
            )
        `;
        valueText.textContent = `${value}%`
    });
}); 

document.addEventListener("DOMContentLoaded", async () =>{
    await initNavbar();
    activeTab('simulaciones');
});

