const express = require("express");
const router = express.Router();
const pool = require("../db/db");

// Obtener todas las listas de precios
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM precios ORDER BY lista_de_precio_id"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear nueva lista de precios
router.post("/", async (req, res) => {
  const { lista_de_precio_id, porcentaje_a_agregar } = req.body;
  try {
    await pool.query(
      "INSERT INTO precios (lista_de_precio_id, porcentaje_a_agregar) VALUES (?, ?)",
      [lista_de_precio_id, porcentaje_a_agregar]
    );

    const [rows] = await pool.query(
      "SELECT * FROM precios WHERE lista_de_precio_id = ?",
      [lista_de_precio_id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar porcentaje de una lista
router.put("/:listaId", async (req, res) => {
  const { listaId } = req.params;
  const { porcentaje_a_agregar } = req.body;
  try {
    await pool.query(
      "UPDATE precios SET porcentaje_a_agregar=? WHERE lista_de_precio_id=?",
      [porcentaje_a_agregar, listaId]
    );

    const [rows] = await pool.query(
      "SELECT * FROM precios WHERE lista_de_precio_id = ?",
      [listaId]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar una lista de precios
router.delete("/:listaId", async (req, res) => {
  const { listaId } = req.params;
  try {
    await pool.query("DELETE FROM precios WHERE lista_de_precio_id=?", [listaId]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
