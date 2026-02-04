require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pool = require('./db/db');

// Paths for assets
const uploadsPath = path.resolve(__dirname, './uploads');
const familiesPath = path.join(__dirname, '../GammaVase/public/assets/familias');
const ideasPath = path.join(__dirname, '../GammaVase/public/ideas');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(',').map(url => url.trim())
  : ['http://localhost:5173'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Main Routes
app.use('/api', require('./routes/authRoutes'));
app.use('/api/contacto', require('./routes/contactoRoute'));
app.use('/api/familias', require('./routes/familiasRoutes'));
app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/productos', require('./routes/productosRoutes'));
app.use('/api/precios', require('./routes/preciosRoutes'));
app.use('/api/ideas', require('./routes/ideasRoutes'));

// Compatibility / Health
app.use('/usuarios', require('./routes/usuariosRoutes'));
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', user: process.env.DB_USER });
  } catch (err) {
    res.status(500).json({ status: 'error', detail: err.message, env_user: process.env.DB_USER });
  }
});

// Static Files
app.use('/uploads', express.static(uploadsPath));
app.use('/familias', express.static(familiesPath));
app.use('/assets/familias', express.static(familiesPath));
app.use('/ideas', express.static(ideasPath));

// Frontend Build fallback
const distPath = path.join(__dirname, '../GammaVase/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});