const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://jxrgpqroeechjbbofbfd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iYJmQZxGd4GCDIWtqUWRew_llrsfDSH'; //Esto después no cambiamos, para que la gente no pueda ver esto

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("USUARIOS.JS CARGADO");

const express = require('express');
const router = express.Router();

function hashPassword(password) {
    return crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');
}

router.post('/registro', async (req, res) => {
    const { email, password, username, foto } = req.body;

    const { error } = await supabaseClient.rpc('registrar_usuario', {
        p_username: username,
        p_clave: password,
        p_correo: email,
        p_foto: foto
    });

    if (error) {
        return res.status(500).json({
            ok: false,
            message: error.message
        });
    }

    res.status(201).json({
        ok: true,
        message: 'Registro exitoso'
    });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = hashPassword(password);

    const { data, error } = await supabaseClient
        .from('usuario')
        .select('id_usuario, username, correo, foto')
        .eq('correo', email)
        .eq('clave', hashedPassword)
        .maybeSingle();

    if (error) {
        return res.status(500).json({
            ok: false,
            message: error.message
        });
    }

    if (!data) {
        return res.status(401).json({
            ok: false,
            message: 'Correo o contrasena incorrectos.'
        });
    }

    res.status(200).json({
        ok: true,
        user: {
            id: data.id_usuario,
            name: data.username,
            email: data.correo,
            img: data.foto || 'Assets/ImagenesPerfil/usuarioimg0.png'
        }
    });
});

router.get('/test', (req, res) => {
    console.log("🔥 TEST USERS HIT");
    res.json({
        ok: true,
        message: "Usuarios route funcionando"
    });
});

module.exports = router;
