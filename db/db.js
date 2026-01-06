const { Pool } = require('pg');
require('dotenv').config();

const sslEnabled = process.env.PGSSLMODE !== 'disable';

const connectionString =
    process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

const fallbackConfig = {
    user: process.env.DB_USER || process.env.PGUSER || process.env.POSTGRES_USER,
    host:
        process.env.DB_HOST ||
        process.env.PGHOST ||
        process.env.RAILWAY_PRIVATE_DOMAIN,
    database:
        process.env.DB_NAME || process.env.PGDATABASE || process.env.POSTGRES_DB,
    password:
        process.env.DB_PASSWORD || process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
    port: Number(process.env.DB_PORT || process.env.PGPORT) || 5432,
};

const pool = new Pool(
    connectionString
        ? {
              connectionString,
              ssl: sslEnabled ? { rejectUnauthorized: false } : false,
          }
        : {
              ...fallbackConfig,
              ssl: sslEnabled ? { rejectUnauthorized: false } : false,
          }
);

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error al conectar con PostgreSQL:', err.stack);
    } else {
        console.log('✅ Conectado a PostgreSQL');
        release();
    }
});

module.exports = pool;
