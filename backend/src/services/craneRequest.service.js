const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  sequelize, Booking, Crane, CranePhoto, CraneRequest, StaticDropdown, User
} = require('../models');
const { BOOKING_STATUS, BLOCKING_STATUSES, NOTIFICATION_TYPES } = require('../constants/booking');
const { CRANE_APPROVAL_STATUS } = require('../constants/roles');
const { parseRange } = require('../utils/range');
const { ServiceError } = require('./crane.service');
const { notificationService } = require('./notification.service');
const { paymentService } = require('./payment.service');
const { bookingService, bookingHelpers: H } = require('./booking.service');
const billing = require('./billing');

/**
 * Rapido-style booking.
 *  1. The customer sends what they need (type, capacity, place, time, hours) and an offer for the crane hire.
 *  2. Every owner within the search radius with a matching, verified, free crane gets a push.
 *  3. If nobody accepts, the customer can raise the offer (or let it rise automatically up to a limit).
 *  4. The first owner to accept gets the job: a booking "Awaiting Payment" is created and the crane is blocked.
 *  5. The customer pays the owner's advance within the time limit (money goes to the platform), or it is cancelled.
 */
const STATUS = {
  SEARCHING: 'searching',
  ACCEPTED: 'accepted',          // owner accepted, waiting for the advance
  CONFIRMED: 'confirmed',        // advance paid, booking confirmed
  EXPIRED: 'expired',            // nobody accepted in time
  CANCELLED: 'cancelled',
  PAYMENT_EXPIRED: 'payment_expired',
  NOT_FOUND: 'not_found'         // sent to the admin team
};
const STATUS_LABELS = {
  searching: 'Finding a crane',
  accepted: 'Owner accepted - pay advance',
  confirmed: 'Booked',
  expired: 'No owner accepted',
  cancelled: 'Cancelled',
  payment_expired: 'Advance not paid in time',
  not_found: 'Sent to Cranezo team'
};
const OPEN = [STATUS.SEARCHING, STATUS.ACCEPTED];
const MIN = 60 * 1000;
const r2 = billing.r2;
const num = (v) => (v === null || v === undefined ? 0 : Number(v));
const iso = H.iso;
const roundUp10 = (n) => Math.ceil(n / 10) * 10;

const requestCode = () => {
  const d = new Date();
  return `REQ-${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}-${String(crypto.randomInt(0, 100000)).padStart(5, '0')}`;
};

/** Is test payment allowed? Until a gateway is connected, outside production (or when PAYMENT_TEST_MODE=true). */
const testPaymentAllowed = () => process.env.PAYMENT_TEST_MODE === 'true'
  || (process.env.NODE_ENV !== 'production' && process.env.PAYMENT_TEST_MODE !== 'false');

const raiseStep = (offer, rules) => roundUp10(Math.max(num(rules.raise_min_step), (num(offer) * num(rules.raise_step_percent)) / 100));

const dd = ['id', 'dropdownName'];
const craneIncludes = [
  { model: User, as: 'owner', attributes: ['id', 'fullName', 'companyName', 'isActive', 'isDeleted'] },
  { model: StaticDropdown, as: 'craneTypeInfo', attributes: dd },
  { model: StaticDropdown, as: 'capacityInfo', attributes: dd },
  { model: CranePhoto, as: 'photos', attributes: ['id', 'photoUrl', 'sortOrder'] }
];

class CraneRequestService {
  // ======================================================================== matching

