require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/database');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Test PostgreSQL database connection
  await testConnection();

  app.listen(PORT, () => {
    console.log(`[Cranzo Server] Heavy Lifting API running on http://localhost:${PORT}`);
    console.log(`[Cranzo Server] Swagger Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`[Cranzo Server] Health Check: http://localhost:${PORT}/api/health`);
    console.log(`[Cranzo Server] Super Admin Login: POST http://localhost:${PORT}/api/auth/login`);
  });
};

startServer();
