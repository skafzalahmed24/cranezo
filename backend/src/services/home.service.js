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
      recent_bookings: recent.map((b) => customerJobService.item(b)),
      current_order: await this.currentOrder(user.id)
    };
  }

  /**
   * The order that is happening now, for the special card at the top of Customer Home: a request still looking
   * for a crane, or a booking from payment to completion (and payment). Null when nothing is open.
   * step: 1 request sent, 2 owner accepted / pay advance, 3 confirmed (operator being assigned), 4 on the way, 5 working, 6 done.
   */
  async currentOrder(customerId) {
    const { CraneRequest } = require('../models');
    const { jobStage } = require('../constants/job');
    const open = [BOOKING_STATUS.AWAITING_PAYMENT, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS];
    const b = await Booking.findOne({
      where: {
        customerId,
        [Op.or]: [
          { status: { [Op.in]: open } },
          // finished, still to pay
          { status: BOOKING_STATUS.COMPLETED, paymentStatus: { [Op.ne]: 'paid' } }
        ]
      },
      include: H.bookingInclude,
      // what is moving first, then the soonest
      order: [[Booking.sequelize.literal('CASE "Booking"."status" WHEN 6 THEN 0 WHEN 5 THEN 1 WHEN 8 THEN 2 WHEN 1 THEN 3 ELSE 4 END'), 'ASC'], ['startAt', 'ASC']]
    });
    if (b) {
      const stage = jobStage(b);
      const operatorOk = H.operatorVisible(b);
      const pick = {
        awaiting_payment: [2, 'Owner accepted - pay the advance to confirm'],
        awaiting_operator: [3, 'Your order has been confirmed. Awaiting assignment of the crane to an operator.'],
        accepted: [3, operatorOk ? 'Operator assigned. The crane will start towards your site soon.' : 'Your order has been confirmed. Awaiting assignment of the crane to an operator.'],
        en_route: [4, 'The crane is on the way to your site'],
        arrived: [4, 'The crane has reached your site - please confirm the arrival'],
        working: [5, 'Work in progress'],
        summary: [5, 'Work finished - the operator will ask for your code'],
        awaiting_confirmation: [5, 'Share your completion code with the operator'],
        completed: [6, 'Job completed - please pay the balance']
      }[stage] || [3, b.status === BOOKING_STATUS.CONFIRMED ? 'Your order has been confirmed. Awaiting assignment of the crane to an operator.' : ''];
      return {
        kind: 'booking',
        booking_id: b.id,
        request_id: b.craneRequestId || null,
        code: b.bookingCode,
        crane_title: H.craneTitle(b.crane),
        primary_photo: H.primaryPhoto(b.crane),
        site: b.siteName || b.siteAddress,
        start_at: iso(b.startAt),
        stage,
        step: pick[0],
        steps_total: 6,
        message: pick[1],
        operator_name: operatorOk && b.operator ? b.operator.fullName : null,
        can_track: b.status === BOOKING_STATUS.EN_ROUTE && !b.arrivedAt,
        action: b.status === BOOKING_STATUS.AWAITING_PAYMENT ? 'pay_advance' : (b.status === BOOKING_STATUS.COMPLETED ? 'pay_balance' : 'view')
      };
    }
    const r = await CraneRequest.findOne({ where: { customerId, status: 'searching' }, order: [['createdAt', 'DESC']] });
    if (!r) return null;
    return {
      kind: 'request',
      booking_id: null,
      request_id: r.id,
      code: r.requestCode,
      crane_title: null,
      primary_photo: null,
      site: r.siteName || r.siteAddress,
      start_at: iso(r.startAt),
      stage: 'searching',
      step: 1,
      steps_total: 6,
      message: `Finding a crane near you - ${r.matchedCranes || 0} owners asked`,
      operator_name: null,
      can_track: false,
      action: 'view_request'
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
