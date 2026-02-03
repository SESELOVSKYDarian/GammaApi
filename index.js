require('dotenv').config(); // Debe ser la PRIMERA línea

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pool = require('./db/db');
const contactoRoute = require("./routes/contactoRoute");
const authRoutes = require('./routes/authRoutes');

// 📁 Carpeta de uploads (se define primero para usarse abajo)
const uploadsPath = path.resolve(__dirname, './uploads');
const uploadsDir = path.join(uploadsPath, 'imagenes');

if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Carpeta de uploads creada correctamente');
  } catch (err) {
    console.warn('⚠️ No se pudo crear la carpeta de uploads:', err.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ 1. CORS - Usamos origin: true para depuración profunda (refleja el origen de la petición)
app.use(cors({
  origin: true,
  credentials: true,
}));

// Log de variables de entorno críticas para depuración (seguro)
console.log(`🔑 ADMIN_USER configurado: ${process.env.ADMIN_USER ? process.env.ADMIN_USER[0] + '*** (largo: ' + process.env.ADMIN_USER.length + ')' : 'NO DEFINIDO'}`);
console.log(`🔑 ADMIN_PASS configurado: ${process.env.ADMIN_PASS ? '*** (largo: ' + process.env.ADMIN_PASS.length + ')' : 'NO DEFINIDO'}`);

// ✅ 2. JSON Parser
app.use(express.json());

// Logging simple para Hostinger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ✅ 3. Rutas de la API
app.use('/api', authRoutes);
app.use("/api/contacto", contactoRoute);
app.use('/api/familias', require('./routes/familiasRoutes'));
app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/productos', require('./routes/productosRoutes'));
app.use('/api/precios', require('./routes/preciosRoutes'));
app.use('/api/login', require('./routes/authRoutes'));
app.use('/api/ideas', require('./routes/ideasRoutes'));

// 🔀 Alias sin prefijo /api para compatibilidad
app.use('/usuarios', require('./routes/usuariosRoutes'));

// 🩺 Healthcheck mejorado para diagnóstico de DB
app.get('/api/health', async (_req, res) => {
  try {
    console.log('🔍 Healthcheck: Verificando DB...');
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      db: 'connected',
      node_env: process.env.NODE_ENV,
      port: PORT,
      uploads: fs.existsSync(uploadsPath) ? 'ok' : 'missing'
    });
  } catch (err) {
    console.error('❌ Healthcheck DB error:', err);
    res.status(500).json({
      status: 'error',
      db: 'unreachable',
      detail: err.message,
      code: err.code
    });
  }
});

// Servir imágenes subidas
app.use('/uploads', express.static(uploadsPath));

// Servir archivos estáticos del frontend si existen
const publicPaths = {
  '/imgCata': path.join(__dirname, '../GammaVase/public/imgCata'),
  '/ideas': path.join(__dirname, '../GammaVase/public/ideas'),
  '/familias': path.join(__dirname, '../GammaVase/public/assets/familias')
};

Object.entries(publicPaths).forEach(([route, localPath]) => {
  if (fs.existsSync(localPath)) {
    app.use(route, express.static(localPath));
  }
});

// Serve frontend build when available
const frontendBuildPath = path.join(__dirname, '../GammaVase/dist');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', message: 'Gamma API en ejecución' });
  });
}

// 🔧 Logging de variables (sin passwords)
console.log(`📍 DB_HOST: ${process.env.DB_HOST}`);
console.log(`📍 DB_PORT: ${process.env.DB_PORT}`);
console.log(`📍 DB_NAME: ${process.env.DB_NAME}`);

// ❌ Middleware global para errores (Retorna JSON)
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
});
