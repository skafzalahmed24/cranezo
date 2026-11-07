require('dotenv').config();

// Same connection handling in every environment (the live server runs as 'development'):
// idle connections are closed and replaced, TCP keep-alive stops the network from silently
// dropping them, and a query that hits a dropped connection is retried instead of failing.
const shared = {
  logging: false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000, evict: 10000 },
  dialectOptions: { keepAlive: true },
  retry: {
    max: 3,
    match: [/SequelizeConnectionError/, /SequelizeConnectionRefusedError/, /SequelizeConnectionAcquireTimeoutError/, /Connection terminated/, /ECONNRESET/, /ETIMEDOUT/]
  }
};

module.exports = {
  development: {
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'Afz@l123',
    database: process.env.DB_DATABASE || 'cranzo_db',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: process.env.DB_DIALECT || 'postgres',
    ...shared
  },
  test: {
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'Afz@l123',
    database: `${process.env.DB_DATABASE || 'cranzo_db'}_test`,
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: process.env.DB_DIALECT || 'postgres',
    ...shared
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: process.env.DB_DIALECT || 'postgres',
    ...shared
  }
};
