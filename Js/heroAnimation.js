const lluvia = {
    cantidad: 130,
    opacidadMin: 0.4,
    opacidadMax: 0.68,
    velocidadMin: 3,
    velocidadMax: 6, 
    largoMin: 20,
    largoMax: 30,
    color: "2, 128, 144",
};

const ripples = {
    radioMin: 70,
    radioMax: 150,
    velocidad: 0.75,
    frecuenciaMin: 5,
    frecuenciaMax: 10,
    aplanado: 0.28,
    colorPrincipal: "2, 188,144",
    colorSecundario: "82, 183, 136",
};

function iniciarHero(){
    const canvas = document.getElementById('hero__canvas');
    if(!canvas) return;

    const pincel = canvas.getContext("2d");

    let width, height, t = 0;
    let gotas = [];
    let arrRipples = [];
    let nextRipple = 10;

    function resize(){
        width = canvas.parentElement.offsetWidth;
        height = canvas.parentElement.offsetHeight;
        canvas.width = width;
        canvas.height = height;
        crearGotas();
    }

    function crearGotas(){
        gotas = [];
        for(let i = 0; i < lluvia.cantidad; i++){
            gotas.push({
                x: Math.random() * width,
                y: Math.random() * height,
                yMax: height * 0.6 + Math.random() * height * 0.3,
                largo: lluvia.largoMin + Math.random() * (lluvia.largoMax - lluvia.largoMin),
                velocidad: lluvia.velocidadMin + Math.random() * (lluvia.velocidadMax - lluvia.velocidadMin),
                opacidad: lluvia.opacidadMin + Math.random() * (lluvia.opacidadMax - lluvia.opacidadMin),
            });
        }
    }

    function dibujarFondo(){
        pincel.clearRect(0, 0, canvas.width, canvas.height);
        pincel.fillStyle = "#0D2646";
        pincel.fillRect(0, 0, canvas.width, canvas.height);
    }

    function dibujarLluvia(){
        gotas.forEach(gota => {
                pincel.beginPath();
                pincel.moveTo(gota.x, gota.y);
                pincel.lineTo(gota.x - 0.5, gota.y + gota.largo);
                pincel.strokeStyle = `rgba(${lluvia.color}, ${gota.opacidad})`;
                pincel.lineWidth = 1.2;
                pincel.stroke();
                gota.y += gota.velocidad;
                if(gota.y > gota.yMax) {
                    crearRipple(gota.x, gota.yMax);
                    gota.y = -gota.largo;
                    gota.x = Math.random() * width;
                }
            })
        }

    function crearRipple(x, y){
        if(t >= nextRipple){
            arrRipples.push({
                x: x,
                y: y,
                radio: 0, 
                radioMax: ripples.radioMin + Math.random() * (ripples.radioMax - ripples.radioMin),
                velocidad: ripples.velocidad + Math.random() * 0.4,
            });
            nextRipple = t + ripples.frecuenciaMin + Math.floor(Math.random() * ripples.frecuenciaMax);
        }
    }

    function dibujarRipples(xGota, yGota){
        arrRipples = arrRipples.filter(ripple => ripple.radio < ripple.radioMax)
        arrRipples.forEach(ripple => {
            ripple.radio += ripple.velocidad;
            const progreso = ripple.radio / ripple.radioMax;
            const opacidad = (1 - progreso) * 0.5;
            pincel.beginPath();
            pincel.ellipse(ripple.x, ripple.y, ripple.radio, ripple.radio * ripples.aplanado, 0, 0, Math.PI * 2);
            pincel.strokeStyle = `rgba(${ripples.colorPrincipal}, ${opacidad * 0.5})`;
            pincel.shadowBlur = 12;
            pincel.shadowColor = `rgba(${ripples.colorPrincipal}, ${opacidad})`;
            pincel.lineWidth = 1;
            pincel.stroke();
            if(ripple.radio > 18){
                pincel.beginPath();
                pincel.ellipse(ripple.x, ripple.y, ripple.radio * 0.55, ripple.radio * 0.55 * ripples.aplanado, 0, 0, Math.PI * 2);
                pincel.strokeStyle = `rgba(${ripples.colorSecundario}, ${opacidad * 0.5})`;
                pincel.shadowBlur = 12;
                pincel.shadowColor = `rgba(${ripples.colorSecundario}, ${opacidad})`;
                pincel.lineWidth = 0.5;
                pincel.stroke();
            }
        });
    }

    function dibujarLuzEnfoque(){
        const enfoque = pincel.createRadialGradient(width/2, height/2, height * 0.03, width/2, height/2, height * 0.82);
        enfoque.addColorStop(0, "rgba(0,0,0,0)");
        enfoque.addColorStop(1, "rgba(0,0,0,0.5)");
        pincel.fillStyle = enfoque;
        pincel.shadowBlur = 0;
        pincel.shadowColor = "";
        pincel.fillRect(0, 0, width, height);
    }

    function dibujar(){
        dibujarFondo();
        dibujarLluvia();
        dibujarRipples();
        dibujarLuzEnfoque();
        t++;
        requestAnimationFrame(dibujar);
    }

    resize();
    window.addEventListener('resize', resize);
    dibujar();

}

iniciarHero();