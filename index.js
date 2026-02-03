require('dotenv').config(); // Debe ser la PRIMERA línea

// 🚨 Manejo global de errores para DEBUG en Hostinger
process.on('uncaughtException', (err) => {
  console.error('🔥 EXCEPCIÓN NO CAPTURADA:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 PROMESA NO CAPTURADA EN:', promise, 'razón:', reason);
});

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pool = require('./db/db');
const contactoRoute = require("./routes/contactoRoute");
const authRoutes = require('./routes/authRoutes');

// 📁 Crear carpeta de uploads si no existe (con protección en caso de error de permisos)
const uploadsDir = path.join(__dirname, './uploads/imagenes');
const uploadsPath = path.resolve(__dirname, './uploads');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('⚠️ No se pudo crear la carpeta de uploads:', err.message);
}

console.log('--- INICIANDO GAMMA API ---');
console.log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

const app = express();

// 🚀 RUTA DE PRUEBA (Para descartar problemas de middleware o rutas)
app.get('/api/ping', (req, res) => res.send('pong'));
const PORT = process.env.PORT || 3000;
// ✅ 1. CORS y Logging
// Logger simple para ver peticiones en los logs de Hostinger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5175',
  'https://gammamodas.com.ar',
  'https://www.gammamodas.com.ar'
];

app.use(cors({
  origin: true, // Refleja el origen de la petición
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
}));

// Habilitar pre-flight para todas las rutas
app.options('*', cors());

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
    res.status(500).json({
      status: 'error',
      db: 'unreachable',
      detail: err.message,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState
    });
  }
});

// Servir imágenes subidas (en GammaApi/uploads/imagenes)
console.log(`📁 Sirviendo uploads desde: ${uploadsPath}`);
app.use('/uploads', express.static(uploadsPath));

// Servir archivos estáticos del frontend (compatibilidad con rutas antiguas si existen)
const imgCataPath = path.join(__dirname, '../GammaVase/public/imgCata');
const ideasPath = path.join(__dirname, '../GammaVase/public/ideas');
const familiasPath = path.join(__dirname, '../GammaVase/public/assets/familias');

if (fs.existsSync(imgCataPath)) {
  app.use('/imgCata', express.static(imgCataPath));
}
if (fs.existsSync(ideasPath)) {
  app.use('/ideas', express.static(ideasPath));
}
if (fs.existsSync(familiasPath)) {
  app.use('/familias', express.static(familiasPath));
}

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

// ❌ Middleware global para errores (DEBE ir antes de app.listen())
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ✅ Función para iniciar el servidor después de verificar la DB
const startServer = async () => {
  try {
    console.log('🔍 Verificando conexión a la base de datos...');
    await pool.query('SELECT 1');
    console.log('✅ Conexión a la base de datos exitosa.');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Error crítico al iniciar el servidor (DB unreachable):', err.message);
    // En producción, a veces es mejor dejar que el proceso siga vivo para que el healthcheck devuelva el error real
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`⚠️ Servidor iniciado en modo degradado (DB Error): http://localhost:${PORT}`);
    });
  }
};

startServer();
