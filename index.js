const dotenv = require('dotenv');
const path = require('path');
const envResult = dotenv.config({ path: path.join(__dirname, '.env') });

if (envResult.error) {
  console.warn('⚠️ Advertencia: No se pudo cargar el archivo .env desde', path.join(__dirname, '.env'), ':', envResult.error.message);
} else {
  console.log('✅ Archivo .env cargado correctamente desde:', path.join(__dirname, '.env'));
}
const express = require('express');
const cors = require('cors');
const fs = require('fs');
// const path = require('path'); // Ya definido arriba
const pool = require('./db/db');
const contactoRoute = require("./routes/contactoRoute");
const authRoutes = require('./routes/authRoutes');

// 📁 Configuración de RUTAS y CARPETAS (Definir todo antes de usarlo)
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const uploadsPath = path.resolve(__dirname, './uploads');
const uploadsDir = path.join(uploadsPath, 'imagenes');

// Crear carpeta de uploads de forma segura
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`✅ Carpeta de uploads verificada: ${uploadsDir}`);
  }
} catch (fsErr) {
  console.error('⚠️ Advertencia: No se pudo crear la carpeta de uploads:', fsErr.message);
}
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
app.get('/ping', (_req, res) => res.send('pong')); // Ruta simple para verificar que el proceso corre

app.use('/api', authRoutes);
app.use("/api/contacto", contactoRoute);
app.use('/api/familias', require('./routes/familiasRoutes'));
app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/productos', require('./routes/productosRoutes'));
app.use('/api/precios', require('./routes/preciosRoutes'));
app.use('/api/ideas', require('./routes/ideasRoutes'));

// 🔀 Alias sin prefijo /api para compatibilidad con el frontend antiguo
app.use('/usuarios', require('./routes/usuariosRoutes'));

// 🩺 Ruta de salud para validar que el servicio y la DB responden
app.get('/api/health', async (_req, res) => {
  const diagnostic = {
    status: 'checking',
    env: {
      dotEnvLoaded: typeof envResult !== 'undefined' && !envResult.error,
      missingKeys: ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter(k => !process.env[k])
    },
    timestamp: new Date().toISOString()
  };

  try {
    if (diagnostic.env.missingKeys.length === 0) {
      await pool.query('SELECT 1');
      diagnostic.db = 'connected';
      diagnostic.status = 'ok';
    } else {
      diagnostic.db = 'skipped (missing config)';
      diagnostic.status = 'configuration_error';
    }
    diagnostic.uploads = fs.existsSync(uploadsDir) ? 'ok' : 'missing';
    res.json(diagnostic);
  } catch (err) {
    console.error('❌ Healthcheck failure:', err);
    diagnostic.status = 'db_error';
    diagnostic.db = 'unreachable';
    diagnostic.error = err.message;
    res.status(500).json(diagnostic);
  }
});

// Servir imágenes subidas
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
console.log(`📍 DB_HOST: ${process.env.DB_HOST || 'No definido'}`);
console.log(`📍 DB_USER: ${process.env.DB_USER ? 'Definido' : 'No definido'}`);
console.log(`📍 DB_NAME: ${process.env.DB_NAME || 'No definido'}`);
console.log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`📍 PORT: ${process.env.PORT || '3000 (default)'}`);

// ❌ Middleware global para errores (DEBE ir antes de app.listen())
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor Gamma API escuchando en http://${HOST}:${PORT}`);
  console.log(`🩺 Health check disponible en: http://${HOST}:${PORT}/api/health`);
});