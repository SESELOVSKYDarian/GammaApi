const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const upload = require("../middlewares/upload"); // importa multer

// Helper: convertir rutas relativas a URLs absolutas usando el host del request
const getAbsoluteUrl = (relativePath, req) => {
  if (!relativePath) return relativePath;
  
  // Si ya es URL absoluta, retornar como está
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // Construir URL absoluta
  const protocol = req.protocol || 'https';
  const host = req.get('host') || process.env.API_HOST || 'api.gammamodas.com.ar';
  return `${protocol}://${host}${relativePath}`;
};

// Helper: normalizar producto para asegurar que img_articulo sea un array
const normalizeProduct = (product, req) => {
  if (!product) return product;
  
  // Si img_articulo es string (JSON de MySQL), parsearlo a array
  if (typeof product.img_articulo === 'string') {
    try {
      product.img_articulo = JSON.parse(product.img_articulo);
    } catch (e) {
      // Si no es JSON válido, convertir a array de un elemento
      product.img_articulo = [product.img_articulo];
    }
  }
  
  // Si no es array, convertirlo a array
  if (!Array.isArray(product.img_articulo)) {
    product.img_articulo = product.img_articulo ? [product.img_articulo] : [];
  }
  
  // Convertir rutas relativas a URLs absolutas
  if (req && product.img_articulo && Array.isArray(product.img_articulo)) {
    product.img_articulo = product.img_articulo.map(img => getAbsoluteUrl(img, req));
  }
  
  return product;
};

// Helper: normalizar array de productos
const normalizeProducts = (products, req) => {
  // Validar que products es un array
  if (!Array.isArray(products)) {
    console.warn('⚠️ normalizeProducts recibió algo que no es array:', typeof products);
    return [];
  }
  return products.map(p => normalizeProduct(p, req));
};