  /**
   * Verified, available cranes of the right type + capacity within the radius, whose owner is active,
   * that are free for the whole time and allow this many hours. Each with its distance to the site.
   */
  async matchCranes({ craneType, capacity, latitude, longitude, startAt, endAt, hours }, { customerId = null, ownerId = null, rules }) {
    const radius = num(rules.search_radius_km);
    const latDelta = radius / 111;
    const lngDelta = radius / (111 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01));
    const where = {
      craneType,
      capacity,
      approvalStatus: CRANE_APPROVAL_STATUS.VERIFIED,
      availabilityStatus: 0,
      isActive: 0,
      minimumHours: { [Op.lte]: hours },
      latitude: { [Op.between]: [latitude - latDelta, latitude + latDelta] },
      longitude: { [Op.between]: [longitude - lngDelta, longitude + lngDelta] }
    };
    if (ownerId) where.ownerId = ownerId;
    if (customerId) where.ownerId = { ...(where.ownerId ? { [Op.eq]: where.ownerId } : {}), [Op.ne]: customerId };
    const cranes = await Crane.findAll({ where, include: craneIncludes });
    const near = cranes
      .filter((c) => c.owner && c.owner.isActive === 0 && c.owner.isDeleted === 0)
      .map((c) => ({ crane: c, distanceKm: H.round1(H.haversineKm(latitude, longitude, Number(c.latitude), Number(c.longitude))) }))
      .filter((m) => m.distanceKm <= radius);
    if (!near.length) return [];
    const busy = await Booking.findAll({
      where: {
        craneId: near.map((m) => m.crane.id),
        status: { [Op.in]: BLOCKING_STATUSES },
        startAt: { [Op.lt]: endAt },
        endAt: { [Op.gt]: startAt }
      },
      attributes: ['craneId']
    });
    const busyIds = new Set(busy.map((b) => b.craneId));
    return near.filter((m) => !busyIds.has(m.crane.id)).sort((a, b) => a.distanceKm - b.distanceKm);
  }

  /** What a crane's owner would charge at their own rates, and the distance charge to this site */
  async priceAt(match, hours, rules, settingsCache = new Map()) {
    const ownerId = match.crane.ownerId;
    if (!settingsCache.has(ownerId)) settingsCache.set(ownerId, await billing.ownerSettings(ownerId));
    const s = settingsCache.get(ownerId);
    const hire = r2(num(match.crane.hourlyRate) * hours);
    const distance = billing.distanceChargeFor(match.distanceKm, s.per_km_rate, rules);
    return { hire, distance, settings: s };
  }

  async parse(input) {
    const req = await bookingService.parseRequirements(input);
    const siteAddress = String(input.site_address || '').trim();
    if (!siteAddress) throw new ServiceError('site_address is required.');
    return {
      ...req,
      siteAddress,
      siteName: input.site_name ? String(input.site_name).trim().slice(0, 150) : null,
      specialRequirements: input.special_requirements ? String(input.special_requirements).trim().slice(0, 1000) : null
    };
  }

  /** The lowest offer allowed: the admin minimum per hour x hours, or the cheapest nearby crane if no minimum is set */
  async minimumOffer(req, hires) {
    const minHourly = await billing.minHourlyFor(req.craneType, req.capacity);
    if (minHourly > 0) return r2(minHourly * req.hours);
    return hires.length ? Math.min(...hires) : 0;
  }

  // ======================================================================== customer

  /** Review & price: how many cranes are near, the price range and the lowest offer allowed */
  async estimate(customerId, input) {
    const rules = await billing.bookingRules();
    const req = await bookingService.parseRequirements(input);
    const matches = await this.matchCranes(req, { customerId, rules });
    const cache = new Map();
    const prices = [];
    for (const m of matches) prices.push(await this.priceAt(m, req.hours, rules, cache)); // eslint-disable-line no-await-in-loop
    const hires = prices.map((p) => p.hire);
    const distances = prices.map((p) => p.distance.amount);
    const minOffer = await this.minimumOffer(req, hires);
    return {
      found: matches.length,
      search_radius_km: rules.search_radius_km,
      hours: req.hours,
      price_range: hires.length ? { min: Math.min(...hires), max: Math.max(...hires) } : null,
      distance_charge_range: distances.length ? { min: Math.min(...distances), max: Math.max(...distances) } : null,
      free_km: rules.free_km,
      min_offer: minOffer,
      suggested_offer: hires.length ? Math.max(minOffer, Math.min(...hires)) : minOffer,
      raise_step: raiseStep(minOffer, rules),
      raise_after_minutes: rules.raise_after_minutes,
      request_minutes: rules.request_minutes,
      payment_window_minutes: rules.payment_window_minutes,
      note: 'Owner charges (if any) and GST are added to the final bill. You pay an advance once an owner accepts.'
    };
  }

  /** Find a crane: create the request and buzz every matching owner nearby */
  async create(customerId, input) {
    await this.tick();
    const rules = await billing.bookingRules();
    const req = await this.parse(input);
    const open = await CraneRequest.count({ where: { customerId, status: { [Op.in]: OPEN } } });
    if (open) throw new ServiceError('You already have a request in progress. Finish or cancel it first.', 409);

    const matches = await this.matchCranes(req, { customerId, rules });
    if (!matches.length) {
      throw new ServiceError(`No crane of this type is free within ${rules.search_radius_km} km. Send your request to our team.`, 404);
    }
    const cache = new Map();
    const hires = [];
    for (const m of matches) hires.push((await this.priceAt(m, req.hours, rules, cache)).hire); // eslint-disable-line no-await-in-loop
    const minOffer = await this.minimumOffer(req, hires);
    const offer = r2(Number(input.offer_amount));
    if (!Number.isFinite(offer) || offer <= 0) throw new ServiceError('offer_amount is required.');
    if (offer < minOffer) throw new ServiceError(`The lowest offer for this crane is ₹${minOffer}.`);

    const autoRaise = input.auto_raise === true;
    let autoMax = null;
    if (autoRaise) {
      autoMax = r2(Number(input.auto_raise_max));
      if (!Number.isFinite(autoMax) || autoMax <= offer) throw new ServiceError('auto_raise_max must be more than your offer.');
    }

    let row;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        row = await CraneRequest.create({
          requestCode: requestCode(),
          customerId,
          craneType: req.craneType,
          capacity: req.capacity,
          siteName: req.siteName,
          siteAddress: req.siteAddress,
          latitude: req.latitude,
          longitude: req.longitude,
          startType: req.startType,
          startAt: req.startAt,
          endAt: req.endAt,
          durationType: req.durationType,
          durationHours: req.hours,
          durationDays: req.days,
          specialRequirements: req.specialRequirements,
          offerAmount: offer,
          firstOfferAmount: offer,
          minOfferAmount: minOffer,
          estimateMin: Math.min(...hires),
          estimateMax: Math.max(...hires),
          autoRaise,
          autoRaiseMax: autoMax,
          status: STATUS.SEARCHING,
          expiresAt: new Date(Date.now() + num(rules.request_minutes) * MIN),
          matchedCranes: matches.length
        });
        break;
      } catch (error) {
        if (error.name !== 'SequelizeUniqueConstraintError' || attempt === 2) throw error;
      }
    }
    await this.notifyOwners(row, matches, 'new');
    return this.customerView(await this.load(row.id));
  }

  async notifyOwners(row, matches, why) {
    const owners = [...new Set(matches.map((m) => m.crane.ownerId))];
    const title = why === 'raise' ? 'Price Raised for a Crane Request' : 'New Crane Request Near You';
    const crane = matches[0] ? H.craneTitle(matches[0].crane) : 'Crane';
    for (const ownerId of owners) {
      // eslint-disable-next-line no-await-in-loop
      await notificationService.notify(ownerId, {
        type: NOTIFICATION_TYPES.CRANE_REQUEST,
        title,
        body: `${crane} • ${row.durationHours} hrs • offer ₹${num(row.offerAmount)} • ${row.siteName || row.siteAddress}`,
        data: { request_id: row.id, request_code: row.requestCode }
      });
    }
  }

  load(id, where = {}) {
    return CraneRequest.findOne({
      where: { id, ...where },
      include: [
        { model: StaticDropdown, as: 'craneTypeInfo', attributes: dd },
        { model: StaticDropdown, as: 'capacityInfo', attributes: dd },
        { model: User, as: 'customer', attributes: ['id', 'fullName', 'companyName', 'mobileNumber', 'countryCode', 'memberId'] },
        { model: Booking, as: 'booking', required: false, include: H.bookingInclude }
      ]
    });
  }

  async mine(customerId, id) {
    if (!H.UUID_RE.test(String(id || ''))) throw new ServiceError('A valid request_id is required.');
    await this.tick();
    const row = await this.load(id, { customerId });
    if (!row) throw new ServiceError('Request not found.', 404);
    return row;
  }

  title(row) {
    return [row.capacityInfo && row.capacityInfo.dropdownName, row.craneTypeInfo && row.craneTypeInfo.dropdownName].filter(Boolean).join(' ');
  }

  async customerView(row) {
    const rules = await billing.bookingRules();
    const now = Date.now();
    const raiseFrom = new Date((row.lastRaisedAt || row.createdAt).getTime() + num(rules.raise_after_minutes) * MIN);
    const searching = row.status === STATUS.SEARCHING;
    const b = row.booking;
    let booking = null;
    if (b) {
      const bill = billing.billOf(b);
      booking = {
        booking_id: b.id,
        booking_code: b.bookingCode,
        status: b.status,
        owner_name: b.owner ? b.owner.companyName || b.owner.fullName : null,
        crane: b.crane ? { title: H.craneTitle(b.crane), model_name: b.crane.modelName, primary_photo: H.primaryPhoto(b.crane), rating: H.ratingOf(b.crane) } : null,
        bill: billing.breakdownLines(bill),
        total: bill.total,
        advance_percent: b.advancePercent,
        advance_amount: num(b.advanceAmount),
        balance_after_advance: r2(bill.total - num(b.advanceAmount)),
        payment_due_at: iso(b.paymentDueAt),
        payment_seconds_left: b.status === BOOKING_STATUS.AWAITING_PAYMENT && b.paymentDueAt
          ? Math.max(0, Math.round((new Date(b.paymentDueAt).getTime() - now) / 1000)) : null,
        advance_paid_at: iso(b.advancePaidAt),
        test_payment: testPaymentAllowed()
      };
    }
    return {
      request_id: row.id,
      request_code: row.requestCode,
      status: row.status,
      status_label: STATUS_LABELS[row.status],
      crane_title: this.title(row),
      site: { name: row.siteName, address: row.siteAddress, latitude: H.num(row.latitude), longitude: H.num(row.longitude) },
      schedule: { start_type: row.startType, start_at: iso(row.startAt), end_at: iso(row.endAt) },
      duration: { type: row.durationType, hours: row.durationHours, days: row.durationDays, label: H.durationLabel(row) },
      offer_amount: num(row.offerAmount),
      first_offer_amount: num(row.firstOfferAmount),
      min_offer_amount: num(row.minOfferAmount),
      estimate: { min: H.num(row.estimateMin), max: H.num(row.estimateMax) },
      owners_notified: row.matchedCranes,
      raise_count: row.raiseCount,
      auto_raise: row.autoRaise,
      auto_raise_max: H.num(row.autoRaiseMax),
      raise_step: raiseStep(row.offerAmount, rules),
      can_raise: searching && now >= raiseFrom.getTime(),
      can_raise_at: searching ? iso(raiseFrom) : null,
      expires_at: iso(row.expiresAt),
      seconds_left: searching && row.expiresAt ? Math.max(0, Math.round((new Date(row.expiresAt).getTime() - now) / 1000)) : null,
      can_cancel: OPEN.includes(row.status),
      can_send_to_team: [STATUS.EXPIRED, STATUS.PAYMENT_EXPIRED].includes(row.status),
      booking,
      created_at: iso(row.createdAt)
    };
  }

  async get(customerId, id) { return this.customerView(await this.mine(customerId, id)); }

  /** The request in progress, so the app can reopen it (searching or waiting for the advance) */
  async active(customerId) {
    await this.tick();
    const row = await CraneRequest.findOne({ where: { customerId, status: { [Op.in]: OPEN } }, order: [['createdAt', 'DESC']] });
    return row ? this.customerView(await this.load(row.id)) : null;
  }

  async list(customerId, input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    await this.tick();
    const { rows, count } = await CraneRequest.findAndCountAll({
      where: { customerId },
      include: [{ model: StaticDropdown, as: 'craneTypeInfo', attributes: dd }, { model: StaticDropdown, as: 'capacityInfo', attributes: dd }],
      limit: range.limit,
      offset: range.offset,
      order: [['createdAt', 'DESC'], ['id', 'ASC']]
    });
    return {
      range,
      items: rows.map((r) => ({
        request_id: r.id,
        request_code: r.requestCode,
        status: r.status,
        status_label: STATUS_LABELS[r.status],
        crane_title: this.title(r),
        location: r.siteName || r.siteAddress,
        start_at: iso(r.startAt),
        offer_amount: num(r.offerAmount),
        booking_id: r.bookingId,
        created_at: iso(r.createdAt)
      })),
      total: count
    };
  }

  /** Raise price by the step (the customer taps the button) */
  async raise(customerId, id) {
    const rules = await billing.bookingRules();
    const row = await this.mine(customerId, id);
    if (row.status !== STATUS.SEARCHING) throw new ServiceError('This request is no longer searching.', 409);
    const from = (row.lastRaisedAt || row.createdAt).getTime() + num(rules.raise_after_minutes) * MIN;
    if (Date.now() < from) throw new ServiceError(`You can raise the price after ${rules.raise_after_minutes} minutes.`, 409);
    await this.applyRaise(row, rules);
    return this.get(customerId, id);
  }

  async applyRaise(row, rules, cap = null) {
    const step = raiseStep(row.offerAmount, rules);
    const next = r2(cap !== null ? Math.min(num(row.offerAmount) + step, cap) : num(row.offerAmount) + step);
    if (next <= num(row.offerAmount)) return false;
    await row.update({ offerAmount: next, raiseCount: row.raiseCount + 1, lastRaisedAt: new Date() });
    const matches = await this.matchCranes({
      craneType: row.craneType, capacity: row.capacity, latitude: Number(row.latitude), longitude: Number(row.longitude),
      startAt: row.startAt, endAt: row.endAt, hours: row.durationHours
    }, { customerId: row.customerId, rules });
    await this.notifyOwners(row, matches, 'raise');
    return true;
  }

  async setAutoRaise(customerId, input = {}) {
    const row = await this.mine(customerId, input.request_id);
    if (row.status !== STATUS.SEARCHING) throw new ServiceError('This request is no longer searching.', 409);
    if (input.auto_raise === true) {
      const max = r2(Number(input.auto_raise_max));
      if (!Number.isFinite(max) || max <= num(row.offerAmount)) throw new ServiceError('auto_raise_max must be more than the current offer.');
      await row.update({ autoRaise: true, autoRaiseMax: max });
    } else {
      await row.update({ autoRaise: false });
    }
    return this.get(customerId, row.id);
  }

  /** Cancel while searching, or while the advance is still unpaid (the crane is released) */
  async cancel(customerId, id) {
    const row = await this.mine(customerId, id);
    if (!OPEN.includes(row.status)) throw new ServiceError('This request is already closed.', 409);
    if (row.status === STATUS.ACCEPTED && row.bookingId) {
      const b = await Booking.findByPk(row.bookingId);
      if (b && b.status === BOOKING_STATUS.AWAITING_PAYMENT) {
        await b.update({ status: BOOKING_STATUS.CANCELLED, cancelledAt: new Date(), cancelledBy: 'customer', cancelReason: 'Cancelled by the customer before paying the advance' });
        await notificationService.notify(b.ownerId, {
          type: NOTIFICATION_TYPES.BOOKING_CANCELLED,
          title: 'Booking Cancelled',
          body: `${b.bookingCode}: the customer cancelled before paying the advance. Your crane is free again.`,
          data: { booking_id: b.id, booking_code: b.bookingCode }
        });
      }
    }
    await row.update({ status: STATUS.CANCELLED, closedAt: new Date() });
    return this.get(customerId, id);
  }

  /** "No crane found": send the request to the admin team (from an expired request, or fresh from the form) */
  async sendToTeam(customerId, input = {}) {
    const note = input.note ? String(input.note).trim().slice(0, 1000) : null;
    if (input.request_id) {
      const row = await this.mine(customerId, input.request_id);
      if (![STATUS.EXPIRED, STATUS.PAYMENT_EXPIRED, STATUS.CANCELLED].includes(row.status)) {
        throw new ServiceError('Only a request that found no crane can be sent to the team.', 409);
      }
      await row.update({ status: STATUS.NOT_FOUND, notFoundNote: note, adminStatus: 'new', closedAt: new Date() });
      return this.get(customerId, row.id);
    }
    const req = await this.parse(input);
    const row = await CraneRequest.create({
      requestCode: requestCode(),
      customerId,
      craneType: req.craneType,
      capacity: req.capacity,
      siteName: req.siteName,
      siteAddress: req.siteAddress,
      latitude: req.latitude,
      longitude: req.longitude,
      startType: req.startType,
      startAt: req.startAt,
      endAt: req.endAt,
      durationType: req.durationType,
      durationHours: req.hours,
      durationDays: req.days,
      specialRequirements: req.specialRequirements,
      offerAmount: r2(Number(input.offer_amount) || 0),
      firstOfferAmount: r2(Number(input.offer_amount) || 0),
      minOfferAmount: 0,
      status: STATUS.NOT_FOUND,
      notFoundNote: note,
      adminStatus: 'new',
      closedAt: new Date()
    });
    return this.get(customerId, row.id);
  }

  /** Pay the advance. Until a payment gateway is connected this is a test payment (never in production). */
  async payAdvance(customerId, input = {}) {
    if (!H.UUID_RE.test(String(input.booking_id || ''))) throw new ServiceError('A valid booking_id is required.');
    if (!testPaymentAllowed()) throw new ServiceError('Online payment is not connected yet. Please try again later.', 503);
    await this.tick();
    const b = await Booking.findOne({ where: { id: input.booking_id, customerId } });
    if (!b) throw new ServiceError('Booking not found.', 404);
    if (b.status !== BOOKING_STATUS.AWAITING_PAYMENT) throw new ServiceError('This booking is not waiting for an advance.', 409);
    if (b.paymentDueAt && new Date() > new Date(b.paymentDueAt)) throw new ServiceError('The time to pay has run out. Please book again.', 410);
    await this.confirmWithAdvance(b, { method: 'TEST', gateway: 'test' });
    return this.get(customerId, b.craneRequestId);
  }

  /** Advance received: record it (held by the platform) and confirm the booking */
  async confirmWithAdvance(b, { method, gateway = null, gatewayPaymentId = null }) {
    const amount = num(b.advanceAmount);
    if (amount > 0) {
      const tx = await paymentService.record({ booking: b, amount, method, status: 'success', gateway, gatewayPaymentId, meta: { kind: 'advance' } });
      // a test or gateway payment always lands in the platform account
      if (tx.collectedBy !== 'platform') await tx.update({ collectedBy: 'platform' });
    }
    const crane = await Crane.findByPk(b.craneId, { attributes: ['id', 'operatorId'] });
    await b.update({
      status: BOOKING_STATUS.CONFIRMED,
      acceptedAt: b.acceptedAt || new Date(),
      advancePaidAt: new Date(),
      paidAmount: amount,
      platformCollectedAmount: r2(num(b.platformCollectedAmount) + amount),
      paymentStatus: amount > 0 ? 'partial' : 'pending',
      paymentDueAt: null,
      operatorId: b.operatorId || (crane ? crane.operatorId : null)
    });
    if (b.craneRequestId) await CraneRequest.update({ status: STATUS.CONFIRMED, closedAt: new Date() }, { where: { id: b.craneRequestId } });

    const loaded = await H.loadBooking(b.id);
    await notificationService.notify(b.ownerId, {
      type: NOTIFICATION_TYPES.ADVANCE_PAID,
      title: 'Advance Paid - Booking Confirmed',
      body: `${b.bookingCode}: the customer paid the advance of ₹${amount}. ${H.craneTitle(loaded.crane)} is booked.`,
      data: { booking_id: b.id, booking_code: b.bookingCode }
    });
    await notificationService.notify(b.customerId, {
      type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      title: 'Booking Confirmed',
      body: `${b.bookingCode}: advance received. Your crane is booked.`,
      data: { booking_id: b.id, booking_code: b.bookingCode }
    }, { preferenceKey: 'booking_confirmations' });
    if (loaded.operatorId) {
      await notificationService.notify(loaded.operatorId, {
        type: NOTIFICATION_TYPES.JOB_ASSIGNED,
        title: 'New Job Request',
        body: `${H.craneTitle(loaded.crane)} • ${loaded.siteName || loaded.siteAddress} • ${H.durationLabel(loaded)}`,
        data: { booking_id: loaded.id, booking_code: loaded.bookingCode }
      });
    }
  }

  // ======================================================================== owner

  /** Owner's cranes that are eligible for requests (verified, available, active) */
  ownerCranes(ownerId) {
    return Crane.findAll({
      where: { ownerId, approvalStatus: CRANE_APPROVAL_STATUS.VERIFIED, availabilityStatus: 0, isActive: 0, latitude: { [Op.ne]: null } },
      include: craneIncludes
    });
  }

  /** Requests near this owner that one of their cranes can take, with what they would earn */
  async ownerList(ownerId) {
    await this.tick();
    const rules = await billing.bookingRules();
    const cranes = await this.ownerCranes(ownerId);
    if (!cranes.length) return { items: [], cranes: 0 };
    const combos = [...new Set(cranes.map((c) => `${c.craneType}:${c.capacity}`))];
    const rows = await CraneRequest.findAll({
      where: {
        status: STATUS.SEARCHING,
        customerId: { [Op.ne]: ownerId },
        [Op.or]: combos.map((k) => { const [t, c] = k.split(':'); return { craneType: Number(t), capacity: Number(c) }; })
      },
      include: [{ model: StaticDropdown, as: 'craneTypeInfo', attributes: dd }, { model: StaticDropdown, as: 'capacityInfo', attributes: dd }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    const settings = await billing.ownerSettings(ownerId);
    const items = [];
    for (const r of rows) {
      // eslint-disable-next-line no-await-in-loop
      const matches = await this.matchCranes({
        craneType: r.craneType, capacity: r.capacity, latitude: Number(r.latitude), longitude: Number(r.longitude),
        startAt: r.startAt, endAt: r.endAt, hours: r.durationHours
      }, { ownerId, customerId: r.customerId, rules });
      if (!matches.length) continue;
      items.push({
        request_id: r.id,
        request_code: r.requestCode,
        crane_title: this.title(r),
        site: { name: r.siteName, address: r.siteAddress },
        schedule: { start_type: r.startType, start_at: iso(r.startAt), end_at: iso(r.endAt) },
        duration_label: H.durationLabel(r),
        hours: r.durationHours,
        special_requirements: r.specialRequirements,
        offer_amount: num(r.offerAmount),
        raised: r.raiseCount > 0,
        seconds_left: r.expiresAt ? Math.max(0, Math.round((new Date(r.expiresAt).getTime() - Date.now()) / 1000)) : null,
        cranes: matches.map((m) => {
          const usual = r2(num(m.crane.hourlyRate) * r.durationHours);
          const distance = billing.distanceChargeFor(m.distanceKm, settings.per_km_rate, rules);
          const bill = billing.quote({ craneRental: r.offerAmount, distanceCharge: distance.amount, charges: settings.charges, gstPercent: settings.gst_percent });
          return {
            crane_id: m.crane.id,
            crane_code: m.crane.craneCode,
            title: H.craneTitle(m.crane),
            registration_number: m.crane.registrationNumber,
            primary_photo: H.primaryPhoto(m.crane),
            distance_km: m.distanceKm,
            your_usual_price: usual,
            offer_vs_usual: r2(num(r.offerAmount) - usual),
            distance_charge: distance.amount,
            customer_total: bill.total,
            advance_amount: r2((bill.total * settings.advance_percent) / 100)
          };
        })
      });
    }
    return { items, cranes: cranes.length, advance_percent: settings.advance_percent, payment_window_minutes: rules.payment_window_minutes };
  }

  /** First owner to accept wins: a booking "Awaiting Payment" is created and the crane is blocked */
  async accept(ownerId, input = {}) {
    if (!H.UUID_RE.test(String(input.request_id || ''))) throw new ServiceError('A valid request_id is required.');
    if (!H.UUID_RE.test(String(input.crane_id || ''))) throw new ServiceError('A valid crane_id is required.');
    await this.tick();
    const rules = await billing.bookingRules();
    const settings = await billing.ownerSettings(ownerId);

    const bookingId = await sequelize.transaction(async (transaction) => {
      const row = await CraneRequest.findByPk(input.request_id, { lock: transaction.LOCK.UPDATE, transaction });
      if (!row || row.status !== STATUS.SEARCHING) throw new ServiceError('Too late - this request was already taken or closed.', 409);
      if (row.expiresAt && new Date() > new Date(row.expiresAt)) throw new ServiceError('This request has expired.', 410);

      const crane = await Crane.findOne({ where: { id: input.crane_id, ownerId }, include: craneIncludes, transaction });
      if (!crane) throw new ServiceError('Crane not found.', 404);
      if (crane.craneType !== row.craneType || crane.capacity !== row.capacity) throw new ServiceError('This crane does not match the request.', 409);
      if (crane.approvalStatus !== CRANE_APPROVAL_STATUS.VERIFIED || crane.availabilityStatus !== 0 || crane.isActive !== 0) {
        throw new ServiceError('This crane is not available.', 409);
      }
      const distanceKm = H.round1(H.haversineKm(Number(row.latitude), Number(row.longitude), Number(crane.latitude), Number(crane.longitude)));
      if (distanceKm > num(rules.search_radius_km)) throw new ServiceError('This crane is too far from the site.', 409);
      const clash = await Booking.count({
        where: { craneId: crane.id, status: { [Op.in]: BLOCKING_STATUSES }, startAt: { [Op.lt]: row.endAt }, endAt: { [Op.gt]: row.startAt } },
        transaction
      });
      if (clash) throw new ServiceError('This crane is already booked for that time.', 409);

      const distance = billing.distanceChargeFor(distanceKm, settings.per_km_rate, rules);
      const offer = num(row.offerAmount);
      const bill = billing.quote({ craneRental: offer, distanceCharge: distance.amount, charges: settings.charges, gstPercent: settings.gst_percent });
      const advance = r2((bill.total * settings.advance_percent) / 100);
      const due = new Date(Date.now() + num(rules.payment_window_minutes) * MIN);

      let created;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          // eslint-disable-next-line no-await-in-loop
          created = await Booking.create({
            bookingCode: H.bookingCode(),
            customerId: row.customerId,
            craneId: crane.id,
            ownerId,
            craneType: row.craneType,
            capacity: row.capacity,
            siteName: row.siteName,
            siteAddress: row.siteAddress,
            specialRequirements: row.specialRequirements,
            latitude: row.latitude,
            longitude: row.longitude,
            distanceKm,
            startType: row.startType,
            startAt: row.startAt,
            endAt: row.endAt,
            durationType: row.durationType,
            durationHours: row.durationHours,
            durationDays: row.durationDays,
            hourlyRate: r2(offer / Math.max(1, row.durationHours)),
            craneRental: offer,
            totalAmount: offer,
            distanceCharge: distance.amount,
            charges: settings.charges,
            gstPercent: settings.gst_percent,
            advancePercent: settings.advance_percent,
            advanceAmount: advance,
            remainingAmount: r2(bill.total - advance),
            paymentMethod: 'COD',
            paymentStatus: 'pending',
            paidAmount: 0,
            status: BOOKING_STATUS.AWAITING_PAYMENT,
            acceptedAt: new Date(),
            paymentDueAt: due,
            craneRequestId: row.id
          }, { transaction });
          break;
        } catch (error) {
          const codeClash = error.name === 'SequelizeUniqueConstraintError' && error.errors.some((e) => e.path === 'booking_code');
          if (!codeClash || attempt === 2) throw error;
        }
      }
      await row.update({ status: STATUS.ACCEPTED, bookingId: created.id, acceptedAt: new Date() }, { transaction });
      return created.id;
    });

    const b = await Booking.findByPk(bookingId);
    // nothing to pay in advance: confirmed straight away
    if (num(b.advanceAmount) <= 0) {
      await this.confirmWithAdvance(b, { method: 'NONE' });
    } else {
      const owner = await User.findByPk(ownerId, { attributes: ['fullName', 'companyName'] });
      await notificationService.notify(b.customerId, {
        type: NOTIFICATION_TYPES.REQUEST_ACCEPTED,
        title: 'Owner Accepted - Pay Advance',
        body: `${(owner && (owner.companyName || owner.fullName)) || 'An owner'} accepted your request. Pay the advance of ₹${num(b.advanceAmount)} within ${rules.payment_window_minutes} minutes or it will be cancelled.`,
        data: { request_id: b.craneRequestId, booking_id: b.id, booking_code: b.bookingCode }
      });
    }
    return H.ownerView(await H.loadBooking(bookingId));
  }

  // ======================================================================== timers (every minute, and before reads)

  async tick() {
    const now = new Date();
    const rules = await billing.bookingRules();

    // automatic price raise
    const raising = await CraneRequest.findAll({ where: { status: STATUS.SEARCHING, autoRaise: true } });
    for (const row of raising) {
      const due = (row.lastRaisedAt || row.createdAt).getTime() + num(rules.raise_after_minutes) * MIN;
      if (now.getTime() >= due && num(row.offerAmount) < num(row.autoRaiseMax)) {
        // eslint-disable-next-line no-await-in-loop
        await this.applyRaise(row, rules, num(row.autoRaiseMax));
      }
    }

    // nobody accepted in time
    const expired = await CraneRequest.findAll({ where: { status: STATUS.SEARCHING, expiresAt: { [Op.lt]: now } } });
    for (const row of expired) {
      // eslint-disable-next-line no-await-in-loop
      const [n] = await CraneRequest.update({ status: STATUS.EXPIRED, closedAt: now }, { where: { id: row.id, status: STATUS.SEARCHING } });
      if (!n) continue;
      // eslint-disable-next-line no-await-in-loop
      await notificationService.notify(row.customerId, {
        type: NOTIFICATION_TYPES.REQUEST_EXPIRED,
        title: 'No Owner Accepted',
        body: `${row.requestCode}: no crane owner accepted in time. Try again with a higher price, or send the request to our team.`,
        data: { request_id: row.id, request_code: row.requestCode }
      });
    }

    // advance not paid in time: cancel and free the crane
    const unpaid = await Booking.findAll({ where: { status: BOOKING_STATUS.AWAITING_PAYMENT, paymentDueAt: { [Op.lt]: now } } });
    for (const b of unpaid) {
      // eslint-disable-next-line no-await-in-loop
      const [n] = await Booking.update(
        { status: BOOKING_STATUS.CANCELLED, cancelledAt: now, cancelledBy: 'system', cancelReason: 'The advance was not paid in time.' },
        { where: { id: b.id, status: BOOKING_STATUS.AWAITING_PAYMENT } }
      );
      if (!n) continue;
      // eslint-disable-next-line no-await-in-loop
      if (b.craneRequestId) await CraneRequest.update({ status: STATUS.PAYMENT_EXPIRED, closedAt: now }, { where: { id: b.craneRequestId } });
      // eslint-disable-next-line no-await-in-loop
      await notificationService.notify(b.customerId, {
        type: NOTIFICATION_TYPES.PAYMENT_TIMEOUT,
        title: 'Booking Cancelled',
        body: `${b.bookingCode}: the advance was not paid in time, so the booking was cancelled.`,
        data: { booking_id: b.id, booking_code: b.bookingCode, request_id: b.craneRequestId }
      });
      // eslint-disable-next-line no-await-in-loop
      await notificationService.notify(b.ownerId, {
        type: NOTIFICATION_TYPES.PAYMENT_TIMEOUT,
        title: 'Customer Did Not Pay',
        body: `${b.bookingCode}: the customer did not pay the advance in time. Your crane is free again.`,
        data: { booking_id: b.id, booking_code: b.bookingCode }
      });
    }
  }

  // ======================================================================== admin

  async adminList(input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    await this.tick();
    const where = {};
    if (input.status === 'needs_action') where.status = STATUS.NOT_FOUND;
    else if (input.status) where.status = input.status;
    if (input.admin_status) where.adminStatus = input.admin_status;
    const { rows, count } = await CraneRequest.findAndCountAll({
      where,
      include: [
        { model: StaticDropdown, as: 'craneTypeInfo', attributes: dd },
        { model: StaticDropdown, as: 'capacityInfo', attributes: dd },
        { model: User, as: 'customer', attributes: ['id', 'fullName', 'companyName', 'mobileNumber', 'countryCode', 'memberId'] }
      ],
      limit: range.limit,
      offset: range.offset,
      order: [['createdAt', 'DESC'], ['id', 'ASC']]
    });
    return {
      range,
      items: rows.map((r) => ({
        request_id: r.id,
        request_code: r.requestCode,
        status: r.status,
        status_label: STATUS_LABELS[r.status],
        crane_title: this.title(r),
        location: r.siteName || r.siteAddress,
        start_at: iso(r.startAt),
        duration_label: H.durationLabel(r),
        offer_amount: num(r.offerAmount),
        raise_count: r.raiseCount,
        owners_notified: r.matchedCranes,
        note: r.notFoundNote,
        admin_status: r.adminStatus,
        admin_note: r.adminNote,
        customer: r.customer ? {
          id: r.customer.id,
          name: r.customer.companyName || r.customer.fullName,
          member_id: r.customer.memberId,
          contact: `${r.customer.countryCode || ''} ${r.customer.mobileNumber || ''}`.trim()
        } : null,
        booking_id: r.bookingId,
        created_at: iso(r.createdAt)
      })),
      total: count
    };
  }

  async adminSummary() {
    await this.tick();
    const count = (where) => CraneRequest.count({ where });
    return {
      searching: await count({ status: STATUS.SEARCHING }),
      awaiting_payment: await count({ status: STATUS.ACCEPTED }),
      not_found_new: await count({ status: STATUS.NOT_FOUND, adminStatus: 'new' }),
      expired_today: await count({ status: { [Op.in]: [STATUS.EXPIRED, STATUS.PAYMENT_EXPIRED] }, updatedAt: { [Op.gte]: new Date(Date.now() - 24 * 3600 * 1000) } })
    };
  }

  async adminUpdate(input = {}) {
    if (!H.UUID_RE.test(String(input.request_id || ''))) throw new ServiceError('A valid request_id is required.');
    const row = await CraneRequest.findByPk(input.request_id);
    if (!row) throw new ServiceError('Request not found.', 404);
    const status = input.admin_status;
    if (status !== undefined && !['new', 'contacted', 'closed'].includes(status)) throw new ServiceError('admin_status must be new, contacted or closed.');
    await row.update({
      adminStatus: status !== undefined ? status : row.adminStatus,
      adminNote: input.admin_note !== undefined ? String(input.admin_note || '').trim().slice(0, 1000) : row.adminNote
    });
    return { request_id: row.id, admin_status: row.adminStatus, admin_note: row.adminNote };
  }
}

module.exports = { craneRequestService: new CraneRequestService(), REQUEST_STATUS: STATUS, testPaymentAllowed };
