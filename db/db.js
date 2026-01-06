// db/db.js  (CommonJS)
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Si usás DATABASE_PUBLIC_URL (proxy rlwy.net), activá SSL:
  // ssl: { rejectUnauthorized: false },
});

module.exports = pool;
