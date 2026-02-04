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

const rawHost = process.env.DB_HOST;
const host =
  rawHost === 'localhost' || rawHost === '::1' ? '127.0.0.1' : rawHost;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_NAME;

// 🔍 DIAGNÓSTICO HOSTINGER: Ver qué lee el código realmente
console.warn(`[DB_LOG] Detectado User: "${user || '[VACÍO]'}"`);
console.warn(`[DB_LOG] Detectado Host: "${host}"`);
console.warn(`[DB_LOG] Detectado DB: "${database || '[VACÍO]'}"`);

const pool = mysql.createPool({
  host,
  user,
  password,
  database,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

// 🛡️ Prevenir caídas por errores inesperados en el pool
pool.on('error', (err) => {
  console.error('❌ Error de Pool MySQL:', err.message);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('📡 La conexión con la DB se perdió. El pool intentará reconectar.');
  }
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