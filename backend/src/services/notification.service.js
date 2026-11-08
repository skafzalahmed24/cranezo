const { Op } = require('sequelize');
const { Notification, User } = require('../models');
const { metaFor } = require('../constants/notificationMeta');
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
/**
 * The Firebase service account, from (first found):
 *   FIREBASE_SERVICE_ACCOUNT_JSON  the key itself, raw JSON or base64 (for hosts that only take env vars)
 *   FIREBASE_SERVICE_ACCOUNT_PATH  a file path; a relative path is read from the backend folder, so it
 *                                  works whatever folder the server is started from
 * Never put the key in src/public: that folder is served to anyone.
 */
const loadServiceAccount = () => {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (raw) {
    const text = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(text);
  }
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!keyPath) return null;
  const path = require('path');
  const fs = require('fs');
  const candidates = path.isAbsolute(keyPath)
    ? [keyPath]
    : [path.resolve(__dirname, '..', '..', keyPath), path.resolve(keyPath)];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error(`service account file not found (${keyPath})`);
  return JSON.parse(fs.readFileSync(found, 'utf8'));
};

let messaging;
const getMessaging = () => {
  if (messaging !== undefined) return messaging;
  messaging = null;
  try {
    const serviceAccount = loadServiceAccount();
    if (!serviceAccount) {
      console.warn('[Push] Disabled: set FIREBASE_SERVICE_ACCOUNT_PATH (or FIREBASE_SERVICE_ACCOUNT_JSON). Notifications are stored only.');
      return messaging;
    }
    // eslint-disable-next-line global-require
    const admin = require('firebase-admin');
    if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    messaging = admin.messaging();
    console.log(`[Push] Firebase Cloud Messaging is enabled (project ${serviceAccount.project_id}).`);
  } catch (error) {
    console.warn(`[Push] Disabled (${error.message}). Notifications are stored only.`);
  }
  return messaging;
};

// Must match the channel ids the Android app creates (PushNotifications.kt)
const URGENT_TYPES = new Set(['crane_approved', 'crane_rejected', 'document_rejected', 'booking_request', 'crane_request', 'request_accepted', 'job_assigned', 'operator_arrived', 'completion_requested', 'extension_requested', 'breakdown_reported', 'emergency']);

// New requests for an owner, and a new job for an operator, ring with the buzzer tone (up to 30 seconds, until opened).
// They go as data-only messages so the app builds the ringing notification itself, even in the background.
const BUZZER_TYPES = new Set(['booking_request', 'crane_request', 'job_assigned']);

const sendPush = async (user, { title, body, data }) => {
  const fcm = getMessaging();
  if (!fcm || !user.pushToken) return false;
  const strings = Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)]));
  try {
    if (BUZZER_TYPES.has(data && data.type)) {
      await fcm.send({
        token: user.pushToken,
        data: { ...strings, title: String(title || ''), body: String(body || ''), buzzer: 'true' },
        android: { priority: 'high', ttl: 15 * 60 * 1000 },
        apns: { headers: { 'apns-priority': '10' }, payload: { aps: { alert: { title, body: body || '' }, sound: 'buzzer_tone.caf' } } }
      });
      return true;
    }
    await fcm.send({
      token: user.pushToken,
      notification: { title, body: body || '' },
      // FCM data values must be strings
      data: Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)])),
      // job alerts (new request, operator arrived, emergency) use the loud channel; the rest the normal one
      android: { priority: 'high', notification: { channelId: URGENT_TYPES.has(data && data.type) ? 'cranezo_urgent' : 'cranezo_updates', sound: 'default' } },
      apns: { headers: { 'apns-priority': '10' } }
    });
    return true;
  } catch (error) {
    console.warn(`[Push] Could not deliver to ${user.id}: ${error.message}`);
    // the app was uninstalled or the token expired: forget it; the app sends a new one on its next start
    if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(error.code)) {
      await User.update({ pushToken: null }, { where: { id: user.id, pushToken: user.pushToken } }).catch(() => {});
    }
    return false;
  }
};

class NotificationService {
  /**
   * Store a notification for a user and try to push it to their phone.
   * Every notification is pushed: notification settings were removed from the app, so saved preferences
   * (and `preferenceKey`, still passed by callers) no longer mute anything.
   */
  async notify(userId, { type, title, body, data }) {
    const notification = await Notification.create({ userId, type, title, body: body || null, data: data || null });

    try {
      const user = await User.findByPk(userId, { attributes: ['id', 'pushToken'] });
      if (user) await sendPush(user, { title, body, data: { type, screen: metaFor(type).screen || '', ...(data || {}) } });
    } catch (error) {
      console.warn(`[Push] ${error.message}`);
    }
    return notification;
  }

  format(n) {
    const meta = metaFor(n.type);
    const data = n.data || {};
    // India time decides "Today"
    const offset = 330 * 60000;
    const day = (d) => new Date(new Date(d).getTime() + offset).toISOString().slice(0, 10);
    return {
      id: n.id,
      type: n.type,
      category: meta.category,
      icon: meta.icon,
      title: n.title,
      body: n.body,
      data: n.data,
      // where tapping the item should go
      target: {
        screen: meta.screen,
        booking_id: data.booking_id || null,
        ticket_id: data.ticket_id || null,
        complaint_id: data.complaint_id || null,
        request_id: data.request_id || null
      },
      is_read: n.isRead,
      group: day(n.createdAt) === day(new Date()) ? 'today' : 'earlier',
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

  /** "2 unread" under TODAY, plus the overall count */
  async summary(userId) {
    const offset = 330 * 60000;
    const local = new Date(Date.now() + offset);
    local.setUTCHours(0, 0, 0, 0);
    const todayStart = new Date(local.getTime() - offset);
    return {
      unread: await this.unreadCount(userId),
      today_unread: await Notification.count({ where: { userId, isRead: false, createdAt: { [Op.gte]: todayStart } } })
    };
  }

  /**
   * Send one announcement to many users: stored for everyone, push on a best effort in the background.
   * Users who muted "Important Announcements" do not get the push but still see it in the list.
   */
  async broadcast(userIds, { type, title, body, data }) {
    let created = 0;
    for (let i = 0; i < userIds.length; i += 500) {
      const chunk = userIds.slice(i, i + 500);
      // eslint-disable-next-line no-await-in-loop
      await Notification.bulkCreate(chunk.map((userId) => ({ userId, type, title, body: body || null, data: data || null })));
      created += chunk.length;
    }
    setImmediate(async () => {
      try {
        const users = await User.findAll({
          where: { id: userIds, pushToken: { [Op.ne]: null } },
          attributes: ['id', 'pushToken']
        });
        for (const user of users) {
          // eslint-disable-next-line no-await-in-loop
          await sendPush(user, { title, body, data: { type, screen: metaFor(type).screen || '', ...(data || {}) } });
        }
      } catch (error) {
        console.warn(`[Push] broadcast: ${error.message}`);
      }
    });
    return created;
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

module.exports = { notificationService: new NotificationService(), NotificationError, sendPush, getMessaging };
