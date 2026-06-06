const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');
const path       = require('path');
const http       = require('http');
const jwt        = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
const { Pool }   = require('pg');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const usuariosRouter     = require('./routes/usuarios');
const simulacionesRouter = require('./routes/simulaciones');
const tablonRouter       = require('./routes/tablon');
const materialesRouter   = require('./routes/materiales');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server, path: '/ws/chat' });
const port   = process.env.PORT || 4000;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const conversationClients = new Map();

const fallbackFaqs = [
    {
        answer: 'El costo depende del área y condiciones del proyecto. Usa nuestro simulador para obtener una cotización precisa.',
        keywords: ['precio', 'costo', 'cuanto', 'cotiz', 'presupuesto', 'vale']
    },
    {
        answer: 'Hardoquin infiltra entre 70 % y 95 % del agua de lluvia, reduciendo encharcamientos hasta en un 94 %.',
        keywords: ['permeable', 'agua', 'lluvia', 'infiltra', 'filtra', 'encharcamiento', 'inundacion', 'permeabilidad']
    },
    {
        answer: 'La instalación es similar al adoquín tradicional: base drenante, capa de arena y adoquines permeables. No requiere maquinaria especializada.',
        keywords: ['instalar', 'instalacion', 'instala', 'colocar', 'colocacion', 'poner', 'montaje']
    },
    {
        answer: 'Hardoquin tiene una vida útil de hasta 25 años con mantenimiento básico anual.',
        keywords: ['dura', 'duracion', 'vida util', 'anos', 'duradero', 'mantenimiento']
    },
    {
        answer: 'Está diseñado para soportar tráfico vehicular y peatonal intenso sin deformarse ni perder permeabilidad.',
        keywords: ['vehiculo', 'carro', 'camion', 'trafico', 'carga', 'resistente', 'peso']
    },
    {
        answer: 'Hardoquin favorece la recarga del manto freático al devolver el agua al suelo natural, ayudando al ciclo hídrico urbano.',
        keywords: ['ecologico', 'medioambiente', 'sostenible', 'verde', 'recarga', 'ambiental', 'ecologia']
    }
];

app.use(cors());
app.use(bodyParser.json());
app.get('/', (_req, res) => res.redirect('/Frontend/'));
app.use('/Frontend', express.static(path.join(__dirname, '..', 'Frontend')));
app.use(express.static(path.join(__dirname)));

async function crearConversacion() {
    try {
        const { rows } = await pool.query(
            `INSERT INTO chat_conversations (status) VALUES ('open') RETURNING id`
        );
        return rows[0].id;
    } catch (e) {
        console.error('[Chat DB] No se pudo crear conversación:', e.message);
        return null;
    }
}

function getJwtSecret() {
    return process.env.JWT_SECRET || 'hardoquin-dev-secret';
}

function getTokenFromRequest(req) {
    const authorizationHeader = req.headers.authorization || '';
    const [type, token] = authorizationHeader.split(' ');
    return type === 'Bearer' && token ? token : null;
}

async function requireAdmin(req, res, next) {
    try {
        const token = getTokenFromRequest(req);
        if (!token) {
            return res.status(401).json({ ok: false, message: 'Sesion requerida.' });
        }

        const payload = jwt.verify(token, getJwtSecret());
        const { rows } = await pool.query(
            'SELECT id, username, email, role FROM users WHERE id = $1',
            [payload.id]
        );
        const user = rows[0];

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ ok: false, message: 'Acceso solo para administradores.' });
        }

        req.admin = user;
        next();
    } catch (error) {
        return res.status(401).json({ ok: false, message: 'Sesion invalida o expirada.' });
    }
}

async function guardarMensaje(conversationId, senderType, message, metadata = {}) {
    if (!conversationId) return;
    try {
        await pool.query(
            `INSERT INTO chat_messages (conversation_id, sender_type, message, metadata)
             VALUES ($1, $2, $3, $4)`,
            [conversationId, senderType, message, JSON.stringify(metadata)]
        );
    } catch (e) {
        console.error('[Chat DB] No se pudo guardar mensaje:', e.message);
    }
}

async function guardarMensajeConRetorno(conversationId, senderType, message, metadata = {}) {
    const { rows } = await pool.query(
        `INSERT INTO chat_messages (conversation_id, sender_type, message, metadata)
         VALUES ($1, $2, $3, $4)
         RETURNING id, conversation_id, sender_type, message, metadata, created_at`,
        [conversationId, senderType, message, JSON.stringify(metadata)]
    );
    return rows[0];
}

