const crypto = require('crypto');
const { Op, QueryTypes } = require('sequelize');
const {
  sequelize, Booking, Crane, CranePhoto, StaticDropdown, User
} = require('../models');
const { DROPDOWN_TYPES } = require('../constants/dropdownTypes');
const {
  BOOKING_STATUS, BOOKING_STATUS_LABELS, BLOCKING_STATUSES, BOOKING_CONFIG, PAYMENT_METHODS, NOTIFICATION_TYPES
} = require('../constants/booking');
const { CRANE_APPROVAL_STATUS } = require('../constants/roles');
const { jobStage, customerJobBlock } = require('../constants/job');
const { parseRange } = require('../utils/range');
const { notificationService } = require('./notification.service');
const { ServiceError } = require('./crane.service');
const billing = require('./billing');

const C = BOOKING_CONFIG;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------- helpers

const num = (v) => (v === null || v === undefined ? null : Number(v));
const money = (v) => Math.round(Number(v) * 100) / 100;
const iso = (d) => (d ? new Date(d).toISOString() : null);
const addMs = (date, ms) => new Date(date.getTime() + ms);
const HOUR = 3600 * 1000;

const toInt = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : NaN;
};

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const rad = (d) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const round1 = (n) => Math.round(n * 10) / 10;
const etaMinutes = (km) => Math.max(1, Math.round((km / C.AVG_SPEED_KMPH) * 60));

const parseCoords = (input) => {
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (input.latitude === undefined || input.longitude === undefined || input.latitude === null || input.longitude === null
    || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ServiceError('latitude and longitude are required.');
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new ServiceError('latitude or longitude is out of range.');
  }
  return { latitude, longitude };
};

/** start_type: now | scheduled (+ scheduled_at as an ISO date time with timezone) */
const parseStart = (input, now = new Date()) => {
  const startType = String(input.start_type || 'now').toLowerCase();
  if (startType === 'now') return { startType, startAt: now };
  if (startType !== 'scheduled') throw new ServiceError('start_type must be "now" or "scheduled".');

  const at = new Date(input.scheduled_at);
  if (!input.scheduled_at || Number.isNaN(at.getTime())) {
    throw new ServiceError('scheduled_at is required for a scheduled booking (e.g. 2026-09-05T09:00:00+05:30).');
  }
  if (at < addMs(now, C.MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000)) {
    throw new ServiceError(`Please choose a time at least ${C.MIN_SCHEDULE_LEAD_MINUTES} minutes from now.`);
  }
  if (at > addMs(now, C.MAX_SCHEDULE_DAYS * 24 * HOUR)) {
    throw new ServiceError(`Bookings can be scheduled up to ${C.MAX_SCHEDULE_DAYS} days ahead.`);
  }
  return { startType, startAt: at };
};

/** duration: { type: hours | full_day | days, hours, days } */
const parseDuration = (duration, startAt, minHours = C.MIN_HOURS) => {
  const d = duration || {};
  const type = String(d.type || 'hours').toLowerCase();
  const floor = Math.max(C.MIN_HOURS, minHours || 0);

  if (type === 'hours') {
    const hours = toInt(d.hours);
    if (!Number.isInteger(hours)) throw new ServiceError('duration.hours is required.');
    if (hours < floor) throw new ServiceError(`Minimum booking is ${floor} hours.`);
    if (hours > C.MAX_HOURS) throw new ServiceError(`For more than ${C.MAX_HOURS} hours choose Full Day or Multiple Days.`);
    return { durationType: 'hours', hours, days: null, endAt: addMs(startAt, hours * HOUR) };
  }
  if (type === 'full_day') {
    if (C.FULL_DAY_HOURS < floor) throw new ServiceError(`Minimum booking is ${floor} hours.`);
    return { durationType: 'full_day', hours: C.FULL_DAY_HOURS, days: 1, endAt: addMs(startAt, C.FULL_DAY_HOURS * HOUR) };
  }
  if (type === 'days') {
    const days = toInt(d.days);
    if (!Number.isInteger(days) || days < 1) throw new ServiceError('duration.days must be at least 1.');
    if (days > C.MAX_DAYS) throw new ServiceError(`You can book up to ${C.MAX_DAYS} days.`);
    return { durationType: 'days', hours: days * C.FULL_DAY_HOURS, days, endAt: addMs(startAt, days * 24 * HOUR) };
  }
  throw new ServiceError('duration.type must be "hours", "full_day" or "days".');
};

const durationLabel = (b) => {
  if (b.durationType === 'days') return `${b.durationDays} ${b.durationDays === 1 ? 'Day' : 'Days'}`;
  if (b.durationType === 'full_day') return 'Full Day (8 Hours)';
  return `${b.durationHours} Hours`;
};
const SERVICE_TYPE = { hours: 'Hourly', full_day: 'Full Day', days: 'Multiple Days' };

/** Operator and fuel are included in the hourly rate for now, so only the crane rental is charged */
const computePrice = (hourlyRate, hours) => {
  const craneRental = money(Number(hourlyRate) * hours);
  const operatorCharges = 0;
  const fuelCharges = 0;
  const otherCharges = 0;
  const totalAmount = money(craneRental + operatorCharges + fuelCharges + otherCharges);
  const advanceAmount = money((totalAmount * C.ADVANCE_PERCENT) / 100);
  return {
    hourly_rate: money(hourlyRate),
    duration_hours: hours,
    crane_rental: craneRental,
    operator_charges: operatorCharges,
    fuel_charges: fuelCharges,
    other_charges: otherCharges,
    operator_included: true,
    fuel_included: true,
    total_amount: totalAmount,
    advance_percent: C.ADVANCE_PERCENT,
    advance_amount: advanceAmount,
    remaining_amount: money(totalAmount - advanceAmount)
  };
};

