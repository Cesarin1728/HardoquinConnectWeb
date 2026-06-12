const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const usuariosRouter = require('./routes/usuarios');
const simulacionesRouter = require('./routes/simulaciones');
const tablonRouter = require('./routes/tablon');
const materialesRouter = require('./routes/materiales');
const { router: chatRouter } = require('./routes/chat');
const adminRouter = require('./routes/admin');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());
app.use('/Frontend', express.static(path.join(__dirname, '..', 'Frontend')));
app.use(express.static(path.join(__dirname)));

let datosSensor = { distancia: 0, altura: 0, volumen: 0, lluvia: 0, nivel: 0 };

app.post('/datos', (req, res) => {
    datosSensor = req.body;
    console.log("Datos Hardoquin:", datosSensor);
    res.status(200).send("Datos actualizados");
});

app.get('/ver-datos', (req, res) => {
    res.json(datosSensor);
});

app.use('/api/usuarios', usuariosRouter);
app.use('/api/simulaciones', simulacionesRouter);
app.use('/api/materiales', materialesRouter);
app.use('/api/tablon', tablonRouter);
app.use('/api/admin/chat', chatRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({
        ok: true,
        message: 'Backend Hardoquin activo',
        version: process.env.APP_VERSION || '1.0.0',
        env: process.env.APP_ENV || 'blue'
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor activo en: http://localhost:${port}`);
});
