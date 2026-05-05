const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jxrgpqroeechjbbofbfd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iYJmQZxGd4GCDIWtqUWRew_llrsfDSH'; //Esto después no cambiamos, para que la gente no pueda ver esto

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("USUARIOS.JS CARGADO");

const express = require('express');
const router = express.Router();

// router.post('/login', async (req, res) => {
//     console.log("HIT LOGIN");
//     const { email, password } = req.body
//     const { data, error } = await supabaseClient
//         .rpc('login_usuario', {
//             p_correo: email, 
//             p_clave: password
//         });
//     if(error){
//         return res.status(500).json({
//             ok: false,
//             message: error.message
//         });
//     }
//     if(!data || data.length === 0){
//         return res.status(401).json({
//             ok: false, 
//             message: 'Credenciales incorrectas'
//         });
//     }
//     const userData = data[0];

//     res.status(200).json({
//         ok: true,
//         user: {
//             id: userData.id
//         }
//     });
// });

router.post('/login', (req, res) => {
    console.log("🔥 LOGIN HIT");
    res.json({ ok: true });
});

router.get('/test', (req, res) => {
    console.log("🔥 TEST USERS HIT");
    res.json({
        ok: true,
        message: "Usuarios route funcionando"
    });
});

module.exports = router;