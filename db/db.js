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
<<<<<<< HEAD
        process.env.RAILWAY_PRIVATE_DOMAIN,
=======
        process.env.RAILWAY_PRIVATE_DOMAIN ||
        process.env.RAILWAY_TCP_PROXY_DOMAIN,
>>>>>>> origin/codex/edit-project-for-railway-deployment-94ecb2
    database:
        process.env.DB_NAME || process.env.PGDATABASE || process.env.POSTGRES_DB,
    password:
        process.env.DB_PASSWORD || process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
<<<<<<< HEAD
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
=======
    port:
        Number(
            process.env.DB_PORT ||
                process.env.PGPORT ||
                process.env.RAILWAY_TCP_PROXY_PORT
        ) || 5432,
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
>>>>>>> origin/codex/edit-project-for-railway-deployment-94ecb2

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error al conectar con PostgreSQL:', err.stack);
    } else {
        console.log('✅ Conectado a PostgreSQL');
        release();
    }
});

module.exports = pool;
