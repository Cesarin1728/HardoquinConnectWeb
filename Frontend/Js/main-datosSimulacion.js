import { initNavbar } from "./navbar.js"; 
import { activeTab } from "./navbar.js";
import { initFooter } from "./footer.js";

const ranges = document.querySelectorAll('input[type="range"]');
const rainLevels = [
    {
        min: 0,
        max: 10,
        label: 'llovizna'
    },
    {
        min: 11,
        max: 35,
        label: 'leve'
    },
    {
        min: 36,
        max: 60,
        label: 'moderado'
    },
    {
        min: 61,
        max: 85,
        label: 'intensa'
    },
    {
        min: 86,
        max: 100,
        label: 'extrema'
    }
];

const transitLevels = [
    {
        min: 0,
        max: 15,
        label: 'leve'
    },
    {
        min: 16,
        max: 50,
        label: 'bajo'
    },
    {
        min: 51,
        max: 85,
        label: 'medio'
    },
    {
        min: 86,
        max: 100,
        label: 'alto'
    }
];


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
        const rainRange = document.getElementById('rain-level-input');
        const transitRange = document.getElementById('transit-level-input');
        const rainLevelTexts = document.querySelectorAll('#request-data__range-help--rain [data-level]');
        const transitLevelTexts = document.querySelectorAll('#request-data__range-help--transit [data-level]');

        const currentRainValue = rainLevels.find(level => {
            return rainRange.value >= level.min && rainRange.value <= level.max;
        });

        const currentTransitValue = transitLevels.find(level => {
            return transitRange.value >= level.min && transitRange.value <= level.max;
        });

        rainLevelTexts.forEach(text => {
            text.classList.remove('request-data__range_help-value--active');
        });
        transitLevelTexts.forEach(text => {
            text.classList.remove('request-data__range_help-value--active');
        });

        const activeRainText = document.querySelector(`#request-data__range-help--rain [data-level="${currentRainValue.label}"]`);
        const activeTransitText = document.querySelector(`#request-data__range-help--transit [data-level="${currentTransitValue.label}"]`);

        console.log(activeRainText);
        console.log(currentRainValue.label);
        activeRainText.classList.add('request-data__range_help-value--active');
        activeTransitText.classList.add('request-data__range_help-value--active');
    });
}); 

const form = document.querySelector('.request-data__form');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    console.log(formData.get('rain-level'));
})

const btnRainSense = document.querySelector('.request-data__btn--rain-sense');

btnRainSense.addEventListener('click', () => {
    //CESAR LABURA AQUI 
    console.log('click btn rain sense');
});

document.addEventListener("DOMContentLoaded", async () =>{
    await initNavbar();
    await initFooter();
    activeTab('simulaciones');
});
