// db/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const getRequiredEnv = (key) => {
  const value = process.env[key]?.trim();
  if (!value) {
    console.warn(`⚠️ Missing environment variable: ${key}`);
  }
  return value;
};

const rawHost = getRequiredEnv('DB_HOST');
const user = getRequiredEnv('DB_USER');
const password = getRequiredEnv('DB_PASSWORD');
const database = getRequiredEnv('DB_NAME');

// En Hostinger shared hosting, a veces 127.0.0.1 no funciona y se requiere localhost
// O viceversa. Mantenemos la lógica de normalización pero permitimos el valor crudo.
const host =
  rawHost === 'localhost' || rawHost === '::1' ? '127.0.0.1' : rawHost || '127.0.0.1';

console.log(`🔌 Configurando pool de conexiones para DB: ${user}@${host}:${process.env.DB_PORT || 3306}/${database}`);

const pool = mysql.createPool({
  host,
  user,
  password,
  database,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

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
