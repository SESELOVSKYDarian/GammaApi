require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pool = require('./db/db');

const contactoRoute = require("./routes/contactoRoute");
const authRoutes = require('./routes/authRoutes');

// 📁 Crear carpeta de uploads si no existe
const uploadsDir = path.join(__dirname, './uploads/imagenes');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

// En Hostinger production, process.env.FRONTEND_URLS estara definido en el panel
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5175',
  'https://gammamodas.com.ar',
  'https://www.gammamodas.com.ar'
];
const envOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(/[,\s]+/).map((url) => url.trim()).filter(Boolean)
  : [];
const allowedOrigins = new Set([...defaultOrigins, ...envOrigins]);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, false);
    if (allowedOrigins.has(origin)) return callback(null, origin);
    return callback(null, false);
  },
  credentials: true,
};

// 1. CORS va primero y con Vary: Origin para evitar caches mezclados
app.use((req, res, next) => {
  const vary = res.getHeader('Vary');
  if (!vary) {
    res.setHeader('Vary', 'Origin');
  } else if (!String(vary).includes('Origin')) {
    res.setHeader('Vary', `${vary}, Origin`);
  }
  next();
});
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
    const uploadsExists = fs.existsSync(uploadsPath);
    res.json({
      status: 'ok',
      db: 'connected',
      uploads: uploadsExists ? 'ok' : 'missing',
      uploadsPath: uploadsPath
    });
  } catch (err) {
    console.error('❌ Healthcheck DB error:', err);
    res.status(500).json({ status: 'error', db: 'unreachable', detail: err.message });
  }
});

// Servir imágenes subidas (en GammaApi/uploads/imagenes)
const uploadsPath = path.resolve(__dirname, './uploads');
console.log(`📁 Sirviendo uploads desde: ${uploadsPath}`);
app.use('/uploads', express.static(uploadsPath));

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

// 🔧 DEBUG: Log variables de entorno (sin exponer credenciales)
console.log(`📍 DB_HOST: ${process.env.DB_HOST}`);
console.log(`📍 DB_PORT: ${process.env.DB_PORT}`);
console.log(`📍 DB_NAME: ${process.env.DB_NAME}`);
console.log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
const adminUser = process.env.ADMIN_USER;
const adminPass = process.env.ADMIN_PASS;
console.warn(`[AUTH_LOG] Detectado ADMIN_USER: "${adminUser || '[VACIO]'}"`);
console.warn(`[AUTH_LOG] Detectado ADMIN_PASS: "${adminPass || '[VACIO]'}"`);
console.warn(`[AUTH_LOG] ADMIN_USER length: ${adminUser ? adminUser.length : 0}`);
console.warn(`[AUTH_LOG] ADMIN_PASS length: ${adminPass ? adminPass.length : 0}`);

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
