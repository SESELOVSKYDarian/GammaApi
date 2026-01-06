const pool = require("../db/db");

// Obtener todos los usuarios
exports.getUsuarios = async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM usuarios");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Crear usuario
exports.createUsuario = async (req, res) => {
  const { id, cliente, contrasena, rol, lista_de_precio } = req.body;
  console.log("Datos recibidos:", { id, cliente, contrasena, rol, lista_de_precio });

  try {
    await pool.query(
      "INSERT INTO usuarios (id, cliente, contrasena, rol, lista_de_precio) VALUES (?, ?, ?, ?, ?)",
      [id, cliente, contrasena, rol, lista_de_precio]
    );

    const [rows] = await pool.query("SELECT * FROM usuarios WHERE id = ?", [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error en createUsuario:", err);
    res.status(500).json({ error: err.message });
  }
};

// Actualizar usuario
exports.updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { cliente, contrasena, rol, lista_de_precio } = req.body;

  try {
    const [r] = await pool.query(
      "UPDATE usuarios SET cliente=?, contrasena=?, rol=?, lista_de_precio=? WHERE id=?",
      [cliente, contrasena, rol, lista_de_precio, id]
    );

    if (r.affectedRows === 0) return res.status(404).json({ error: "Usuario no encontrado" });

    const [rows] = await pool.query("SELECT * FROM usuarios WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Eliminar usuario
exports.deleteUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    const [r] = await pool.query("DELETE FROM usuarios WHERE id=?", [id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ message: "Usuario eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
