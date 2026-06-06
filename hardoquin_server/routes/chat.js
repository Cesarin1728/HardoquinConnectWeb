const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const { handleError } = require('./helpers');

const router = express.Router();

// conversationId (number) → adminId (number)
const advisorSessions = new Map();

function getJwtSecret() {
    return process.env.JWT_SECRET || 'hardoquin-dev-secret';
}

function getTokenFromRequest(req) {
    const authorizationHeader = req.headers.authorization || '';
    const [type, token] = authorizationHeader.split(' ');
    if (type !== 'Bearer' || !token) return null;
    return token;
}

function requireAdmin(req, res) {
    const token = getTokenFromRequest(req);
    if (!token) {
        res.status(401).json({ ok: false, message: 'No autorizado.' });
        return null;
    }
    try {
        const payload = jwt.verify(token, getJwtSecret());
        if (payload.role !== 'admin') {
            res.status(403).json({ ok: false, message: 'Acceso restringido a administradores.' });
            return null;
        }
        return payload;
    } catch (_) {
        res.status(401).json({ ok: false, message: 'Token inválido o expirado.' });
        return null;
    }
}

// GET /api/admin/chat/conversations
router.get('/conversations', async (req, res) => {
    try {
        const admin = requireAdmin(req, res);
        if (!admin) return;

        const convs = await prisma.chat_conversations.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                users: { select: { username: true } },
                chat_messages: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                    select: { message: true, sender_type: true, created_at: true }
                }
            }
        });

        const conversations = await Promise.all(convs.map(async (conv) => {
            const lastMsg = conv.chat_messages[0] || null;
            const customerMessages = await prisma.chat_messages.count({
                where: { conversation_id: conv.id, sender_type: 'user' }
            });

            return {
                id: conv.id,
                status: conv.status,
                customer_name: conv.users?.username || 'Cliente',
                created_at: conv.created_at,
                last_message: lastMsg?.message || null,
                last_message_at: lastMsg?.created_at || null,
                needs_attention: lastMsg?.sender_type === 'user',
                customer_messages: customerMessages,
                advisor_active: advisorSessions.has(conv.id)
            };
        }));

        res.json({ ok: true, conversations });
    } catch (error) {
        handleError(res, error);
    }
});

// GET /api/admin/chat/conversations/:id/messages
router.get('/conversations/:id/messages', async (req, res) => {
    try {
        const admin = requireAdmin(req, res);
        if (!admin) return;

        const conversationId = Number(req.params.id);
        if (!Number.isFinite(conversationId)) {
            return res.status(400).json({ ok: false, message: 'ID de conversación inválido.' });
        }

        const conv = await prisma.chat_conversations.findUnique({ where: { id: conversationId } });
        if (!conv) {
            return res.status(404).json({ ok: false, message: 'Conversación no encontrada.' });
        }

        const messages = await prisma.chat_messages.findMany({
            where: { conversation_id: conversationId },
            orderBy: { created_at: 'asc' },
            select: {
                id: true,
                sender_type: true,
                message: true,
                metadata: true,
                created_at: true
            }
        });

        res.json({ ok: true, messages });
    } catch (error) {
        handleError(res, error);
    }
});

// POST /api/admin/chat/conversations/:id/messages
router.post('/conversations/:id/messages', async (req, res) => {
    try {
        const admin = requireAdmin(req, res);
        if (!admin) return;

        const conversationId = Number(req.params.id);
        if (!Number.isFinite(conversationId)) {
            return res.status(400).json({ ok: false, message: 'ID de conversación inválido.' });
        }

        const message = String(req.body.message || '').trim();
        if (!message) {
            return res.status(400).json({ ok: false, message: 'El mensaje no puede estar vacío.' });
        }

        const conv = await prisma.chat_conversations.findUnique({ where: { id: conversationId } });
        if (!conv) {
            return res.status(404).json({ ok: false, message: 'Conversación no encontrada.' });
        }

        const adminUser = await prisma.users.findUnique({ where: { id: admin.id }, select: { id: true, username: true } });

        const saved = await prisma.chat_messages.create({
            data: {
                conversation_id: conversationId,
                sender_type: 'admin',
                sender_user_id: admin.id,
                message,
                metadata: { adminName: adminUser?.username || 'Admin' }
            }
        });

        res.json({ ok: true, message: saved });
    } catch (error) {
        handleError(res, error);
    }
});

// POST /api/admin/chat/conversations/:id/join
router.post('/conversations/:id/join', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const conversationId = Number(req.params.id);
    if (!Number.isFinite(conversationId)) {
        return res.status(400).json({ ok: false, message: 'ID inválido.' });
    }
    advisorSessions.set(conversationId, admin.id);
    res.json({ ok: true });
});

// POST /api/admin/chat/conversations/:id/leave
router.post('/conversations/:id/leave', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const conversationId = Number(req.params.id);
    if (!Number.isFinite(conversationId)) {
        return res.status(400).json({ ok: false, message: 'ID inválido.' });
    }
    if (advisorSessions.get(conversationId) === admin.id) {
        advisorSessions.delete(conversationId);
    }
    res.json({ ok: true });
});

// advisorSessions is exported so the WS server can check it before auto-replying
module.exports = { router, advisorSessions };
