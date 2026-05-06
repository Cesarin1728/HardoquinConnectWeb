const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 4000;

console.log("📁 SERVER.JS ACTIVO:", __filename);

const usuariosRoutes = require('./routes/usuarios');
console.log("USUARIOS ROUTES:", usuariosRoutes);

const allowedOrigins = [
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`
];

function isLocalNetworkOrigin(origin) {
    if (!origin) return true;

    try {
        const { hostname, protocol } = new URL(origin);
        const isPrivateIp = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname);

        return protocol === 'http:' && isPrivateIp;
    } catch (error) {
        return false;
    }
}

app.use(cors({
    origin(origin, callback) {
        if (allowedOrigins.includes(origin) || isLocalNetworkOrigin(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error('Origen no permitido por CORS'));
    }
}));
app.use(bodyParser.json());
app.use(express.json());

app.use('/api/usuarios', usuariosRoutes);

let datosSensor = { distancia: 0, altura: 0, volumen: 0, lluvia: 0 };

app.post('/datos', (req, res) => {
    datosSensor = req.body;
    console.log("Datos Hardoquin:", datosSensor);
    res.status(200).send("Datos actualizados en el servidor");
});

app.get('/ver-datos', (req, res) => {
    res.json(datosSensor);
});


app.use(express.static(path.join(__dirname)));







app.use((req, res, next) => {
    console.log("REQUEST:", req.method, req.url);
    next();
});



app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor activo en: http://localhost:${port}`);
});
