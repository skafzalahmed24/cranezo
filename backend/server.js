require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/database');

const PORT = process.env.PORT || 5000;

// A failed promise nobody handled (e.g. a database connection dropped overnight) must not take the
// whole API down: log it and keep serving. A real crash is logged and exits so pm2 restarts the server.
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled promise rejection:', reason && reason.stack ? reason.stack : reason);
});
process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught exception, restarting:', error && error.stack ? error.stack : error);
  process.exit(1);
});

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
    // operators who forgot to go Offline; owners told when a job's operator is offline
    require('./src/services/presence.service').presenceService.tick()
      .catch((error) => console.warn('[Presence] check failed: ' + error.message));
  }, 60 * 1000).unref();

  // owners whose subscription is due soon (or overdue) get a reminder, at most once a day
  setInterval(() => {
    require('./src/services/subscription.service').subscriptionService.sendReminders()
      .catch((error) => console.warn('[Subscriptions] reminders failed: ' + error.message));
  }, 60 * 60 * 1000).unref();

  // say at start-up whether phones will get pushes (Firebase key found and valid)
  require('./src/services/notification.service').getMessaging();

  app.listen(PORT, () => {
    console.log(`[Cranezo Server] Heavy Lifting API running on http://localhost:${PORT}`);
    console.log(`[Cranezo Server] Swagger Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`[Cranezo Server] Health Check: http://localhost:${PORT}/api/health`);
    console.log(`[Cranezo Server] Super Admin Login: POST http://localhost:${PORT}/api/auth/login`);
  });
};

startServer();
