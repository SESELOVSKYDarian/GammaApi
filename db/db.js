// 🛢️ Lectura de variables (ya cargadas en index.js)
const host = process.env.DB_HOST || '127.0.0.1';
const user = process.env.DB_USER?.trim();
const password = process.env.DB_PASSWORD?.trim();
const database = process.env.DB_NAME?.trim();

if (!user || !database) {
  console.error('❌ ERROR DB: Credenciales faltantes en el entorno (user/db).');
} else {
  console.log(`📡 DB Config: user=${user}, host=${host}, db=${database}`);
}

const pool = mysql.createPool({
  host,
  user: user || '',
  password: password || '',
  database: database || '',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

console.log(`🛢️ MySQL Pool creado para: host=${host}, user=${user || 'VACÍO'}`);

const normalizeResult = (rows) => {
  if (Array.isArray(rows)) {
    return { rows, rowCount: rows.length };
  }
  return {
    rows: [],
    insertId: rows?.insertId,
    affectedRows: rows?.affectedRows,
    rowCount: typeof rows?.affectedRows === 'number' ? rows.affectedRows : 0,
  };
};

const query = async (sql, params) => {
  const [rows] = await pool.query(sql, params);
  return normalizeResult(rows);
};

const getConnection = async () => {
  const connection = await pool.getConnection();
  return {
    query: async (sql, params) => {
      const [rows] = await connection.query(sql, params);
      return normalizeResult(rows);
    },
    beginTransaction: () => connection.beginTransaction(),
    commit: () => connection.commit(),
    rollback: () => connection.rollback(),
    release: () => connection.release(),
  };
};

module.exports = { query, getConnection };