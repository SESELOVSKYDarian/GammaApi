// db/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
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
