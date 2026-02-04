require('dotenv').config(); // Debe ser la PRIMERA línea
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// 📁 Definir rutas de uploads al inicio para evitar ReferenceError
const uploadsPath = path.resolve(__dirname, './uploads');
const uploadsDir = path.join(uploadsPath, 'imagenes');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const pool = require('./db/db');
const contactoRoute = require("./routes/contactoRoute");
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
    const uploadsExists = fs.existsSync(uploadsDir);
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
      detail: err.message
    });
  }
});

// Servir imágenes subidas
console.log(`📁 Sirviendo uploads desde: ${uploadsPath}`);
app.use('/uploads', express.static(uploadsPath));

// Servir archivos estáticos del frontend
app.use('/imgCata', express.static(path.join(__dirname, '../GammaVase/public/imgCata')));
app.use('/ideas', express.static(path.join(__dirname, '../GammaVase/public/ideas')));
app.use('/familias', express.static(path.join(__dirname, '../GammaVase/public/assets/familias')));
app.use('/assets/familias', express.static(path.join(__dirname, '../GammaVase/public/assets/familias')));

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

// ❌ Middleware global para errores
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