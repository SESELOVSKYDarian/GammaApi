require('dotenv').config(); // Debe ser la PRIMERA línea
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const pool = require('./db/db');
const contactoRoute = require("./routes/contactoRoute");
const path = require('path');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(',').map((url) => url.trim())
  : ['http://localhost:5173', 'http://localhost:5175'];

// ✅ 1. CORS va primero
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// ✅ 2. JSON también antes de las rutas
app.use(express.json());

// ✅ 3. Tus rutas
app.use('/api', authRoutes);
app.use("/api/contacto", contactoRoute);
app.use('/api/familias', require('./routes/familiasRoutes'));
app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/productos', require('./routes/productosRoutes'));
app.use('/api/precios', require('./routes/preciosRoutes'));
app.use('/api/login', require('./routes/authRoutes'));
app.use('/api/ideas', require('./routes/ideasRoutes'));

// 🔀 Alias sin prefijo /api para compatibilidad con el frontend antiguo
app.use('/usuarios', require('./routes/usuariosRoutes'));

// 🩺 Ruta de salud para validar que el servicio y la DB responden
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    console.error('❌ Healthcheck DB error:', err);
    res.status(500).json({ status: 'error', db: 'unreachable', detail: err.message });
  }
});

// Servir imágenes subidas (en GammaApi/uploads/imagenes)
app.use('/uploads', express.static(path.join(__dirname, './uploads')));

// Servir archivos estáticos del frontend (compatibilidad con rutas antiguas si existen)
app.use('/imgCata', express.static(path.join(__dirname, '../GammaVase/public/imgCata')));
app.use('/ideas', express.static(path.join(__dirname, '../GammaVase/public/ideas')));
app.use('/familias', express.static(path.join(__dirname, '../GammaVase/public/assets/familias')));

// Serve frontend build when available
const frontendBuildPath = path.join(__dirname, '../GammaVase/dist');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  // Respuesta simple para evitar "Cannot GET /" cuando no hay build estático
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', message: 'Gamma API en ejecución' });
  });
}

// ❗ OPCIONAL: si ya usás `/api/login` desde authRoutes.js, esta ruta extra de admin podrías dejarla o renombrarla:


// ✅ Las rutas de productos están manejadas por productosRoutes
// No duplicar aquí para evitar conflictos

app.get('/api/productos/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query('SELECT * FROM productos WHERE url = ?', [slug]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error buscando por slug:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// 🔧 DEBUG: Log variables de entorno (sin exponer credenciales)
console.log(`📍 DB_HOST: ${process.env.DB_HOST}`);
console.log(`📍 DB_PORT: ${process.env.DB_PORT}`);
console.log(`📍 DB_NAME: ${process.env.DB_NAME}`);
console.log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// ❌ Middleware global para errores (DEBE ir antes de app.listen())
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err);
  res.status(500).json({ 
    success: false, 
    error: err.message || 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