// Agregar producto con imagen
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
    slider
  } = req.body;

  try {
    const img_articulo = req.files.map((file) => `/uploads/imagenes/${file.filename}`);
    const sliderValue = slider === "true" || slider === true;
    const result = await pool.query(
      `INSERT INTO productos
      (articulo, descripcion, familia_id, linea, img_articulo, codigo_color, stock, url, precio, precio_minorista, precio_mayorista, slider)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        articulo,
        descripcion,
        familia_id,
        linea,
        img_articulo,
        codigo_color,
        stock,
        url,
        precio,
        precio_minorista,
        precio_mayorista,
        sliderValue
      ]
    );

    const created = await pool.query(
      `SELECT productos.*, familias.gran_familia, familias.tipo_familia
       FROM productos
       LEFT JOIN familias ON productos.familia_id = familias.id
       WHERE productos.id = ?`,
      [result.insertId]
    );

    res.json(normalizeProduct(created.rows[0] || {}, req));
  } catch (err) {
    console.error("❌ Error al guardar producto:", err);
    res.status(500).json({ error: err.message, detail: err.message });
  }
});

// Obtener todos los productos con su familia
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
    const clean = codigo_color.replace('#', '').toLowerCase();
    conditions.push(`LOWER(REPLACE(productos.codigo_color, '#', '')) LIKE ?`);
    values.push(`%${clean}%`);
  }
  if (q) {
    const palabras = q.trim().split(/\s+/);
    palabras.forEach((palabra) => {
      const palabraLower = palabra.toLowerCase();
      conditions.push(
        `(LOWER(productos.articulo) LIKE ? OR LOWER(productos.descripcion) LIKE ? OR LOWER(familias.gran_familia) LIKE ? OR LOWER(familias.tipo_familia) LIKE ?)`
      );
      values.push(`%${palabraLower}%`, `%${palabraLower}%`, `%${palabraLower}%`, `%${palabraLower}%`);
    });
  }
  if (conditions.length) {
    query += ` WHERE ` + conditions.join(" AND ");
  }
  if (limit) {
    query += ` LIMIT ?`;
    values.push(parseInt(limit, 10));
  }
  try {
    const result = await pool.query(query, values);
    res.json(normalizeProducts(result.rows, req));
  } catch (err) {
    console.error("❌ Error al obtener productos:", err);
    res.status(500).json({ error: "Error al obtener productos", detail: err.message });
  }
});

// Listado de códigos de color distintos para filtros/sugerencias
router.get("/color-codes", async (req, res) => {
  const { gran_familia, tipo_familia, q } = req.query;
  let query = `SELECT DISTINCT codigo_color FROM productos JOIN familias ON productos.familia_id = familias.id`;
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
    const clean = q.replace('#', '').toLowerCase();
    conditions.push(`LOWER(REPLACE(productos.codigo_color, '#', '')) LIKE ?`);
    values.push(`%${clean}%`);
  }
  if (conditions.length) {
    query += ` WHERE ` + conditions.join(" AND ");
  }
  try {
    const result = await pool.query(query, values);
    res.json(result.rows.map((r) => r.codigo_color));
  } catch (err) {
    console.error("❌ Error al obtener códigos de color:", err);
    res.status(500).json({ error: "Error al obtener códigos de color" });
  }
});

// Actualizar un producto
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
    const img_articulo = req.files && req.files.length
      ? req.files.map((file) => `/uploads/imagenes/${file.filename}`)
      : null;
    const sliderValue = slider === "true" || slider === true;
    const baseFields = [
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
    ];
    let query = `UPDATE productos SET articulo=?, descripcion=?, familia_id=?, linea=?, codigo_color=?, stock=?, url=?, precio=?, precio_minorista=?, precio_mayorista=?, slider=?`;
    if (img_articulo) {
      query += `, img_articulo=? WHERE id=?`;
      baseFields.push(img_articulo, id);
    } else {
      query += ` WHERE id=?`;
      baseFields.push(id);
    }
    await pool.query(query, baseFields);
    const updated = await pool.query(
      `SELECT productos.*, familias.gran_familia, familias.tipo_familia
       FROM productos
       LEFT JOIN familias ON productos.familia_id = familias.id
       WHERE productos.id = ?`,
      [id]
    );
    res.json(normalizeProduct(updated.rows[0], req));
  } catch (err) {
    console.error("❌ Error al actualizar producto:", err);
    res.status(500).json({ error: err.message, detail: err.message });
  }
});

// Eliminar un producto
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM productos WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error al eliminar producto:", err);
    res.status(500).json({ error: "Error al eliminar producto", detail: err.message });
  }
});

// Obtener producto por slug (URL), incluyendo nombre de familia y tipo
router.get('/slug/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await pool.query(
      `SELECT productos.*, familias.gran_familia, familias.tipo_familia
       FROM productos
       JOIN familias ON productos.familia_id = familias.id
       WHERE productos.url = ?`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(normalizeProduct(result.rows[0], req));
  } catch (err) {
    console.error("❌ Error al obtener producto por slug:", err);
    res.status(500).json({ error: "Error interno del servidor", detail: err.message });
  }
});

// Obtener productos por familia_id (de la misma familia)
router.get("/familia/:familia_id", async (req, res) => {
  const { familia_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT productos.*, familias.gran_familia, familias.tipo_familia
       FROM productos
       JOIN familias ON productos.familia_id = familias.id
       WHERE productos.familia_id = ?`,
      [familia_id]
    );

    res.json(normalizeProducts(result.rows, req));
  } catch (err) {
    console.error("❌ Error al obtener productos por familia:", err);
    res.status(500).json({ error: "Error al obtener productos relacionados", detail: err.message });
  }
});

// Productos marcados para el slider principal
router.get("/slider", async (req, res) => {
  try {
      const result = await pool.query(
        `SELECT productos.*, familias.gran_familia, familias.tipo_familia
         FROM productos
         JOIN familias ON productos.familia_id = familias.id
         WHERE productos.slider = TRUE`
      );
    res.json(normalizeProducts(result.rows, req));
  } catch (err) {
    console.error("❌ Error al obtener productos del slider:", err);
    res.status(500).json({ error: "Error al obtener productos del slider", detail: err.message });
  }
});

// Actualizar bandera slider de un producto
router.patch("/:id/slider", async (req, res) => {
  const { id } = req.params;
  const { slider } = req.body;
  try {
    const sliderValue = slider === "true" || slider === true;
    await pool.query(
      "UPDATE productos SET slider = ? WHERE id = ?",
      [sliderValue, id]
    );
    const result = await pool.query(
      `SELECT productos.*, familias.gran_familia, familias.tipo_familia
       FROM productos
       LEFT JOIN familias ON productos.familia_id = familias.id
       WHERE productos.id = ?`,
      [id]
    );
    res.json(normalizeProduct(result.rows[0], req));
  } catch (err) {
    console.error("❌ Error al actualizar slider:", err);
    res.status(500).json({ error: "Error al actualizar slider", detail: err.message });
  }
});


module.exports = router;
