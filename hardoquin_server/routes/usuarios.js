const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const { handleError, requireFields, toNumber } = require('./helpers');

const router = express.Router();
const DEFAULT_PROFILE_PHOTO = 'Assets/ImagenesPerfil/usuarioimg0.png';

function getJwtSecret() {
    return process.env.JWT_SECRET || 'hardoquin-dev-secret';
}

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            username: user.username
        },
        getJwtSecret(),
        { expiresIn: '7d' }
    );
}

function formatUser(user) {
    return {
        id: user.id,
        username: user.username,
        name: user.username,
        email: user.email,
        img: user.profile_photo || DEFAULT_PROFILE_PHOTO,
        profilePhoto: user.profile_photo || DEFAULT_PROFILE_PHOTO
    };
}

function getTokenFromRequest(req) {
    const authorizationHeader = req.headers.authorization || '';
    const [type, token] = authorizationHeader.split(' ');

    if (type !== 'Bearer' || !token) return null;
    return token;
}

router.post('/registro', async (req, res) => {
    try {
        requireFields(req.body, ['email', 'password', 'username']);

        const email = req.body.email.trim().toLowerCase();
        const username = req.body.username.trim();
        const profilePhoto = req.body.foto || req.body.profilePhoto || DEFAULT_PROFILE_PHOTO;

        const existingUser = await prisma.users.findFirst({
            where: {
                OR: [
                    { email },
                    { username }
                ]
            }
        });

        if (existingUser) {
            return res.status(409).json({
                ok: false,
                message: 'El correo o username ya esta registrado.'
            });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = await prisma.users.create({
            data: {
                username,
                email,
                password: hashedPassword,
                profile_photo: profilePhoto
            }
        });

        res.status(201).json({
            ok: true,
            message: 'Registro exitoso',
            user: formatUser(user),
            token: createToken(user)
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.post('/login', async (req, res) => {
    try {
        requireFields(req.body, ['email', 'password']);

        const email = req.body.email.trim().toLowerCase();
        const user = await prisma.users.findUnique({ where: { email } });

        if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
            return res.status(401).json({
                ok: false,
                message: 'Correo o contrasena incorrectos.'
            });
        }

        res.status(200).json({
            ok: true,
            user: formatUser(user),
            token: createToken(user)
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/sesion', async (req, res) => {
    try {
        const token = getTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({
                ok: false,
                message: 'Sesion no encontrada.'
            });
        }

        const payload = jwt.verify(token, getJwtSecret());
        const user = await prisma.users.findUnique({ where: { id: payload.id } });

        if (!user) {
            return res.status(404).json({
                ok: false,
                message: 'Usuario no encontrado.'
            });
        }

        res.json({
            ok: true,
            user: formatUser(user)
        });
    } catch (error) {
        error.status = 401;
        error.message = 'Sesion invalida o expirada.';
        handleError(res, error);
    }
});

router.get('/:id', async (req, res) => {
    try {
        const id = toNumber(req.params.id);
        if (!id) return res.status(400).json({ ok: false, message: 'ID invalido.' });

        const user = await prisma.users.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });

        res.json({
            ok: true,
            user: formatUser(user)
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.put('/:id', async (req, res) => {
    try {
        const id = toNumber(req.params.id);
        if (!id) return res.status(400).json({ ok: false, message: 'ID invalido.' });

        const user = await prisma.users.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });

        const username = req.body.username ? req.body.username.trim() : user.username;
        const profilePhoto = req.body.profilePhoto || req.body.foto || user.profile_photo || DEFAULT_PROFILE_PHOTO;
        const usernameChanged = username !== user.username;

        if (usernameChanged) {
            requireFields(req.body, ['password']);

            const passwordIsValid = await bcrypt.compare(req.body.password, user.password);
            if (!passwordIsValid) {
                return res.status(401).json({
                    ok: false,
                    message: 'Contrasena incorrecta.'
                });
            }
        }

        if (!username) {
            return res.status(400).json({
                ok: false,
                message: 'El username no puede estar vacio.'
            });
        }

        const existingUser = usernameChanged
            ? await prisma.users.findFirst({
                where: {
                    username,
                    NOT: { id }
                }
            })
            : null;

        if (existingUser) {
            return res.status(409).json({
                ok: false,
                message: 'Ese username ya esta registrado.'
            });
        }

        const updatedUser = await prisma.users.update({
            where: { id },
            data: {
                username,
                profile_photo: profilePhoto
            }
        });

        res.json({
            ok: true,
            message: 'Perfil actualizado.',
            user: formatUser(updatedUser)
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.delete('/:id', async (req, res) => {
    try {
        requireFields(req.body, ['password']);

        const id = toNumber(req.params.id);
        if (!id) return res.status(400).json({ ok: false, message: 'ID invalido.' });

        const user = await prisma.users.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });

        const passwordIsValid = await bcrypt.compare(req.body.password, user.password);
        if (!passwordIsValid) {
            return res.status(401).json({
                ok: false,
                message: 'Contrasena incorrecta.'
            });
        }

        await prisma.users.delete({ where: { id } });

        res.json({
            ok: true,
            message: 'Usuario eliminado.'
        });
    } catch (error) {
        handleError(res, error);
    }
});

module.exports = router;
