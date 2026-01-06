const pool = require('../db/db').default;


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
  const { cliente, contrasena, rol, lista_de_precio } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO usuarios (cliente, contrasena, rol, lista_de_precio)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [cliente, contrasena, rol || 'cliente', lista_de_precio]
    );
    res.status(201).json(result.rows[0]);
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
    const result = await pool.query(
      'UPDATE usuarios SET cliente=$1, contrasena=$2, rol=$3, lista_de_precio=$4 WHERE id=$5 RETURNING *',
      [cliente, contrasena, rol, lista_de_precio, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Eliminar usuario
exports.deleteUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM usuarios WHERE id=$1', [id]);
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
