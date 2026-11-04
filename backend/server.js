require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/database');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Test PostgreSQL database connection
  await testConnection();

  // Owner requests nobody answered become "Expired" and the customer is told (also checked on every read)
  const { bookingService } = require('./src/services/booking.service');
  setInterval(() => {
    bookingService.expireStaleRequests().catch((error) => console.warn('[Bookings] expiry check failed: ' + error.message));
    require('./src/services/extension.service').extensionService.expireStale()
      .catch((error) => console.warn('[Extra time] expiry check failed: ' + error.message));
    // crane requests: auto price raise, requests nobody accepted, advances not paid in time
    require('./src/services/craneRequest.service').craneRequestService.tick()
      .catch((error) => console.warn('[Crane requests] check failed: ' + error.message));
  }, 60 * 1000).unref();

  app.listen(PORT, () => {
    console.log(`[Cranzo Server] Heavy Lifting API running on http://localhost:${PORT}`);
    console.log(`[Cranzo Server] Swagger Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`[Cranzo Server] Health Check: http://localhost:${PORT}/api/health`);
    console.log(`[Cranzo Server] Super Admin Login: POST http://localhost:${PORT}/api/auth/login`);
  });
};

startServer();
