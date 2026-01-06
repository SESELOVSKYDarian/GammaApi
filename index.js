const express = require('express');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();
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
}

// ❗ OPCIONAL: si ya usás `/api/login` desde authRoutes.js, esta ruta extra de admin podrías dejarla o renombrarla:


// ✅ Tus rutas personalizadas para productos (no se tocan)
app.get("/api/productos", async (_, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM productos");
    res.json(rows);
  } catch (error) {
    console.error("❌ Get productos error:", error);
    res.status(500).json({ error: "Error al obtener productos", detail: error.message });
  }
});


app.post("/api/productos", async (req, res) => {
  try {
    const {
      articulo, familia_id, linea, img_articulo,
      stock, precio, precio_minorista, precio_mayorista,
      descripcion, url, slider, codigo_color
    } = req.body;

    await pool.query(
      `INSERT INTO productos
       (articulo, familia_id, linea, img_articulo, stock, precio, precio_minorista, precio_mayorista, descripcion, url, slider, codigo_color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [articulo, familia_id, linea, img_articulo, stock, precio, precio_minorista, precio_mayorista, descripcion, url, slider, codigo_color]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Post productos error:", err);
    res.status(500).json({ success: false, detail: err.message });
  }
});


app.put("/api/productos/:id", async (req, res) => {
  try {
    const { articulo, familia_id, linea, img_articulo, stock, precio, precio_minorista, precio_mayorista, descripcion, url, slider, codigo_color } = req.body;

    await pool.query(
      `UPDATE productos
       SET articulo=?, familia_id=?, linea=?, img_articulo=?, stock=?, precio=?, precio_minorista=?, precio_mayorista=?, descripcion=?, url=?, slider=?, codigo_color=?
       WHERE id=?`,
      [articulo, familia_id, linea, img_articulo, stock, precio, precio_minorista, precio_mayorista, descripcion, url, slider, codigo_color, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Put productos error:", err);
    res.status(500).json({ success: false, detail: err.message });
  }
});

app.delete("/api/productos/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM productos WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete productos error:", err);
    res.status(500).json({ success: false, detail: err.message });
  }
});


app.get("/api/productos/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [rows] = await pool.query("SELECT * FROM productos WHERE url = ?", [slug]);
    if (!rows.length) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error buscando por slug:", err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
