const pool = require('../db/db');

// Obtener todos los usuarios
exports.getUsuarios = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usuarios');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error obteniendo usuarios:', err);
    res.status(500).json({
      error: 'No se pudieron obtener los usuarios. Verifica la base de datos.',
      detail: err.message,
    });
  }
};

// Crear usuario
exports.createUsuario = async (req, res) => {
  const { id, cliente, contrasena, rol, lista_de_precio } = req.body;

  try {
    if (!id) {
      return res.status(400).json({ error: "id requerido" });
    }
    const result = await pool.query(
      `INSERT INTO usuarios (id, cliente, contrasena, rol, lista_de_precio)
       VALUES (?, ?, ?, ?, ?)`,
      [id, cliente, contrasena, rol || 'cliente', lista_de_precio]
    );
    const created = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
    const createdRow = created.rows[0] || { id, cliente, contrasena, rol: rol || 'cliente', lista_de_precio };
    res.status(201).json(createdRow);
  } catch (err) {
    console.error("Error en createUsuario:", err);
    res.status(500).json({ error: err.message, detail: err.message });
  }
};


// Actualizar usuario
exports.updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { cliente, contrasena, rol, lista_de_precio } = req.body;

  try {
    await pool.query(
      'UPDATE usuarios SET cliente=?, contrasena=?, rol=?, lista_de_precio=? WHERE id=?',
      [cliente, contrasena, rol, lista_de_precio, id]
    );
    const updated = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message, detail: err.message });
  }
};

// Eliminar usuario
exports.deleteUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM usuarios WHERE id=?', [id]);
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message, detail: err.message });
  }
};
