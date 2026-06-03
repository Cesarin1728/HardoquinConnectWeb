const express = require('express');
const prisma = require('../prismaClient');
const { getRelativeTime, handleError, requireFields, toNumber } = require('./helpers');

const router = express.Router();
const DEFAULT_PROFILE_PHOTO = 'Assets/ImagenesPerfil/usuarioimg0.png';
const CATEGORY_ALIASES = {
    duda: 'duda-tecnica',
    uso: 'caso-uso'
};

function normalizeCategory(category) {
    const value = (category || '').toString().trim();
    return CATEGORY_ALIASES[value] || value;
}

function formatUser(user) {
    return {
        id: user.id,
        username: user.username,
        profilePhoto: user.profile_photo || DEFAULT_PROFILE_PHOTO
    };
}

function formatReply(reply) {
    return {
        id: reply.id,
        user: formatUser(reply.users),
        message: reply.message,
        relativeCreatedDate: getRelativeTime(reply.created_at)
    };
}

function formatPost(post, currentUserId = null) {
    return {
        id: post.id,
        user: formatUser(post.users),
        title: post.title,
        category: post.category,
        message: post.message,
        relativeCreatedDate: getRelativeTime(post.created_at),
        likes: post.likes.length,
        liked: currentUserId ? post.likes.some((like) => like.user_id === currentUserId) : false,
        replies: post.replies.map(formatReply)
    };
}

function getPostInclude() {
    return {
        users: true,
        likes: true,
        replies: {
            include: { users: true },
            orderBy: { created_at: 'asc' }
        }
    };
}

function sortPosts(posts, sort) {
    if (sort === 'popular') {
        return posts.sort((a, b) => b.likes.length - a.likes.length);
    }

    if (sort === 'replies') {
        return posts.sort((a, b) => b.replies.length - a.replies.length);
    }

    return posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getPostWhere(query) {
    const category = (query.category || '').toString().trim();
    const search = (query.search || '').toString().trim();
    const where = {};

    if (category && category !== 'all') {
        where.category = normalizeCategory(category);
    }

    if (search) {
        where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { message: { contains: search, mode: 'insensitive' } }
        ];
    }

    return where;
}

async function getFormattedPost(postId, currentUserId = null) {
    const post = await prisma.posts.findUnique({
        where: { id: postId },
        include: getPostInclude()
    });

    if (!post) return null;
    return formatPost(post, currentUserId);
}

