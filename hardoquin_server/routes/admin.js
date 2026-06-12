const express = require('express');
const prisma = require('../prismaClient');
const { handleError, toNumber, getRequesterFromToken } = require('./helpers');

const router = express.Router();

function requireAdmin(req, res) {
    const requester = getRequesterFromToken(req);
    if (!requester) {
        res.status(401).json({ ok: false, message: 'Autenticacion requerida.' });
        return null;
    }
    if (requester.role !== 'admin') {
        res.status(403).json({ ok: false, message: 'Se requieren permisos de administrador.' });
        return null;
    }
    return requester;
}

router.get('/usuarios', async (req, res) => {
    try {
        if (!requireAdmin(req, res)) return;

        const q = (req.query.q || '').toString().trim();
        const from = req.query.from ? new Date(req.query.from) : null;
        const to = req.query.to ? new Date(req.query.to) : null;

        const where = {};
        if (q) {
            where.OR = [
                { username: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } }
            ];
        }
        if (from || to) {
            where.created_at = {};
            if (from) where.created_at.gte = from;
            if (to) {
                const endOfDay = new Date(to);
                endOfDay.setHours(23, 59, 59, 999);
                where.created_at.lte = endOfDay;
            }
        }

        const users = await prisma.users.findMany({
            where,
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                created_at: true,
                profile_photo: true
            },
            orderBy: { id: 'desc' }
        });

        res.json({ ok: true, users });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/tablon', async (req, res) => {
    try {
        if (!requireAdmin(req, res)) return;

        const q = (req.query.q || '').toString().trim();
        const featuredOnly = req.query.featured === 'true';

        const where = {};
        if (q) {
            where.OR = [
                { title: { contains: q, mode: 'insensitive' } },
                { message: { contains: q, mode: 'insensitive' } }
            ];
        }
        if (featuredOnly) where.featured = true;

        const posts = await prisma.posts.findMany({
            where,
            include: {
                users: { select: { id: true, username: true } },
                _count: { select: { likes: true, replies: true } }
            },
            orderBy: { created_at: 'desc' }
        });

        res.json({
            ok: true,
            posts: posts.map((post) => ({
                id: post.id,
                title: post.title,
                category: post.category,
                message: post.message,
                featured: post.featured,
                created_at: post.created_at,
                likes: post._count.likes,
                replies: post._count.replies,
                user: post.users
            }))
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.patch('/tablon/:id/destacar', async (req, res) => {
    try {
        if (!requireAdmin(req, res)) return;

        const id = toNumber(req.params.id);
        if (!id) return res.status(400).json({ ok: false, message: 'ID invalido.' });

        const post = await prisma.posts.findUnique({ where: { id }, select: { featured: true } });
        if (!post) return res.status(404).json({ ok: false, message: 'Publicacion no encontrada.' });

        const updated = await prisma.posts.update({
            where: { id },
            data: { featured: !post.featured }
        });

        res.json({ ok: true, featured: updated.featured });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/materiales', async (req, res) => {
    try {
        if (!requireAdmin(req, res)) return;

        const materials = await prisma.materials.findMany({ orderBy: { id: 'asc' } });
        res.json({
            ok: true,
            materials: materials.map((m) => ({
                id: m.id,
                name: m.name,
                usefulLife: m.useful_life,
                permeability: Number(m.permeability),
                costPerM2: Number(m.cost_per_m2)
            }))
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.put('/materiales/:id', async (req, res) => {
    try {
        if (!requireAdmin(req, res)) return;

        const id = toNumber(req.params.id);
        if (!id) return res.status(400).json({ ok: false, message: 'ID invalido.' });

        const costPerM2 = toNumber(req.body.costPerM2);
        if (costPerM2 === null || costPerM2 <= 0) {
            return res.status(400).json({ ok: false, message: 'El precio debe ser mayor a 0.' });
        }

        const material = await prisma.materials.findUnique({ where: { id } });
        if (!material) return res.status(404).json({ ok: false, message: 'Material no encontrado.' });

        const updated = await prisma.materials.update({
            where: { id },
            data: { cost_per_m2: costPerM2 }
        });

        res.json({
            ok: true,
            message: 'Precio actualizado.',
            material: {
                id: updated.id,
                name: updated.name,
                costPerM2: Number(updated.cost_per_m2)
            }
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/simulaciones', async (req, res) => {
    try {
        if (!requireAdmin(req, res)) return;

        const q = (req.query.q || '').toString().trim();
        const from = req.query.from ? new Date(req.query.from) : null;
        const to = req.query.to ? new Date(req.query.to) : null;

        const where = {};
        if (q) where.title = { contains: q, mode: 'insensitive' };
        if (from || to) {
            where.created_at = {};
            if (from) where.created_at.gte = from;
            if (to) {
                const endOfDay = new Date(to);
                endOfDay.setHours(23, 59, 59, 999);
                where.created_at.lte = endOfDay;
            }
        }

        const simulations = await prisma.simulations.findMany({
            where,
            include: {
                users: { select: { id: true, username: true, email: true } },
                results: {
                    include: { materials: { select: { id: true, name: true } } },
                    orderBy: { material_id: 'asc' }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        res.json({ ok: true, simulations });
    } catch (error) {
        handleError(res, error);
    }
});

module.exports = router;
