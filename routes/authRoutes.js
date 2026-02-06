const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const nodemailer = require('nodemailer');

let adminCode = null;
let adminCodeExp = null;

// Removed top-level transporter to prevent startup crash
// Initialization moved to the route

router.post('/login', async (req, res) => {
  const { id, contrasena } = req.body;
  try {
    const result = await pool.query(
      `SELECT u.*, p.porcentaje_a_agregar
       FROM usuarios u
       LEFT JOIN precios p ON u.lista_de_precio = p.lista_de_precio_id
       WHERE u.id = ?`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ mensaje: 'Usuario no encontrado' });
    }
    const usuario = result.rows[0];
    if (contrasena !== usuario.contrasena) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }
    res.json({ usuario });
  } catch (error) {
    console.error('Error al loguear:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor', detail: err.message });
  }
});

router.post('/admin/login', async (req, res) => {
  const { admin, contrasena } = req.body;

  if (!admin || !contrasena) {
    console.warn('[AUTH_DEBUG] Missing admin or contrasena in body');
    return res.status(401).json({ mensaje: 'Credenciales incompletas' });
  }

  const validUser = process.env.ADMIN_USER;
  const validPass = process.env.ADMIN_PASS;

  // Safe Debug Logging
  console.log('[AUTH_DEBUG] Login attempt received.');
  console.log(`[AUTH_DEBUG] Input User length: ${admin.length}`);
  console.log(`[AUTH_DEBUG] Env User length: ${validUser ? validUser.length : 'undefined'}`);
  console.log(`[AUTH_DEBUG] Input Pass length: ${contrasena.length}`);
  console.log(`[AUTH_DEBUG] Env Pass length: ${validPass ? validPass.length : 'undefined'}`);

  if (admin !== validUser || contrasena !== validPass) {
    // Return debug info to the frontend so the user can see it in Network tab
    return res.status(401).json({
      mensaje: 'Credenciales inválidas',
      debug: {
        inputUserLen: admin ? admin.length : 0,
        envUserLen: validUser ? validUser.length : 'undefined',
        inputPassLen: contrasena ? contrasena.length : 0,
        envPassLen: validPass ? validPass.length : 'undefined',
        userMatch: admin === validUser,
        passMatch: contrasena === validPass
      }
    });
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  adminCode = code;
  adminCodeExp = Date.now() + 5 * 60 * 1000;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: 'Código de verificación',
      text: `Tu código de verificación es: ${code}`,
    });
    res.json({ mensaje: 'Código enviado' });
  } catch (err) {
    res.status(500).json({ mensaje: err.message, detail: err.message });
  }
});

router.post('/admin/verify', (req, res) => {
  const { code } = req.body;
  if (code === adminCode && adminCodeExp && Date.now() < adminCodeExp) {
    adminCode = null;
    adminCodeExp = null;
    return res.json({ success: true });
  }
  res.status(401).json({ mensaje: 'Código incorrecto' });
});

module.exports = router;