/** Crane details / confirm screen: crane hire plus the owner's charges and GST, as the customer will be billed */
const quotedPrice = async (crane, hours) => {
  const price = computePrice(crane.hourlyRate, hours);
  const settings = await billing.ownerSettings(crane.ownerId);
  const bill = billing.quote({ craneRental: price.total_amount, charges: settings.charges, gstPercent: settings.gst_percent });
  return {
    ...price,
    charges: bill.charges,
    gst_percent: bill.gst_percent,
    gst_amount: bill.gst_amount,
    total_payable: bill.total,
    breakdown: billing.breakdownLines({ ...bill, platform_fee: 0, operator_commission: { set: false } })
  };
};

/** The customer's bill for a booking: crane hire, extra time, owner charges, GST and the total */
const customerBill = (b) => {
  const bill = billing.billOf(b);
  return { total_payable: bill.total, gst_percent: bill.gst_percent, gst_amount: bill.gst_amount, breakdown: billing.breakdownLines(bill) };
};

// ---------------------------------------------------------------- loading

const userAttrs = ['id', 'memberId', 'fullName', 'mobileNumber', 'countryCode', 'profileImage', 'ratingAverage', 'ratingCount'];
const ratingOf = (row) => (row && row.ratingAverage !== null && row.ratingAverage !== undefined && row.ratingCount > 0 ? Number(row.ratingAverage) : null);
const dd = ['id', 'dropdownName'];

const craneInclude = [
  { model: StaticDropdown, as: 'craneTypeInfo', attributes: dd },
  { model: StaticDropdown, as: 'capacityInfo', attributes: dd },
  { model: StaticDropdown, as: 'fuelTypeInfo', attributes: dd },
  { model: CranePhoto, as: 'photos', attributes: ['id', 'photoUrl', 'sortOrder'] },
  { model: User, as: 'operator', attributes: userAttrs },
  { model: User, as: 'owner', attributes: [...userAttrs, 'companyName', 'isActive', 'isDeleted'] }
];

const bookingInclude = [
  { model: Crane, as: 'crane', include: craneInclude },
  { model: User, as: 'customer', attributes: [...userAttrs, 'companyName'] },
  { model: User, as: 'operator', attributes: userAttrs },
  { model: User, as: 'owner', attributes: [...userAttrs, 'companyName'] },
  { model: StaticDropdown, as: 'craneTypeInfo', attributes: dd },
  { model: StaticDropdown, as: 'capacityInfo', attributes: dd }
];

const loadBooking = (id, where = {}) => Booking.findOne({ where: { id, ...where }, include: bookingInclude });