async function buscarFaq(texto) {
    const fallback = buscarFaqFallback(texto);

    try {
        const { rows } = await pool.query(
            `SELECT answer FROM faqs
             WHERE is_active = true
               AND EXISTS (
                   SELECT 1 FROM jsonb_array_elements_text(keywords) k
                   WHERE lower($1) LIKE '%' || lower(k) || '%'
               )
             ORDER BY id
             LIMIT 1`,
            [texto]
        );
        return rows.length ? rows[0].answer : fallback;
    } catch (e) {
        console.error('[Chat DB] Error en buscarFaq:', e.message);
        return fallback;
    }
}

function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function buscarFaqFallback(texto) {
    const textoNormalizado = normalizarTexto(texto);
    const match = fallbackFaqs.find(faq =>
        faq.keywords.some(keyword => textoNormalizado.includes(normalizarTexto(keyword)))
    );

    return match?.answer || null;
}

function sendToConversation(conversationId, payload) {
    const msg = JSON.stringify(payload);
    const clients = conversationClients.get(Number(conversationId));
    if (!clients) return;

    clients.forEach(ws => {
        if (ws.readyState === 1) ws.send(msg);
    });
}

function trackConversationClient(conversationId, ws) {
    if (!conversationClients.has(conversationId)) {
        conversationClients.set(conversationId, new Set());
    }
    conversationClients.get(conversationId).add(ws);
}

function untrackConversationClient(conversationId, ws) {
    const clients = conversationClients.get(conversationId);
    if (!clients) return;

    clients.delete(ws);
    if (clients.size === 0) conversationClients.delete(conversationId);
}

wss.on('connection', async (ws) => {
    console.log('[WS Chat] Cliente conectado — activos:', wss.clients.size);

    ws.conversationId = await crearConversacion();
    if (ws.conversationId) trackConversationClient(ws.conversationId, ws);

    const bienvenida = {
        tipo:    'sistema',
        usuario: 'Asistente Hardoquin',
        texto:   'Bienvenido al chat de soporte. Puedes preguntar sobre Hardoquin y un asistente responderá.',
        hora:    new Date().toLocaleTimeString('es-MX')
    };
    ws.send(JSON.stringify(bienvenida));
    await guardarMensaje(ws.conversationId, 'system', bienvenida.texto);

    ws.on('message', async (raw) => {
        try {
            const { usuario = 'Anónimo', texto = '' } = JSON.parse(raw);
            if (!texto.trim()) return;

            const hora = new Date().toLocaleTimeString('es-MX');
            const nick = usuario.slice(0, 30);
            const body = texto.slice(0, 500);

            const msgUsuario = { tipo: 'mensaje', usuario: nick, texto: body, hora };
            ws.send(JSON.stringify(msgUsuario));
            await guardarMensaje(ws.conversationId, 'user', body, { nick });

            const respFaq = await buscarFaq(body);
            if (respFaq) {
                setTimeout(async () => {
                    const msgFaq = {
                        tipo:    'faq',
                        usuario: 'Asistente',
                        texto:   respFaq,
                        hora:    new Date().toLocaleTimeString('es-MX')
                    };
                    sendToConversation(ws.conversationId, msgFaq);
                    await guardarMensaje(ws.conversationId, 'assistant', respFaq, { source: 'faq' });
                }, 600);
            } else {
                setTimeout(async () => {
                    const msgAsesor = {
                        tipo:    'asesor',
                        usuario: 'Hardoquin Soporte',
                        texto:   'No encontré una respuesta automática para esa pregunta. Un asesor se conectará contigo en breve.',
                        hora:    new Date().toLocaleTimeString('es-MX')
                    };
                    if (ws.readyState === 1) ws.send(JSON.stringify(msgAsesor));
                    await guardarMensaje(ws.conversationId, 'assistant', msgAsesor.texto, { source: 'no-faq' });
                }, 800);
            }
        } catch (e) {
            console.error('[WS Chat] Error al procesar mensaje:', e.message);
        }
    });

    ws.on('close', () => {
        untrackConversationClient(ws.conversationId, ws);
        console.log('[WS Chat] Cliente desconectado — activos:', wss.clients.size);
    });
});

app.post('/datos', (req, res) => {
    console.log('Datos Hardoquin:', req.body);
    res.status(200).send('Datos actualizados');
});

app.get('/ver-datos', (_req, res) => res.json({ distancia:0, altura:0, volumen:0, lluvia:0, nivel:0 }));

