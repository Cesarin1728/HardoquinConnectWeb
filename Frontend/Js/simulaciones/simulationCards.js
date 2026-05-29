export function createWave(canvas, options = {}) {
        const ctx = canvas.getContext("2d");
        let currentLevel = options.level || 65;
        let targetLevel = currentLevel;
        const hexToRgb = (hex) => {
            const clean = hex.replace("#", "");
            return {
                r: parseInt(clean.substring(0, 2), 16),
                g: parseInt(clean.substring(2, 4), 16),
                b: parseInt(clean.substring(4, 6), 16)
            };
        };

        let currentColor = hexToRgb(options.color || "#4b8eff");
        let targetColor = currentColor;
        const amplitude = options.amplitude || 12;
        const frequency = options.frequency || 0.018;
        const speed = options.speed || 0.012;

        const resizeCanvas = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        const lerp = (start, end, amount) => {
            return start + ((end - start) * amount);
        };
        let time = 0;
        const animate = () => {
            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);
            
            currentLevel = lerp(currentLevel, targetLevel, 0.06);
            currentColor.r = lerp(currentColor.r, targetColor.r, 0.06);
            currentColor.g = lerp(currentColor.g, targetColor.g, 0.06);
            currentColor.b = lerp(currentColor.b, targetColor.b, 0.06);
            const baseHeight = height - (height * (currentLevel / 100));
            ctx.beginPath();
            ctx.moveTo(0, height);
            for (let x = 0; x <= width; x++) {
                const wave1 = Math.sin((x * frequency) + time) * amplitude;
                const wave2 = Math.sin((x * (frequency * 0.6)) + (time * 1.4)) * (amplitude * 0.45);
                const verticalMotion = Math.sin(time * 0.8) * 4;
                const y = baseHeight + wave1 + wave2 + verticalMotion;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fillStyle = `rgb(${Math.round(currentColor.r)}, ${Math.round(currentColor.g)}, ${Math.round(currentColor.b)})`;
            ctx.fill();
            ctx.beginPath();
            for (let x = 0; x <= width; x++) {
                const wave1 = Math.sin((x * frequency) + time) * amplitude;
                const wave2 = Math.sin((x * (frequency * 0.6)) + (time * 1.4)) * (amplitude * 0.45);
                const verticalMotion = Math.sin(time * 0.8) * 4;
                const y = baseHeight + wave1 + wave2 + verticalMotion;
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.strokeStyle = "rgba(255,255,255,0.22)";
            ctx.lineWidth = 2;
            ctx.stroke();
            time += speed;
            requestAnimationFrame(animate);
        };
        animate();
        return {
            setLevel(level) {
                targetLevel = level;
            },
            setColor(color) {
                targetColor = hexToRgb(color);
            }
        };
    };
<article class="sim-card">
                    <figure class="sim-card__visual" aria-hidden="true">
                        <canvas class="sim-card__wave" aria-hidden="true"></canvas>
                        <span class="sim-card__badge sim-card__badge--with-hq">con HQ: 94%</span>
                        <span class="sim-card__badge sim-card__badge--no-hq">sin HQ: 82%</span>
                    </figure>
                    <h3 class="sim-card__title">Estacionamiento empresa norte</h3>
                    <footer class="sim-card__meta">
                        <time class="sim-card__time" datetime="2026-05-23">
                            <span class="sim-card__time-icon" data-lucide="clock"></span>
                            hace 2 días
                        </time>
                        <span class="sim-card__area">500 m²</span>
                    </footer>
                </article>

export function createCard(simulacionInfo) {

    const resultHQ = simulacionInfo.resultados.find(
        r => r.material === "Hardoquin"
    );

    const resultadoAsfalto = simulacionInfo.resultados.find(
        r => r.material === "Asfalto"
    );

    const porcentajeConHQ = resultHQ
        ? Math.round((resultHQ.litrosFiltrados / (resultHQ.litrosFiltrados + resultHQ.litrosNoFiltrados || 1)) * 100)
        : 0;

    const porcentajeSinHQ = resultadoAsfalto
        ? Math.round((resultadoAsfalto.litrosFiltrados / (resultadoAsfalto.litrosFiltrados + resultadoAsfalto.litrosNoFiltrados || 1)) * 100)
        : 0;

    const card = document.createElement("article");
    card.classList.add("sim-card");
    card.dataset.simulationId = simulacionInfo.id;

    const figure = document.createElement("figure");
    figure.classList.add("sim-card__visual");
    figure.setAttribute("aria-hidden", "true");

    const canvas = document.createElement("canvas");
    canvas.classList.add("sim-card__wave");
    canvas.setAttribute("aria-hidden", "true");
    figure.appendChild(canvas);

    const badgeWithHQ = document.createElement("span");
    badgeWithHQ.classList.add("sim-card__badge", "sim-card__badge--with-hq");
    badgeWithHQ.textContent = `con HQ: ${porcentajeConHQ}%`;
    figure.appendChild(badgeWithHQ);

    const badgeWithoutHQ = document.createElement("span");
    badgeWithoutHQ.classList.add("sim-card__badge", "sim-card__badge--no-hq");
    badgeWithoutHQ.textContent = `sin HQ: ${porcentajeSinHQ}%`;
    figure.appendChild(badgeWithoutHQ);

    const title = document.createElement("h3");
    title.classList.add("sim-card__title");
    title.textContent = simulacionInfo.titulo;

    const footer = document.createElement("footer");
    footer.classList.add("sim-card__meta");

    const time = document.createElement("time");
    time.classList.add("sim-card__time");
    time.setAttribute("datetime", simulacionInfo.datetime);

    const timeIcon = document.createElement("span");
    timeIcon.classList.add("sim-card__time-icon");
    timeIcon.setAttribute("data-lucide", "clock");

    time.appendChild(timeIcon);
    time.appendChild(document.createTextNode(simulacionInfo.timeAgo));

    const area = document.createElement("span");
    area.classList.add("sim-card__area");
    area.textContent = `${simulacionInfo.area} m²`;

    footer.appendChild(time);
    footer.appendChild(area);

    card.appendChild(figure);
    card.appendChild(title);
    card.appendChild(footer);

    return card;
}