const primaryPhoto = (crane) => {
  const photos = [...(crane.photos || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  return photos.length ? photos[0].photoUrl : null;
};

const craneTitle = (crane) => [crane.capacityInfo && crane.capacityInfo.dropdownName, crane.craneTypeInfo && crane.craneTypeInfo.dropdownName]
  .filter(Boolean).join(' ');

const operatorView = (u) => (u ? {
  id: u.id,
  member_id: u.memberId,
  full_name: u.fullName,
  profile_image: u.profileImage,
  mobile_number: u.mobileNumber,
  country_code: u.countryCode,
  rating: ratingOf(u),
  reviews_count: u ? u.ratingCount || 0 : 0
} : null);

const craneSummary = (crane) => ({
  id: crane.id,
  crane_code: crane.craneCode,
  title: craneTitle(crane),
  model_name: crane.modelName,
  crane_type_name: crane.craneTypeInfo ? crane.craneTypeInfo.dropdownName : null,
  capacity_name: crane.capacityInfo ? crane.capacityInfo.dropdownName : null,
  fuel_type_name: crane.fuelTypeInfo ? crane.fuelTypeInfo.dropdownName : null,
  primary_photo: primaryPhoto(crane),
  rating: ratingOf(crane),
  reviews_count: crane.ratingCount || 0,
  verified: crane.approvalStatus === CRANE_APPROVAL_STATUS.VERIFIED,
  operator_included: !!crane.operatorId
});

const providerView = (owner) => ({
  id: owner ? owner.id : null,
  company_name: owner ? owner.companyName || owner.fullName : null,
  verified: true,
  rating: ratingOf(owner),
  reviews_count: owner ? owner.ratingCount || 0 : 0
});

const statusMessage = (b) => {
  switch (b.status) {
    case BOOKING_STATUS.AWAITING_OWNER: return 'Waiting for the crane owner to accept your request.';
    case BOOKING_STATUS.CONFIRMED: return 'Your crane has been successfully booked.';
    case BOOKING_STATUS.DECLINED: return 'The owner could not take this booking. Please choose another crane.';
    case BOOKING_STATUS.EXPIRED: return 'The owner did not respond in time. Please choose another crane.';
    case BOOKING_STATUS.CANCELLED: return 'This booking was cancelled.';
    case BOOKING_STATUS.EN_ROUTE: return 'The operator is on the way.';
    case BOOKING_STATUS.IN_PROGRESS: return 'Your job is in progress.';
    case BOOKING_STATUS.COMPLETED: return 'This job is completed.';
    default: return '';
  }
};

const priceView = (b) => ({
  hourly_rate: num(b.hourlyRate),
  duration_hours: b.durationHours,
  crane_rental: num(b.craneRental),
  operator_charges: num(b.operatorCharges),
  fuel_charges: num(b.fuelCharges),
  other_charges: num(b.otherCharges),
  operator_included: num(b.operatorCharges) === 0,
  fuel_included: num(b.fuelCharges) === 0,
  total_amount: num(b.totalAmount),
  ...customerBill(b)
});

const paymentView = (b) => {
  const method = PAYMENT_METHODS.find((m) => m.id === b.paymentMethod);
  return {
    method: b.paymentMethod,
    method_name: method ? method.name : b.paymentMethod,
    status: b.paymentStatus,
    total_amount: num(b.totalAmount),
    advance_percent: b.advancePercent,
    advance_amount: num(b.advanceAmount),
    remaining_amount: num(b.remainingAmount),
    paid_amount: num(b.paidAmount)
  };
};

const secondsLeft = (b) => (b.status === BOOKING_STATUS.AWAITING_OWNER && b.requestExpiresAt
  ? Math.max(0, Math.round((new Date(b.requestExpiresAt).getTime() - Date.now()) / 1000))
  : null);

const commonView = (b) => ({
  booking_id: b.id,
  booking_code: b.bookingCode,
  status: b.status,
  status_label: BOOKING_STATUS_LABELS[b.status],
  status_message: statusMessage(b),
  crane: craneSummary(b.crane),
  site: { name: b.siteName, address: b.siteAddress, latitude: num(b.latitude), longitude: num(b.longitude) },
  schedule: { start_type: b.startType, start_at: iso(b.startAt), end_at: iso(b.endAt) },
  duration: {
    type: b.durationType,
    service_type: SERVICE_TYPE[b.durationType],
    hours: b.durationHours,
    days: b.durationDays,
    label: durationLabel(b)
  },
  special_requirements: b.specialRequirements,
  distance_km: num(b.distanceKm),
  request_expires_at: iso(b.requestExpiresAt),
  seconds_left: secondsLeft(b),
  created_at: iso(b.createdAt)
});

const customerView = (b) => ({
  ...commonView(b),
  can_cancel: [BOOKING_STATUS.AWAITING_OWNER, BOOKING_STATUS.AWAITING_PAYMENT, BOOKING_STATUS.CONFIRMED].includes(b.status),
  provider: providerView(b.owner),
  operator: b.status >= BOOKING_STATUS.CONFIRMED && b.status !== BOOKING_STATUS.CANCELLED ? operatorView(b.operator) : null,
  eta_minutes: b.status === BOOKING_STATUS.CONFIRMED && b.distanceKm !== null ? etaMinutes(Number(b.distanceKm)) : null,
  price: priceView(b),
  payment: paymentView(b),
  decline_reason: b.declineReason,
  cancel_reason: b.cancelReason,
  job: customerJobBlock(b)
});

const ownerView = (b) => {
  const confirmed = b.status >= BOOKING_STATUS.CONFIRMED && b.status !== BOOKING_STATUS.CANCELLED;
  return {
    ...commonView(b),
    job_location: {
      name: b.siteName,
      address: b.siteAddress,
      latitude: num(b.latitude),
      longitude: num(b.longitude),
      distance_km: num(b.distanceKm)
    },
    approx_earnings: num(b.totalAmount),
    earnings: priceView(b),
    payment: paymentView(b),
    customer: b.customer ? {
      id: b.customer.id,
      full_name: b.customer.fullName,
      member_id: b.customer.memberId,
      // contact is revealed only after the owner accepts
      mobile_number: confirmed ? b.customer.mobileNumber : null,
      country_code: confirmed ? b.customer.countryCode : null
    } : null,
    operator: operatorView(b.operator),
    // the owner follows the job but never sees the customer's completion OTP
    job: { ...customerJobBlock(b), completion_otp: null, completion_otp_expires_at: null },
    can_respond: b.status === BOOKING_STATUS.AWAITING_OWNER,
    next_steps: confirmed
      ? 'The customer has been notified that you accepted the booking. Your job will appear in Active Jobs once the booking starts.'
      : null
  };
};

// ---------------------------------------------------------------- availability

/** Everything that must be true for a customer to book a crane, with a readable reason when it is not */
const bookableCheck = async (crane, { latitude, longitude, startAt, endAt, customerId, excludeBookingId }) => {
  if (crane.approvalStatus !== CRANE_APPROVAL_STATUS.VERIFIED || crane.isActive !== 0) {
    return { ok: false, reason: 'This crane is not available for booking.' };
  }
  if (crane.availabilityStatus !== 0) return { ok: false, reason: 'This crane is currently not available.' };
  if (!crane.owner || crane.owner.isDeleted === 1 || crane.owner.isActive === 1) {
    return { ok: false, reason: 'This crane is not available for booking.' };
  }
  if (customerId && crane.ownerId === customerId) return { ok: false, reason: 'You cannot book your own crane.' };
  if (crane.latitude === null || crane.longitude === null) {
    return { ok: false, reason: 'This crane has no location yet.' };
  }

  const distance = haversineKm(latitude, longitude, Number(crane.latitude), Number(crane.longitude));
  if (distance > C.MATCH_RADIUS_KM) {
    return { ok: false, reason: `This crane is more than ${C.MATCH_RADIUS_KM} km away from your location.`, distanceKm: round1(distance) };
  }

  const where = {
    craneId: crane.id,
    status: { [Op.in]: BLOCKING_STATUSES },
    startAt: { [Op.lt]: endAt },
    endAt: { [Op.gt]: startAt }
  };
  if (excludeBookingId) where.id = { [Op.ne]: excludeBookingId };
  const clash = await Booking.count({ where });
  if (clash) return { ok: false, reason: 'This crane is already booked for that time.', distanceKm: round1(distance) };

  return { ok: true, distanceKm: round1(distance) };
};

const requireDropdown = async (value, type, label) => {
  const id = toInt(value);
  if (!Number.isInteger(id)) throw new ServiceError(`${label} is required.`);
  const row = await StaticDropdown.findOne({ where: { id, dropdownType: type, dropdownTypeStatus: 0 }, attributes: ['id'] });
  if (!row) throw new ServiceError(`${label} is not a valid option.`);
  return id;
};

const bookingCode = () => {
  const d = new Date();
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd2 = String(d.getUTCDate()).padStart(2, '0');
  return `CRZ-${yy}${mm}${dd2}-${String(crypto.randomInt(0, 100000)).padStart(5, '0')}`;
};

// ---------------------------------------------------------------- service

class BookingService {
  /** Everything the Book a Crane steps need in one call */
  async options() {
    const rows = await StaticDropdown.findAll({
      where: { dropdownType: { [Op.in]: [DROPDOWN_TYPES.CRANE_TYPE, DROPDOWN_TYPES.CRANE_CAPACITY] }, dropdownTypeStatus: 0 },
      order: [['id', 'ASC']]
    });
    const list = (type) => rows.filter((r) => r.dropdownType === type).map((r) => ({
      id: r.id, name: r.dropdownName, description: r.dropdownDescription, image: r.image
    }));
    return {
      crane_types: list(DROPDOWN_TYPES.CRANE_TYPE),
      capacities: list(DROPDOWN_TYPES.CRANE_CAPACITY),
      start_types: [
        { id: 'now', name: 'Now', description: 'Get a crane as soon as possible.' },
        { id: 'scheduled', name: 'Schedule for later', description: 'Pick a date and time that works for you.' }
      ],
      duration_types: [
        { id: 'hours', name: 'Hours', description: `Select the number of hours (Minimum ${C.MIN_HOURS} hours)`, min: C.MIN_HOURS, max: C.MAX_HOURS, default: 8 },
        { id: 'full_day', name: 'Full day', description: `Typically ${C.FULL_DAY_HOURS} hours per day`, hours: C.FULL_DAY_HOURS },
        { id: 'days', name: 'Multiple Days', description: 'Select the number of days', min: 1, max: C.MAX_DAYS, default: 1 }
      ],
      payment_methods: PAYMENT_METHODS,
      default_payment_method: 'ONLINE',
      advance_percent: C.ADVANCE_PERCENT,
      search_radius_km: C.MATCH_RADIUS_KM,
      request_response_minutes: { now: C.REQUEST_TTL_NOW_MINUTES, scheduled: C.REQUEST_TTL_SCHEDULED_MINUTES }
    };
  }

  /** Shared validation of the "what / where / when / how long" part of a search or review */
  async parseRequirements(input, { needType = true } = {}) {
    const { latitude, longitude } = parseCoords(input);
    const start = parseStart(input);
    const duration = parseDuration(input.duration, start.startAt);
    const req = { latitude, longitude, ...start, ...duration };
    if (needType) {
      req.craneType = await requireDropdown(input.crane_type, DROPDOWN_TYPES.CRANE_TYPE, 'crane_type');
      req.capacity = await requireDropdown(input.capacity, DROPDOWN_TYPES.CRANE_CAPACITY, 'capacity');
    }
    return req;
  }

  /** "Available Cranes - We found 6 cranes near you": verified, free, same type + capacity, within 20 km */
  async searchCranes(customerId, input) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const req = await this.parseRequirements(input);
    const radius = Math.min(Number(input.radius_km) || C.MATCH_RADIUS_KM, C.MATCH_RADIUS_KM);

    const latDelta = radius / 111;
    const lngDelta = radius / (111 * Math.max(Math.cos((req.latitude * Math.PI) / 180), 0.01));
    const replacements = {
      lat: req.latitude,
      lng: req.longitude,
      minLat: req.latitude - latDelta,
      maxLat: req.latitude + latDelta,
      minLng: req.longitude - lngDelta,
      maxLng: req.longitude + lngDelta,
      type: req.craneType,
      capacity: req.capacity,
      hours: req.hours,
      customerId,
      startAt: req.startAt,
      endAt: req.endAt,
      blocking: BOOKING_STATUS_LIST(BLOCKING_STATUSES),
      verified: CRANE_APPROVAL_STATUS.VERIFIED,
      radius,
      limit: range.limit,
      offset: range.offset
    };

    const inner = `
      SELECT c.id,
        (6371 * acos(LEAST(1, cos(radians(:lat)) * cos(radians(c.latitude)) * cos(radians(c.longitude) - radians(:lng))
          + sin(radians(:lat)) * sin(radians(c.latitude))))) AS distance_km
      FROM cranes c
      JOIN users o ON o.id = c.owner_id
      WHERE c.approval_status = :verified AND c.availability_status = 0 AND c.is_active = 0
        AND c.crane_type = :type AND c.capacity = :capacity AND c.minimum_hours <= :hours
        AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
        AND c.latitude BETWEEN :minLat AND :maxLat AND c.longitude BETWEEN :minLng AND :maxLng
        AND o.is_deleted = 0 AND o.is_active = 0 AND c.owner_id <> :customerId
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.crane_id = c.id AND b.status IN (:blocking) AND b.start_at < :endAt AND b.end_at > :startAt)`;

    const rows = await sequelize.query(
      `SELECT * FROM (${inner}) t WHERE t.distance_km <= :radius ORDER BY t.distance_km ASC, t.id ASC LIMIT :limit OFFSET :offset`,
      { replacements, type: QueryTypes.SELECT }
    );
    const [{ total }] = await sequelize.query(
      `SELECT COUNT(*)::int AS total FROM (${inner}) t WHERE t.distance_km <= :radius`,
      { replacements, type: QueryTypes.SELECT }
    );

    const cranes = rows.length
      ? await Crane.findAll({ where: { id: rows.map((r) => r.id) }, include: craneInclude })
      : [];
    const byId = new Map(cranes.map((c) => [c.id, c]));

    const items = rows.map((r) => {
      const crane = byId.get(r.id);
      const distanceKm = round1(Number(r.distance_km));
      return {
        ...craneSummary(crane),
        availability_label: 'Available',
        distance_km: distanceKm,
        eta_minutes: etaMinutes(distanceKm),
        hourly_rate: money(crane.hourlyRate),
        minimum_hours: crane.minimumHours,
        price: computePrice(crane.hourlyRate, req.hours)
      };
    });

    return { range, items, total };
  }

  /** Crane Details screen + the numbers for Review Your Booking */
  async craneDetails(customerId, input) {
    if (!UUID_RE.test(String(input.crane_id || ''))) throw new ServiceError('A valid crane_id is required.');
    const req = await this.parseRequirements(input, { needType: false });

    const crane = await Crane.findOne({ where: { id: input.crane_id }, include: craneInclude });
    if (!crane) throw new ServiceError('Crane not found.', 404);
    // the duration must also respect this crane's own minimum
    parseDuration(input.duration, req.startAt, crane.minimumHours);

    const check = await bookableCheck(crane, { ...req, customerId });
    const distanceKm = check.distanceKm !== undefined
      ? check.distanceKm
      : (crane.latitude !== null ? round1(haversineKm(req.latitude, req.longitude, Number(crane.latitude), Number(crane.longitude))) : null);

    return {
      ...craneSummary(crane),
      bookable: check.ok,
      not_bookable_reason: check.ok ? null : check.reason,
      availability_label: crane.availabilityStatus === 0 ? 'Available' : 'Not Available',
      distance_km: distanceKm,
      eta_minutes: distanceKm !== null ? etaMinutes(distanceKm) : null,
      hourly_rate: money(crane.hourlyRate),
      minimum_hours: crane.minimumHours,
      photos: [...(crane.photos || [])].sort((a, b) => a.sortOrder - b.sortOrder).map((p) => ({ id: p.id, photo_url: p.photoUrl })),
      specifications: {
        crane_type: crane.craneTypeInfo ? crane.craneTypeInfo.dropdownName : null,
        capacity: crane.capacityInfo ? crane.capacityInfo.dropdownName : null,
        model: crane.modelName,
        fuel_type: crane.fuelTypeInfo ? crane.fuelTypeInfo.dropdownName : null,
        operator: crane.operatorId ? 'Included' : 'Not included',
        availability: crane.availabilityStatus === 0 ? 'Available' : 'Not Available'
      },
      about: crane.description,
      provider: providerView(crane.owner),
      booking_details: {
        site_address: input.site_address || null,
        start_type: req.startType,
        start_at: iso(req.startAt),
        end_at: iso(req.endAt),
        duration_label: durationLabel({ durationType: req.durationType, durationHours: req.hours, durationDays: req.days })
      },
      price: await quotedPrice(crane, req.hours),
      payment_methods: PAYMENT_METHODS
    };
  }

  /** Confirm & Pay (COD for now): creates the request and buzzes the crane's owner */
  async create(customerId, input) {
    if (!UUID_RE.test(String(input.crane_id || ''))) throw new ServiceError('A valid crane_id is required.');
    const siteAddress = String(input.site_address || '').trim();
    if (!siteAddress) throw new ServiceError('site_address is required.');

    const paymentMethod = String(input.payment_method || 'ONLINE').toUpperCase();
    const method = PAYMENT_METHODS.find((m) => m.id === paymentMethod);
    if (!method) throw new ServiceError('payment_method is not valid.');
    if (!method.enabled) throw new ServiceError(`${method.name} is not available. Please pay online.`);

    const req = await this.parseRequirements(input, { needType: false });
    const crane = await Crane.findOne({ where: { id: input.crane_id }, include: craneInclude });
    if (!crane) throw new ServiceError('Crane not found.', 404);
    const duration = parseDuration(input.duration, req.startAt, crane.minimumHours);

    const check = await bookableCheck(crane, { ...req, ...duration, customerId });
    if (!check.ok) throw new ServiceError(check.reason, 409);

    const duplicate = await Booking.count({
      where: {
        customerId,
        craneId: crane.id,
        status: { [Op.in]: [BOOKING_STATUS.AWAITING_OWNER, BOOKING_STATUS.CONFIRMED] },
        startAt: { [Op.lt]: duration.endAt },
        endAt: { [Op.gt]: req.startAt }
      }
    });
    if (duplicate) throw new ServiceError('You already have a booking request for this crane at that time.', 409);

    const price = computePrice(crane.hourlyRate, duration.hours);
    // the owner's charges and GST at booking time are copied onto the booking, so the customer's bill never changes later
    const ownerBilling = await billing.ownerSettings(crane.ownerId);
    const ttlMinutes = req.startType === 'now' ? C.REQUEST_TTL_NOW_MINUTES : C.REQUEST_TTL_SCHEDULED_MINUTES;

    let bookingId;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const booking = await Booking.create({
          bookingCode: bookingCode(),
          customerId,
          craneId: crane.id,
          ownerId: crane.ownerId,
          craneType: crane.craneType,
          capacity: crane.capacity,
          siteName: input.site_name ? String(input.site_name).trim().slice(0, 150) : null,
          siteAddress,
          specialRequirements: input.special_requirements ? String(input.special_requirements).trim().slice(0, 1000) : null,
          latitude: req.latitude,
          longitude: req.longitude,
          distanceKm: check.distanceKm,
          startType: req.startType,
          startAt: req.startAt,
          endAt: duration.endAt,
          durationType: duration.durationType,
          durationHours: duration.hours,
          durationDays: duration.days,
          hourlyRate: price.hourly_rate,
          craneRental: price.crane_rental,
          operatorCharges: price.operator_charges,
          fuelCharges: price.fuel_charges,
          otherCharges: price.other_charges,
          totalAmount: price.total_amount,
          advancePercent: price.advance_percent,
          advanceAmount: price.advance_amount,
          remainingAmount: price.remaining_amount,
          charges: ownerBilling.charges,
          gstPercent: ownerBilling.gst_percent,
          paymentMethod,
          paymentStatus: 'pending',
          paidAmount: 0,
          status: BOOKING_STATUS.AWAITING_OWNER,
          requestExpiresAt: addMs(new Date(), ttlMinutes * 60 * 1000)
        });
        bookingId = booking.id;
        break;
      } catch (error) {
        const codeClash = error.name === 'SequelizeUniqueConstraintError' && error.errors.some((e) => e.path === 'booking_code');
        if (!codeClash || attempt === 2) throw error;
      }
    }

    const created = await loadBooking(bookingId);

    // the "buzzer": tell the owner of this crane (the crane is within the 20 km limit, checked above)
    await notificationService.notify(created.ownerId, {
      type: NOTIFICATION_TYPES.BOOKING_REQUEST,
      title: 'New Crane Request',
      body: `${craneTitle(created.crane)} • ${created.siteName || created.siteAddress} • ${durationLabel(created)}`,
      data: { booking_id: created.id, booking_code: created.bookingCode, expires_at: iso(created.requestExpiresAt) }
    });

    return customerView(created);
  }

  // ---------------------------------------------------------------- customer reads

  async customerList(customerId, input = {}) {
    await this.expireStaleRequests();
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);

    const where = { customerId };
    const status = toInt(input.status);
    if (status !== null) {
      if (Number.isNaN(status) || !BOOKING_STATUS_LABELS[status]) throw new ServiceError('status is not valid.');
      where.status = status;
    } else if (input.group === 'active') {
      where.status = { [Op.in]: [BOOKING_STATUS.AWAITING_OWNER, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS] };
    } else if (input.group === 'past') {
      where.status = { [Op.in]: [BOOKING_STATUS.DECLINED, BOOKING_STATUS.EXPIRED, BOOKING_STATUS.CANCELLED, BOOKING_STATUS.COMPLETED] };
    }

    const { rows, count } = await Booking.findAndCountAll({
      where, include: bookingInclude, distinct: true, limit: range.limit, offset: range.offset, order: [['createdAt', 'DESC'], ['id', 'ASC']]
    });
    return { range, items: rows.map(customerView), total: count };
  }

  async customerGet(customerId, bookingId) {
    await this.expireStaleRequests();
    const booking = await this.mine(bookingId, { customerId });
    return customerView(booking);
  }

  async mine(bookingId, where) {
    if (!UUID_RE.test(String(bookingId || ''))) throw new ServiceError('A valid booking_id is required.');
    const booking = await loadBooking(bookingId, where);
    if (!booking) throw new ServiceError('Booking not found.', 404);
    return booking;
  }

  /** Track My Crane: light payload meant to be polled every few seconds */
  async track(customerId, bookingId) {
    await this.expireStaleRequests();
    return this.buildTrack(await this.mine(bookingId, { customerId }));
  }

  /** Tracking payload for a loaded booking (customer and owner share it) */
  buildTrack(b) {
    const crane = b.crane;
    const live = crane.currentLatitude !== null && crane.currentLongitude !== null;
    const craneLat = live ? Number(crane.currentLatitude) : num(crane.latitude);
    const craneLng = live ? Number(crane.currentLongitude) : num(crane.longitude);
    const distanceKm = craneLat !== null && craneLng !== null
      ? round1(haversineKm(craneLat, craneLng, Number(b.latitude), Number(b.longitude)))
      : null;
    const moving = [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.EN_ROUTE].includes(b.status);

    return {
      booking_id: b.id,
      booking_code: b.bookingCode,
      status: b.status,
      status_label: BOOKING_STATUS_LABELS[b.status],
      status_message: statusMessage(b),
      stage: jobStage(b),
      crane: { id: crane.id, title: craneTitle(crane), primary_photo: primaryPhoto(crane) },
      operator: b.status >= BOOKING_STATUS.CONFIRMED && b.status !== BOOKING_STATUS.CANCELLED ? operatorView(b.operator) : null,
      site: { name: b.siteName, address: b.siteAddress, latitude: num(b.latitude), longitude: num(b.longitude) },
      crane_location: {
        latitude: craneLat,
        longitude: craneLng,
        is_live: live,
        updated_at: iso(crane.locationUpdatedAt)
      },
      distance_km: distanceKm,
      eta_minutes: moving && distanceKm !== null ? etaMinutes(distanceKm) : null,
      expected_arrival_at: b.startType === 'scheduled' ? iso(b.startAt) : (moving && distanceKm !== null ? iso(addMs(new Date(), etaMinutes(distanceKm) * 60000)) : null),
      start_at: iso(b.startAt)
    };
  }

  async cancel(customerId, bookingId, reason) {
    const booking = await this.mine(bookingId, { customerId });
    if (![BOOKING_STATUS.AWAITING_OWNER, BOOKING_STATUS.AWAITING_PAYMENT, BOOKING_STATUS.CONFIRMED].includes(booking.status)) {
      throw new ServiceError('This booking can no longer be cancelled.', 409);
    }
    await booking.update({
      status: BOOKING_STATUS.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: 'customer',
      cancelReason: reason ? String(reason).trim().slice(0, 500) : null
    });
    // the request it came from is closed too
    if (booking.craneRequestId) {
      await require('../models').CraneRequest.update(
        { status: 'cancelled', closedAt: new Date() },
        { where: { id: booking.craneRequestId, status: { [Op.in]: ['accepted', 'confirmed'] } } }
      );
    }
    await notificationService.notify(booking.ownerId, {
      type: NOTIFICATION_TYPES.BOOKING_CANCELLED,
      title: 'Booking Cancelled',
      body: `${booking.bookingCode} was cancelled by the customer.`,
      data: { booking_id: booking.id, booking_code: booking.bookingCode }
    });
    return customerView(await loadBooking(booking.id));
  }

  // ---------------------------------------------------------------- owner

  async ownerList(ownerId, input = {}) {
    await this.expireStaleRequests();
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);

    const where = { ownerId };
    const status = toInt(input.status);
    if (status !== null) {
      if (Number.isNaN(status) || !BOOKING_STATUS_LABELS[status]) throw new ServiceError('status is not valid.');
      where.status = status;
    }
    const { rows, count } = await Booking.findAndCountAll({
      where,
      include: bookingInclude,
      distinct: true,
      limit: range.limit,
      offset: range.offset,
      // waiting requests first, then newest
      order: [['status', 'ASC'], ['createdAt', 'DESC'], ['id', 'ASC']]
    });
    return { range, items: rows.map(ownerView), total: count };
  }

  async ownerSummary(ownerId) {
    await this.expireStaleRequests();
    const rows = await Booking.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
      where: { ownerId },
      group: ['status'],
      raw: true
    });
    const out = { total: 0, awaiting_response: 0, confirmed: 0, declined: 0, expired: 0, cancelled: 0, completed: 0 };
    const key = { 0: 'awaiting_response', 1: 'confirmed', 2: 'declined', 3: 'expired', 4: 'cancelled', 7: 'completed' };
    rows.forEach((r) => {
      const n = Number(r.n);
      out.total += n;
      if (key[r.status]) out[key[r.status]] += n;
    });
    return out;
  }

  async ownerGet(ownerId, bookingId) {
    await this.expireStaleRequests();
    return ownerView(await this.mine(bookingId, { ownerId }));
  }

  /** Accept: first, the crane must still be free; then the customer is told */
  async ownerAccept(ownerId, bookingId) {
    await this.expireStaleRequests();
    const outcome = await sequelize.transaction(async (transaction) => {
      const booking = await Booking.findOne({
        where: { id: bookingId, ownerId }, transaction, lock: transaction.LOCK.UPDATE
      });
      if (!booking) throw new ServiceError('Booking not found.', 404);
      if (booking.status !== BOOKING_STATUS.AWAITING_OWNER) {
        throw new ServiceError(`This request is already ${BOOKING_STATUS_LABELS[booking.status].toLowerCase()}.`, 409);
      }

      const crane = await Crane.findOne({ where: { id: booking.craneId }, include: craneInclude, transaction });
      if (!crane || crane.approvalStatus !== CRANE_APPROVAL_STATUS.VERIFIED || crane.availabilityStatus !== 0) {
        throw new ServiceError('This crane is not available right now. Set it to Available to accept requests.', 409);
      }
      const clash = await Booking.count({
        where: {
          craneId: crane.id,
          id: { [Op.ne]: booking.id },
          status: { [Op.in]: BLOCKING_STATUSES },
          startAt: { [Op.lt]: booking.endAt },
          endAt: { [Op.gt]: booking.startAt }
        },
        transaction
      });
      if (clash) throw new ServiceError('This crane is already booked for that time.', 409);

      await booking.update({
        status: BOOKING_STATUS.CONFIRMED,
        acceptedAt: new Date(),
        operatorId: crane.operatorId || null,
        requestExpiresAt: null
      }, { transaction });

      // other customers waiting on the same crane and time can no longer be served
      const rivals = await Booking.findAll({
        where: {
          craneId: crane.id,
          id: { [Op.ne]: booking.id },
          status: BOOKING_STATUS.AWAITING_OWNER,
          startAt: { [Op.lt]: booking.endAt },
          endAt: { [Op.gt]: booking.startAt }
        },
        transaction
      });
      for (const rival of rivals) {
        // eslint-disable-next-line no-await-in-loop
        await rival.update({
          status: BOOKING_STATUS.DECLINED,
          declinedAt: new Date(),
          declineReason: 'This crane was booked by another customer.',
          requestExpiresAt: null
        }, { transaction });
      }
      return { bookingId: booking.id, rivals: rivals.map((r) => ({ id: r.id, customerId: r.customerId, code: r.bookingCode })) };
    });

    const accepted = await loadBooking(outcome.bookingId);
    await notificationService.notify(accepted.customerId, {
      type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      title: 'Booking Confirmed',
      body: `Your ${craneTitle(accepted.crane)} has been booked.${accepted.operator && accepted.operator.fullName ? ` Operator: ${accepted.operator.fullName}.` : ''}`,
      data: { booking_id: accepted.id, booking_code: accepted.bookingCode }
    }, { preferenceKey: 'booking_confirmations' });

    // the crane's operator gets the job request (New Job Request screen)
    if (accepted.operatorId) {
      await notificationService.notify(accepted.operatorId, {
        type: NOTIFICATION_TYPES.JOB_ASSIGNED,
        title: 'New Job Request',
        body: `${craneTitle(accepted.crane)} • ${accepted.siteName || accepted.siteAddress} • ${durationLabel(accepted)}`,
        data: { booking_id: accepted.id, booking_code: accepted.bookingCode }
      });
    }

    for (const rival of outcome.rivals) {
      // eslint-disable-next-line no-await-in-loop
      await notificationService.notify(rival.customerId, {
        type: NOTIFICATION_TYPES.BOOKING_DECLINED,
        title: 'Crane Unavailable',
        body: `${rival.code}: this crane was booked by another customer. Please choose another crane.`,
        data: { booking_id: rival.id, booking_code: rival.code }
      }, { preferenceKey: 'booking_confirmations' });
    }

    return ownerView(accepted);
  }

  async ownerDecline(ownerId, bookingId, reason) {
    await this.expireStaleRequests();
    const booking = await this.mine(bookingId, { ownerId });
    if (booking.status !== BOOKING_STATUS.AWAITING_OWNER) {
      throw new ServiceError(`This request is already ${BOOKING_STATUS_LABELS[booking.status].toLowerCase()}.`, 409);
    }
    await booking.update({
      status: BOOKING_STATUS.DECLINED,
      declinedAt: new Date(),
      declineReason: reason ? String(reason).trim().slice(0, 500) : null,
      requestExpiresAt: null
    });
    await notificationService.notify(booking.customerId, {
      type: NOTIFICATION_TYPES.BOOKING_DECLINED,
      title: 'Request Declined',
      body: `${booking.bookingCode}: the owner could not take this booking. Please choose another crane.`,
      data: { booking_id: booking.id, booking_code: booking.bookingCode }
    }, { preferenceKey: 'booking_confirmations' });
    return ownerView(await loadBooking(booking.id));
  }

  // ---------------------------------------------------------------- housekeeping

  /** Requests the owner never answered. Runs every minute and before reads. */
  async expireStaleRequests() {
    const stale = await Booking.findAll({
      where: { status: BOOKING_STATUS.AWAITING_OWNER, requestExpiresAt: { [Op.lt]: new Date() } },
      attributes: ['id', 'customerId', 'bookingCode']
    });
    if (!stale.length) return 0;

    const [count] = await Booking.update(
      { status: BOOKING_STATUS.EXPIRED, expiredAt: new Date(), requestExpiresAt: null },
      { where: { id: stale.map((b) => b.id), status: BOOKING_STATUS.AWAITING_OWNER } }
    );
    for (const b of stale) {
      // eslint-disable-next-line no-await-in-loop
      await notificationService.notify(b.customerId, {
        type: NOTIFICATION_TYPES.BOOKING_EXPIRED,
        title: 'No Response From Owner',
        body: `${b.bookingCode}: the owner did not respond in time. Please choose another crane.`,
        data: { booking_id: b.id, booking_code: b.bookingCode }
      }, { preferenceKey: 'booking_confirmations' });
    }
    return count;
  }
}

// sequelize replacements need a plain array for IN (:list)
function BOOKING_STATUS_LIST(list) {
  return [...list];
}

module.exports = {
  bookingService: new BookingService(),
  // shared with the operator job service
  bookingHelpers: {
    loadBooking, bookingInclude, craneSummary, craneTitle, primaryPhoto, operatorView, customerView, ownerView,
    priceView, paymentView, customerBill, durationLabel, bookingCode, ratingOf, haversineKm, etaMinutes, round1, num, iso, addMs, SERVICE_TYPE, UUID_RE
  }
};
