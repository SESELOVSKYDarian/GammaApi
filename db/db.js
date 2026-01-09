// db/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

<<<<<<< HEAD
const rawHost = process.env.DB_HOST;
const host = rawHost === 'localhost' ? '127.0.0.1' : rawHost;

const pool = mysql.createPool({
  host,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
=======
const getRequiredEnv = (key) => {
  const value = process.env[key]?.trim();
  if (!value) {
    console.warn(`⚠️ Missing environment variable: ${key}`);
  }
  return value;
};

const rawHost = getRequiredEnv('DB_HOST');
const host =
  rawHost === 'localhost' || rawHost === '::1' ? '127.0.0.1' : rawHost;
const user = getRequiredEnv('DB_USER');
const password = getRequiredEnv('DB_PASSWORD');
const database = getRequiredEnv('DB_NAME');

const pool = mysql.createPool({
  host,
  user,
  password,
  database,
>>>>>>> origin/codex/configure-.htaccess-for-api-connection-2xxzd6
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
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