router.get('/', async (req, res) => {
    try {
        const currentUserId = toNumber(req.query.userId);
        const sort = (req.query.sort || 'recent').toString();
        const posts = await prisma.posts.findMany({
            where: getPostWhere(req.query),
            include: getPostInclude()
        });

        res.json({
            ok: true,
            posts: sortPosts(posts, sort).map((post) => formatPost(post, currentUserId))
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/categoria/:category', async (req, res) => {
    try {
        const query = {
            ...req.query,
            category: req.params.category
        };
        const currentUserId = toNumber(req.query.userId);
        const sort = (req.query.sort || 'recent').toString();
        const posts = await prisma.posts.findMany({
            where: getPostWhere(query),
            include: getPostInclude()
        });

        res.json({
            ok: true,
            posts: sortPosts(posts, sort).map((post) => formatPost(post, currentUserId))
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/buscar', async (req, res) => {
    try {
        const search = (req.query.q || req.query.search || '').toString().trim();

        if (!search) {
            return res.status(400).json({
                ok: false,
                message: 'La busqueda no puede estar vacia.'
            });
        }

        const query = {
            ...req.query,
            search
        };
        const currentUserId = toNumber(req.query.userId);
        const sort = (req.query.sort || 'recent').toString();
        const posts = await prisma.posts.findMany({
            where: getPostWhere(query),
            include: getPostInclude()
        });

        res.json({
            ok: true,
            posts: sortPosts(posts, sort).map((post) => formatPost(post, currentUserId))
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/respuestas/:replyId', async (req, res) => {
    try {
        const replyId = toNumber(req.params.replyId);
        if (!replyId) return res.status(400).json({ ok: false, message: 'ID de respuesta invalido.' });

        const reply = await prisma.replies.findUnique({
            where: { id: replyId },
            include: { users: true }
        });

        if (!reply) return res.status(404).json({ ok: false, message: 'Respuesta no encontrada.' });

        res.json({
            ok: true,
            reply: formatReply(reply)
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.post('/', async (req, res) => {
    try {
        requireFields(req.body, ['message', 'category', 'userId']);

        const userId = toNumber(req.body.userId);
        if (!userId) return res.status(400).json({ ok: false, message: 'ID de usuario invalido.' });

        const post = await prisma.posts.create({
            data: {
                title: req.body.title ? req.body.title.trim() : null,
                message: req.body.message.trim(),
                category: normalizeCategory(req.body.category),
                user_id: userId
            },
            include: getPostInclude()
        });

        res.status(201).json({
            ok: true,
            post: formatPost(post, userId)
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/:id', async (req, res) => {
    try {
        const id = toNumber(req.params.id);
        const currentUserId = toNumber(req.query.userId);
        if (!id) return res.status(400).json({ ok: false, message: 'ID invalido.' });

        const post = await getFormattedPost(id, currentUserId);
        if (!post) return res.status(404).json({ ok: false, message: 'Mensaje no encontrado.' });

        res.json({
            ok: true,
            post
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const id = toNumber(req.params.id);
        if (!id) return res.status(400).json({ ok: false, message: 'ID invalido.' });

        const deletedPost = await prisma.$transaction(async (tx) => {
            await tx.likes.deleteMany({ where: { post_id: id } });
            await tx.replies.deleteMany({ where: { post_id: id } });
            return tx.posts.deleteMany({ where: { id } });
        });

        if (deletedPost.count === 0) {
            return res.status(404).json({
                ok: false,
                message: 'Mensaje no encontrado.'
            });
        }

        res.json({
            ok: true,
            message: 'Mensaje eliminado.'
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.post('/:postId/respuestas', async (req, res) => {
    try {
        requireFields(req.body, ['message', 'userId']);

        const postId = toNumber(req.params.postId);
        const userId = toNumber(req.body.userId);

        if (!postId || !userId) {
            return res.status(400).json({
                ok: false,
                message: 'ID de mensaje o usuario invalido.'
            });
        }

        const reply = await prisma.replies.create({
            data: {
                post_id: postId,
                user_id: userId,
                message: req.body.message.trim()
            },
            include: { users: true }
        });

        res.status(201).json({
            ok: true,
            reply: formatReply(reply)
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/:postId/respuestas', async (req, res) => {
    try {
        const postId = toNumber(req.params.postId);
        if (!postId) return res.status(400).json({ ok: false, message: 'ID de mensaje invalido.' });

        const replies = await prisma.replies.findMany({
            where: { post_id: postId },
            include: { users: true },
            orderBy: { created_at: 'asc' }
        });

        res.json({
            ok: true,
            replies: replies.map(formatReply)
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.delete('/:postId/respuestas', async (req, res) => {
    try {
        const postId = toNumber(req.params.postId);
        if (!postId) return res.status(400).json({ ok: false, message: 'ID de mensaje invalido.' });

        const deletedReplies = await prisma.replies.deleteMany({
            where: { post_id: postId }
        });

        res.json({
            ok: true,
            message: 'Respuestas eliminadas.',
            deletedCount: deletedReplies.count
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.delete('/respuestas/:replyId', async (req, res) => {
    try {
        const replyId = toNumber(req.params.replyId);
        if (!replyId) return res.status(400).json({ ok: false, message: 'ID de respuesta invalido.' });

        const deletedReply = await prisma.replies.deleteMany({ where: { id: replyId } });

        if (deletedReply.count === 0) {
            return res.status(404).json({
                ok: false,
                message: 'Respuesta no encontrada.'
            });
        }

        res.json({
            ok: true,
            message: 'Respuesta eliminada.'
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.post('/:postId/likes', async (req, res) => {
    try {
        requireFields(req.body, ['userId']);

        const postId = toNumber(req.params.postId);
        const userId = toNumber(req.body.userId);

        if (!postId || !userId) {
            return res.status(400).json({
                ok: false,
                message: 'ID de mensaje o usuario invalido.'
            });
        }

        const existingLike = await prisma.likes.findFirst({
            where: {
                post_id: postId,
                user_id: userId
            }
        });
        const like = existingLike || await prisma.likes.create({
            data: {
                post_id: postId,
                user_id: userId
            }
        });
        const likes = await prisma.likes.count({ where: { post_id: postId } });

        res.status(201).json({
            ok: true,
            like,
            likes
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/:postId/likes', async (req, res) => {
    try {
        const postId = toNumber(req.params.postId);
        const userId = toNumber(req.query.userId);

        if (!postId) return res.status(400).json({ ok: false, message: 'ID de mensaje invalido.' });

        const likes = await prisma.likes.count({ where: { post_id: postId } });
        const liked = userId
            ? Boolean(await prisma.likes.findFirst({
                where: {
                    post_id: postId,
                    user_id: userId
                }
            }))
            : false;

        res.json({
            ok: true,
            likes,
            liked
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.delete('/:postId/likes/:userId', async (req, res) => {
    try {
        const postId = toNumber(req.params.postId);
        const userId = toNumber(req.params.userId);

        if (!postId || !userId) {
            return res.status(400).json({
                ok: false,
                message: 'ID de mensaje o usuario invalido.'
            });
        }

        await prisma.likes.deleteMany({
            where: {
                post_id: postId,
                user_id: userId
            }
        });

        const likes = await prisma.likes.count({ where: { post_id: postId } });

        res.json({
            ok: true,
            likes
        });
    } catch (error) {
        handleError(res, error);
    }
});

module.exports = router;
