const { notificationService, NotificationError } = require('../services/notification.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { rangeResponse } = require('../utils/range');

const handle = (res, error) => {
  if (error instanceof NotificationError) return errorResponse(res, error.message, null, error.statusCode);
  return errorResponse(res, error.message, null, 500);
};

/** In-app notification feed (the owner "buzzer" is a booking_request item) and push registration */
class NotificationController {
  async list(req, res) {
    try {
      const { range, items, total } = await notificationService.list(req.user.id, req.body || {});
      return rangeResponse(res, 'Notifications retrieved successfully.', items, range, total);
    } catch (error) { return handle(res, error); }
  }

  async unreadCount(req, res) {
    try {
      return successResponse(res, 'Unread count retrieved successfully.', { unread: await notificationService.unreadCount(req.user.id) });
    } catch (error) { return handle(res, error); }
  }

  async markRead(req, res) {
    try {
      return successResponse(res, 'Notifications marked as read.', await notificationService.markRead(req.user.id, req.body || {}));
    } catch (error) { return handle(res, error); }
  }

  async registerDevice(req, res) {
    try {
      await notificationService.registerDevice(req.user.id, req.body || {});
      return successResponse(res, 'Device registered for notifications.', null);
    } catch (error) { return handle(res, error); }
  }
}

module.exports = new NotificationController();
