const pool = require("../db/db");

// GET /api/usuarios
exports.getUsuarios = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, cliente, rol, lista_de_precio, creado_en FROM usuarios"
    );
    return res.json(rows);
  } catch (err) {
    console.error("❌ getUsuarios:", err);
    return res.status(500).json({
      error: "Error al obtener usuarios",
      message: err.message,
      code: err.code,
    });
  }
};