app.get('/api/admin/chat/conversations', requireAdmin, async (_req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT
                c.id,
                c.status,
                c.created_at,
                c.closed_at,
                last_msg.message AS last_message,
                last_msg.sender_type AS last_sender_type,
                last_msg.created_at AS last_message_at,
                COALESCE(last_user.metadata->>'nick', 'Cliente') AS customer_name,
                COUNT(m.id) FILTER (WHERE m.sender_type = 'user') AS customer_messages
             FROM chat_conversations c
             LEFT JOIN LATERAL (
                SELECT message, sender_type, created_at
                FROM chat_messages
                WHERE conversation_id = c.id
                ORDER BY created_at DESC, id DESC
                LIMIT 1
             ) last_msg ON true
             LEFT JOIN LATERAL (
                SELECT metadata
                FROM chat_messages
                WHERE conversation_id = c.id AND sender_type = 'user'
                ORDER BY created_at DESC, id DESC
                LIMIT 1
             ) last_user ON true
             LEFT JOIN chat_messages m ON m.conversation_id = c.id
             GROUP BY c.id, last_msg.message, last_msg.sender_type, last_msg.created_at, last_user.metadata
             ORDER BY COALESCE(last_msg.created_at, c.created_at) DESC
             LIMIT 50`
        );

        res.json({ ok: true, conversations: rows });
    } catch (error) {
        console.error('[Admin Chat] Error listando conversaciones:', error.message);
        res.status(500).json({ ok: false, message: 'No se pudieron cargar las conversaciones.' });
    }
});

app.get('/api/admin/chat/conversations/:id/messages', requireAdmin, async (req, res) => {
    try {
        const conversationId = Number(req.params.id);
        if (!Number.isFinite(conversationId)) {
            return res.status(400).json({ ok: false, message: 'Conversacion invalida.' });
        }

        const { rows } = await pool.query(
            `SELECT id, conversation_id, sender_type, message, metadata, created_at
             FROM chat_messages
             WHERE conversation_id = $1
             ORDER BY created_at ASC, id ASC`,
            [conversationId]
        );

        res.json({ ok: true, messages: rows });
    } catch (error) {
        console.error('[Admin Chat] Error cargando mensajes:', error.message);
        res.status(500).json({ ok: false, message: 'No se pudieron cargar los mensajes.' });
    }
});

app.post('/api/admin/chat/conversations/:id/messages', requireAdmin, async (req, res) => {
    try {
        const conversationId = Number(req.params.id);
        const message = String(req.body.message || '').trim().slice(0, 500);

        if (!Number.isFinite(conversationId)) {
            return res.status(400).json({ ok: false, message: 'Conversacion invalida.' });
        }

        if (!message) {
            return res.status(400).json({ ok: false, message: 'Escribe una respuesta.' });
        }

        const exists = await pool.query(
            'SELECT id FROM chat_conversations WHERE id = $1',
            [conversationId]
        );

        if (exists.rowCount === 0) {
            return res.status(404).json({ ok: false, message: 'Conversacion no encontrada.' });
        }

        const saved = await guardarMensajeConRetorno(conversationId, 'admin', message, {
            adminId: req.admin.id,
            adminName: req.admin.username
        });
        const payload = {
            tipo: 'asesor',
            usuario: req.admin.username || 'Soporte Hardoquin',
            texto: message,
            hora: new Date(saved.created_at).toLocaleTimeString('es-MX')
        };

        sendToConversation(conversationId, payload);

        res.status(201).json({ ok: true, message: saved });
    } catch (error) {
        console.error('[Admin Chat] Error enviando respuesta:', error.message);
        res.status(500).json({ ok: false, message: 'No se pudo enviar la respuesta.' });
    }
});

app.use('/api/usuarios',     usuariosRouter);
app.use('/api/simulaciones', simulacionesRouter);
app.use('/api/materiales',   materialesRouter);
app.use('/api/tablon',       tablonRouter);

app.get('/api/health', async (_req, res) => {
    let faqCount = 0;
    try {
        const { rows } = await pool.query('SELECT COUNT(*) AS c FROM faqs WHERE is_active = true');
        faqCount = parseInt(rows[0].c, 10);
    } catch (_) {}

    res.json({
        ok:        true,
        message:   'Backend Hardoquin v2.0 — Chat WebSocket + DB activo',
        version:   process.env.APP_VERSION || '2.0.0',
        env:       process.env.APP_ENV     || 'green',
        wsClients: wss.clients.size,
        faqs:      faqCount
    });
});

server.listen(port, '0.0.0.0', () => {
    console.log(`[v2] Servidor: http://localhost:${port}`);
    console.log(`[v2] Chat WS:  ws://localhost:${port}/ws/chat`);
});
