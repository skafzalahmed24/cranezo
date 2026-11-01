const { Notification, User } = require('../models');
const { parseRange } = require('../utils/range');

class NotificationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Push delivery through Firebase Cloud Messaging.
 * It turns itself on only when `firebase-admin` is installed and FIREBASE_SERVICE_ACCOUNT_PATH
 * points to the service account json. Without those, notifications are still stored and the app
 * can fetch them (polling), nothing breaks.
 */
let messaging;
const getMessaging = () => {
  if (messaging !== undefined) return messaging;
  messaging = null;
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!keyPath) return messaging;
  try {
    // eslint-disable-next-line global-require
    const admin = require('firebase-admin');
    // eslint-disable-next-line global-require
    const serviceAccount = require(require('path').resolve(keyPath));
    if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    messaging = admin.messaging();
    console.log('[Push] Firebase Cloud Messaging is enabled.');
  } catch (error) {
    console.warn(`[Push] Disabled (${error.message}). Notifications are stored only.`);
  }
  return messaging;
};

const sendPush = async (user, { title, body, data }) => {
  const fcm = getMessaging();
  if (!fcm || !user.pushToken) return false;
  try {
    await fcm.send({
      token: user.pushToken,
      notification: { title, body: body || '' },
      // FCM data values must be strings
      data: Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)])),
      android: { priority: 'high' },
      apns: { headers: { 'apns-priority': '10' } }
    });
    return true;
  } catch (error) {
    console.warn(`[Push] Could not deliver to ${user.id}: ${error.message}`);
    return false;
  }
};

class NotificationService {
  /**
   * Store a notification for a user and try to push it to their phone.
   * `preferenceKey` (e.g. booking_confirmations) lets the user mute the push, the in-app item is always kept.
   */
  async notify(userId, { type, title, body, data }, { preferenceKey } = {}) {
    const notification = await Notification.create({ userId, type, title, body: body || null, data: data || null });

    try {
      const user = await User.findByPk(userId, { attributes: ['id', 'pushToken', 'notificationPreferences'] });
      const muted = preferenceKey && user && user.notificationPreferences && user.notificationPreferences[preferenceKey] === false;
      if (user && !muted) await sendPush(user, { title, body, data: { type, ...(data || {}) } });
    } catch (error) {
      console.warn(`[Push] ${error.message}`);
    }
    return notification;
  }

  format(n) {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      is_read: n.isRead,
      created_at: n.createdAt
    };
  }

  async list(userId, input = {}) {
    const range = parseRange(input);
    if (range.error) throw new NotificationError(range.error);
    const where = { userId };
    if (input.unread_only === true || input.unread_only === 'true') where.isRead = false;

    const { rows, count } = await Notification.findAndCountAll({
      where,
      limit: range.limit,
      offset: range.offset,
      order: [['createdAt', 'DESC'], ['id', 'ASC']]
    });
    return { range, items: rows.map((n) => this.format(n)), total: count };
  }

  unreadCount(userId) {
    return Notification.count({ where: { userId, isRead: false } });
  }

  /** ids: list of notification ids, or all: true */
  async markRead(userId, { ids, all }) {
    const where = { userId, isRead: false };
    if (!all) {
      if (!Array.isArray(ids) || ids.length === 0) throw new NotificationError('Send ids (a list) or all: true.');
      where.id = ids;
    }
    const [updated] = await Notification.update({ isRead: true }, { where });
    return { updated, unread: await this.unreadCount(userId) };
  }

  /** Called by the app after login / when the push token changes */
  async registerDevice(userId, { push_token: pushToken, platform }) {
    const token = String(pushToken || '').trim();
    if (!token) throw new NotificationError('push_token is required.');
    // one phone = one account: detach the token from anyone else who used it before
    await User.update({ pushToken: null, pushPlatform: null }, { where: { pushToken: token } });
    await User.update({ pushToken: token, pushPlatform: platform ? String(platform).slice(0, 20) : null }, { where: { id: userId } });
  }
}

module.exports = { notificationService: new NotificationService(), NotificationError };
