const { Sequelize } = require('sequelize');
const config = require('./config')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`[Database] PostgreSQL connection to '${config.database}' on port ${config.port} has been established successfully.`);
  } catch (error) {
    console.error('[Database] Unable to connect to PostgreSQL database:', error.message);
  }
};

module.exports = {
  sequelize,
  testConnection
};
