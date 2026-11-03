const { Op } = require('sequelize');
const { Banner, Booking, BookingRating, User } = require('../models');
const { BOOKING_STATUS } = require('../constants/booking');
const { parseRange } = require('../utils/range');
const { notificationService } = require('./notification.service');
const { supportService } = require('./support.service');
const { customerJobService } = require('./customerJob.service');
const { ServiceError } = require('./crane.service');
const { bookingHelpers: H } = require('./booking.service');

const AUDIENCES = ['all', 'customer', 'operator', 'owner'];
const ROLE_KEY = { 1: 'owner', 2: 'operator', 3: 'customer' };
const ACTION_TYPES = ['none', 'book_crane', 'screen', 'url'];
// screens a banner may open (the app maps these keys to its own screens)
const BANNER_SCREENS = ['my_jobs', 'track', 'support', 'notifications', 'profile', 'earnings'];
const PLACEMENTS = ['home'];

const iso = (d) => (d ? new Date(d).toISOString() : null);

const bannerView = (b) => ({
  id: b.id,
  title: b.title,
  subtitle: b.subtitle,
  button_text: b.buttonText,
  image: b.image,
  action: { type: b.actionType, value: b.actionValue },
  sort_order: b.sortOrder
});

const adminView = (b) => ({
  ...bannerView(b),
  placement: b.placement,
  audience: b.audience,
  is_active: b.isActive === 0,
  starts_at: iso(b.startsAt),
  ends_at: iso(b.endsAt),
  // what the apps are showing right now
  is_live: b.isActive === 0 && (!b.startsAt || b.startsAt <= new Date()) && (!b.endsAt || b.endsAt >= new Date()),
  updated_at: iso(b.updatedAt)
});

const text = (value, label, max, { required = false } = {}) => {
  const t = value === undefined || value === null ? '' : String(value).trim();
  if (required && !t) throw new ServiceError(`${label} is required.`);
  if (t.length > max) throw new ServiceError(`${label} is too long (up to ${max} characters).`);
  return t || null;
};

const date = (value, label) => {
  if (value === null || value === '' || value === undefined) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ServiceError(`${label} must be a valid date time.`);
  return d;
};

/** Validate the fields shared by create and update; returns only what was sent */
const parseBanner = (input, { create }) => {
  const out = {};
  if (create || input.image !== undefined) {
    const image = text(input.image, 'image', 255, { required: true });
    if (!/^(\/public\/uploads\/|https?:\/\/)/.test(image)) throw new ServiceError('image must be an uploaded file path or an https url.');
    out.image = image;
  }
  if (input.title !== undefined) out.title = text(input.title, 'title', 150);
  if (input.subtitle !== undefined) out.subtitle = text(input.subtitle, 'subtitle', 255);
  if (input.button_text !== undefined) out.buttonText = text(input.button_text, 'button_text', 40);
  if (input.audience !== undefined) {
    if (!AUDIENCES.includes(input.audience)) throw new ServiceError(`audience must be one of: ${AUDIENCES.join(', ')}.`);
    out.audience = input.audience;
  }
  if (input.placement !== undefined) {
    if (!PLACEMENTS.includes(input.placement)) throw new ServiceError(`placement must be one of: ${PLACEMENTS.join(', ')}.`);
    out.placement = input.placement;
  }
  if (input.sort_order !== undefined) {
    const n = Number(input.sort_order);
    if (!Number.isInteger(n)) throw new ServiceError('sort_order must be a whole number.');
    out.sortOrder = n;
  }
  if (input.is_active !== undefined) out.isActive = input.is_active ? 0 : 1;
  if (input.starts_at !== undefined) out.startsAt = date(input.starts_at, 'starts_at');
  if (input.ends_at !== undefined) out.endsAt = date(input.ends_at, 'ends_at');

  if (input.action_type !== undefined || input.action_value !== undefined || create) {
    const type = input.action_type === undefined ? 'none' : input.action_type;
    if (!ACTION_TYPES.includes(type)) throw new ServiceError(`action_type must be one of: ${ACTION_TYPES.join(', ')}.`);
    const value = text(input.action_value, 'action_value', 255);
    if (type === 'screen' && !BANNER_SCREENS.includes(value)) throw new ServiceError(`action_value must be one of: ${BANNER_SCREENS.join(', ')}.`);
    if (type === 'url' && !/^https:\/\/\S+$/.test(value || '')) throw new ServiceError('action_value must be an https link.');
    out.actionType = type;
    out.actionValue = ['screen', 'url'].includes(type) ? value : null;
  }
  return out;
};

