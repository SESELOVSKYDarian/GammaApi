const mysql = require("mysql2/promise");

function pick(name, fallback) {
  return process.env[name] ?? fallback;
}

const pool = mysql.createPool({
  host: pick("MYSQLHOST", process.env.DB_HOST),
  port: Number(pick("MYSQLPORT", process.env.DB_PORT || 3306)),
  user: pick("MYSQLUSER", process.env.DB_USER),
  password: pick("MYSQLPASSWORD", process.env.DB_PASSWORD),
  database: pick("MYSQLDATABASE", process.env.DB_NAME),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
