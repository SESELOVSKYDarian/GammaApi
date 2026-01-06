// db.js (CommonJS)
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Si usás DATABASE_PUBLIC_URL (proxy externo), activá SSL:
  // ssl: { rejectUnauthorized: false }
});

module.exports = pool;
