const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const upload = require("../middlewares/upload"); // tu multer

// Crear producto con imágenes
router.post("/", upload.array("imagenes", 5), async (req, res) => {
  const {
    articulo,
    descripcion,
    familia_id,
    linea,
    codigo_color,
    stock,
    url,
    precio,
    precio_minorista,
    precio_mayorista,
    slider,
  } = req.body;

  try {
    const imgPaths = (req.files || []).map((f) => `/imgCata/${f.filename}`);
    const sliderValue = slider === "true" || slider === true ? 1 : 0;

    const [result] = await pool.query(
      `INSERT INTO productos
      (articulo, descripcion, familia_id, linea, img_articulo, codigo_color, stock, url, precio, precio_minorista, precio_mayorista, slider)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        articulo,
        descripcion,
        familia_id,
        linea,
        JSON.stringify(imgPaths), // TEXT en MySQL
        codigo_color,
        stock,
        url,
        precio,
        precio_minorista,
        precio_mayorista,
        sliderValue,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM productos WHERE id = ?", [
      result.insertId,
    ]);
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error al guardar producto:", err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener productos + filtros
router.get("/", async (req, res) => {
  const { gran_familia, tipo_familia, codigo_color, q, limit } = req.query;

  let query = `SELECT productos.*, familias.gran_familia, familias.tipo_familia
               FROM productos
               JOIN familias ON productos.familia_id = familias.id`;
  const conditions = [];
  const values = [];

  if (gran_familia) {
    conditions.push(`familias.gran_familia = ?`);
    values.push(gran_familia);
  }

  if (tipo_familia) {
    conditions.push(`familias.tipo_familia = ?`);
    values.push(tipo_familia);
  }

  if (codigo_color) {
    const clean = String(codigo_color).replace("#", "");
    // comparación “case-insensitive”: usamos LOWER y quitamos '#'
    conditions.push(`LOWER(REPLACE(productos.codigo_color, '#', '')) LIKE ?`);
    values.push(`%${clean.toLowerCase()}%`);
  }

  if (q) {
    const palabras = String(q).trim().split(/\s+/);
    palabras.forEach((palabra) => {
      conditions.push(
        `(productos.articulo LIKE ? OR productos.descripcion LIKE ? OR familias.gran_familia LIKE ? OR familias.tipo_familia LIKE ?)`
      );
      const like = `%${palabra}%`;
      values.push(like, like, like, like);
    });
  }

  if (conditions.length) {
    query += " WHERE " + conditions.join(" AND ");
  }

  if (limit) {
    query += ` LIMIT ${parseInt(limit, 10)}`;
  }

  try {
    const [rows] = await pool.query(query, values);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error al obtener productos:", err);
    res.status(500).json({ error: "Error al obtener productos", detail: err.message });
  }
});

// Listado de códigos de color distintos
router.get("/color-codes", async (req, res) => {
  const { gran_familia, tipo_familia, q } = req.query;

  let query = `SELECT DISTINCT productos.codigo_color
               FROM productos
               JOIN familias ON productos.familia_id = familias.id`;
  const conditions = [];
  const values = [];

  if (gran_familia) {
    conditions.push(`familias.gran_familia = ?`);
    values.push(gran_familia);
  }
  if (tipo_familia) {
    conditions.push(`familias.tipo_familia = ?`);
    values.push(tipo_familia);
  }
  if (q) {
    const clean = String(q).replace("#", "").toLowerCase();
    conditions.push(`LOWER(REPLACE(productos.codigo_color, '#', '')) LIKE ?`);
    values.push(`%${clean}%`);
  }

  if (conditions.length) {
    query += " WHERE " + conditions.join(" AND ");
  }

  try {
    const [rows] = await pool.query(query, values);
    res.json(rows.map((r) => r.codigo_color));
  } catch (err) {
    console.error("❌ Error al obtener códigos de color:", err);
    res.status(500).json({ error: "Error al obtener códigos de color" });
  }
});

// Actualizar producto (con o sin imágenes)
router.put("/:id", upload.array("imagenes", 5), async (req, res) => {
  const { id } = req.params;

  const {
    articulo,
    descripcion,
    familia_id,
    linea,
    codigo_color,
    stock,
    url,
    precio,
    precio_minorista,
    precio_mayorista,
    slider,
  } = req.body;

  try {
    const sliderValue = slider === "true" || slider === true ? 1 : 0;

    let imgJson = null;
    if (req.files && req.files.length) {
      const imgs = req.files.map((f) => `/imgCata/${f.filename}`);
      imgJson = JSON.stringify(imgs);
    }

    if (imgJson) {
      await pool.query(
        `UPDATE productos
         SET articulo=?, descripcion=?, familia_id=?, linea=?, codigo_color=?, stock=?, url=?, precio=?, precio_minorista=?, precio_mayorista=?, slider=?, img_articulo=?
         WHERE id=?`,
        [
          articulo,
          descripcion,
          familia_id,
          linea,
          codigo_color,
          stock,
          url,
          precio,
          precio_minorista,
          precio_mayorista,
          sliderValue,
          imgJson,
          id,
        ]
      );
    } else {
      await pool.query(
        `UPDATE productos
         SET articulo=?, descripcion=?, familia_id=?, linea=?, codigo_color=?, stock=?, url=?, precio=?, precio_minorista=?, precio_mayorista=?, slider=?
         WHERE id=?`,
        [
          articulo,
          descripcion,
          familia_id,
          linea,
          codigo_color,
          stock,
          url,
          precio,
          precio_minorista,
          precio_mayorista,
          sliderValue,
          id,
        ]
      );
    }

    const [rows] = await pool.query("SELECT * FROM productos WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error al actualizar producto:", err);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar producto
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM productos WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error al eliminar producto:", err);
    res.status(500).json({ error: "Error al eliminar producto" });
  }
});

// Obtener producto por slug incluyendo familia/tipo
router.get("/slug/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT productos.*, familias.gran_familia, familias.tipo_familia
       FROM productos
       JOIN familias ON productos.familia_id = familias.id
       WHERE productos.url = ?`,
      [slug]
    );

    if (!rows.length) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error slug:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Productos por familia_id
router.get("/familia/:familia_id", async (req, res) => {
  const { familia_id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT productos.*, familias.gran_familia, familias.tipo_familia
       FROM productos
       JOIN familias ON productos.familia_id = familias.id
       WHERE productos.familia_id = ?`,
      [familia_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ Error familia:", err);
    res.status(500).json({ error: "Error al obtener productos relacionados" });
  }
});

// Productos del slider
router.get("/slider", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT productos.*, familias.gran_familia, familias.tipo_familia
       FROM productos
       JOIN familias ON productos.familia_id = familias.id
       WHERE productos.slider = 1`
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error slider:", err);
    res.status(500).json({ error: "Error al obtener productos del slider" });
  }
});

// Actualizar slider flag
router.patch("/:id/slider", async (req, res) => {
  const { id } = req.params;
  const sliderValue = req.body.slider === true || req.body.slider === "true" ? 1 : 0;

  try {
    await pool.query("UPDATE productos SET slider = ? WHERE id = ?", [sliderValue, id]);
    const [rows] = await pool.query("SELECT * FROM productos WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error actualizar slider:", err);
    res.status(500).json({ error: "Error al actualizar slider" });
  }
});

module.exports = router;
