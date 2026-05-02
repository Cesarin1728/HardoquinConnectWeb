const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

let datosSensor = { distancia: 0, altura: 0, volumen: 0, lluvia: 0 };

app.post('/datos', (req, res) => {
    datosSensor = req.body;
    console.log("Datos Hardoquin:", datosSensor);
    res.status(200).send("Datos actualizados en el servidor");
});

app.get('/ver-datos', (req, res) => {
    res.json(datosSensor);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor activo en: http://192.168.1.140:${port}`);
});