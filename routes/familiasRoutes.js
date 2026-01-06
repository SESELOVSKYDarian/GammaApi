const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Guardar imágenes dentro del repo (ajustá si tu estructura difiere)
const uploadDir = path.join(__dirname, "../public/assets/familias");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Obtener todas las familias
router.get("/", async (_, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM familias");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear una o varias familias dentro de una gran familia
router.post("/", upload.single("imagen"), async (req, res) => {
  const { gran_familia, tipo_familia, tipos_familia, usar_imagen } = req.body;

  // La URL pública que vas a servir (si exponés /familias como static)
  const imgPath = req.file ? `/familias/${req.file.filename}` : null;

  const tipos = tipos_familia
    ? Array.isArray(tipos_familia)
      ? tipos_familia
      : [tipos_familia]
    : tipo_familia
    ? [tipo_familia]
    : [];

  if (!gran_familia || tipos.length === 0) {
    return res
      .status(400)
      .json({ error: "Gran familia y al menos un tipo son requeridos" });
  }

  try {
    const inserted = [];

    for (const tipo of tipos) {
      const [result] = await pool.query(
        "INSERT INTO familias (gran_familia, tipo_familia, usar_imagen, imagen_subtitulo) VALUES (?, ?, ?, ?)",
        [gran_familia, tipo, usar_imagen === "true" ? 1 : 0, imgPath]
      );

      const [rows] = await pool.query("SELECT * FROM familias WHERE id = ?", [
        result.insertId,
      ]);
      inserted.push(rows[0]);
    }

    res.json(inserted.length === 1 ? inserted[0] : inserted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar una familia
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM familias WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar una familia existente
router.put("/:id", upload.single("imagen"), async (req, res) => {
  const { id } = req.params;
  const { gran_familia, tipo_familia, usar_imagen } = req.body;

  const imgPath = req.file ? `/familias/${req.file.filename}` : null;

  try {
    if (imgPath) {
      await pool.query(
        "UPDATE familias SET gran_familia=?, tipo_familia=?, usar_imagen=?, imagen_subtitulo=? WHERE id=?",
        [gran_familia, tipo_familia, usar_imagen === "true" ? 1 : 0, imgPath, id]
      );
    } else {
      await pool.query(
        "UPDATE familias SET gran_familia=?, tipo_familia=?, usar_imagen=? WHERE id=?",
        [gran_familia, tipo_familia, usar_imagen === "true" ? 1 : 0, id]
      );
    }

    const [rows] = await pool.query("SELECT * FROM familias WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
