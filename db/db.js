const { Pool } = require('pg');
require('dotenv').config();

const sslEnabled = process.env.PGSSLMODE !== 'disable';

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

const selectedHost =
    process.env.DB_HOST ||
    process.env.PGHOST ||
    process.env.RAILWAY_PRIVATE_DOMAIN ||
    process.env.RAILWAY_TCP_PROXY_DOMAIN;

const proxyPort = process.env.RAILWAY_TCP_PROXY_PORT;
const port =
    Number(
        process.env.DB_PORT ||
            (selectedHost === process.env.RAILWAY_TCP_PROXY_DOMAIN
                ? proxyPort
                : undefined) ||
            process.env.PGPORT ||
            proxyPort
    ) || 5432;

const fallbackConfig = {
    user: process.env.DB_USER || process.env.PGUSER || process.env.POSTGRES_USER,
    host: selectedHost,
    database: process.env.DB_NAME || process.env.PGDATABASE || process.env.POSTGRES_DB,
    password:
        process.env.DB_PASSWORD || process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
    port,
    connectionTimeoutMillis: 8_000,
};

const poolOptions = connectionString
    ? {
          connectionString,
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
          connectionTimeoutMillis: 8_000,
      }
    : {
          ...fallbackConfig,
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
      };

console.log(
    `📡 Configuración de PostgreSQL: ${connectionString ? 'connection string' : 'parámetros separados'}`,
    {
        host: poolOptions.host || '(en URI)',
        port: poolOptions.port || '(en URI)',
        ssl: sslEnabled ? 'on' : 'off',
    }
);

const pool = new Pool(poolOptions);

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error al conectar con PostgreSQL:', err.stack);
    } else {
        console.log('✅ Conectado a PostgreSQL');
        release();
    }
});

module.exports = pool;