class HomeService {
  // ---------------------------------------------------------------- app

  async activeBanners(user, placement = 'home') {
    const now = new Date();
    const key = ROLE_KEY[user.roleId] || 'customer';
    const rows = await Banner.findAll({
      where: {
        placement,
        isActive: 0,
        audience: { [Op.in]: ['all', key] },
        [Op.and]: [
          { [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: now } }] },
          { [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: now } }] }
        ]
      },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']]
    });
    return rows.map(bannerView);
  }

  /** Customer Home: greeting, banners, Quick Access and Recent Booking */
  async customerHome(user) {
    const full = await User.findByPk(user.id, { attributes: ['id', 'fullName', 'memberId', 'profileImage'] });
    const [banners, recent, activeCranes, upcoming, unreadReplies, unread] = await Promise.all([
      this.activeBanners(user),
      Booking.findAll({
        where: { customerId: user.id },
        include: [...H.bookingInclude, { model: BookingRating, as: 'rating', required: false }],
        order: [['createdAt', 'DESC']],
        limit: 3
      }),
      Booking.count({ where: { customerId: user.id, status: { [Op.in]: [BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS] } } }),
      Booking.count({ where: { customerId: user.id, status: { [Op.in]: [BOOKING_STATUS.AWAITING_OWNER, BOOKING_STATUS.CONFIRMED] } } }),
      supportService.unreadReplies(user.id),
      notificationService.unreadCount(user.id)
    ]);

    return {
      greeting_name: full.fullName,
      member_id: full.memberId,
      profile_image: full.profileImage,
      unread_notifications: unread,
      banners,
      quick_access: [
        { key: 'track_crane', title: 'Track My Crane', subtitle: 'Live location & ETA', icon: 'track', screen: 'track', badge: activeCranes },
        { key: 'my_jobs', title: 'My Jobs', subtitle: 'View all bookings', icon: 'jobs', screen: 'my_jobs', badge: upcoming + activeCranes },
        { key: 'help', title: 'Need Help?', subtitle: 'Get support', icon: 'help', screen: 'support', badge: unreadReplies }
      ],
      recent_bookings: recent.map((b) => customerJobService.item(b))
    };
  }

  // ---------------------------------------------------------------- admin

  async adminList(input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const where = {};
    if (input.audience) where.audience = String(input.audience);
    const { rows, count } = await Banner.findAndCountAll({
      where, limit: range.limit, offset: range.offset, order: [['sortOrder', 'ASC'], ['id', 'ASC']]
    });
    return { range, items: rows.map(adminView), total: count };
  }

  async adminCreate(adminId, input = {}) {
    const fields = parseBanner(input, { create: true });
    if (fields.startsAt && fields.endsAt && fields.endsAt <= fields.startsAt) throw new ServiceError('ends_at must be after starts_at.');
    if (fields.sortOrder === undefined) {
      const max = await Banner.max('sortOrder');
      fields.sortOrder = (max || 0) + 1;
    }
    const b = await Banner.create({ ...fields, createdBy: adminId });
    return adminView(b);
  }

  async adminUpdate(id, input = {}) {
    const b = await Banner.findByPk(Number(id));
    if (!b) throw new ServiceError('Banner not found.', 404);
    const fields = parseBanner(input, { create: false });
    if (!Object.keys(fields).length) throw new ServiceError('Nothing to update.');
    const startsAt = fields.startsAt !== undefined ? fields.startsAt : b.startsAt;
    const endsAt = fields.endsAt !== undefined ? fields.endsAt : b.endsAt;
    if (startsAt && endsAt && endsAt <= startsAt) throw new ServiceError('ends_at must be after starts_at.');
    await b.update(fields);
    return adminView(b);
  }
}

module.exports = { homeService: new HomeService(), BANNER_SCREENS };
