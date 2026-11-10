const { Op } = require('sequelize');
const { Booking, BookingExtension } = require('../models');
const {
  BOOKING_STATUS, BLOCKING_STATUSES, BOOKING_CONFIG, NOTIFICATION_TYPES, EXTENSION_STATUS, EXTENSION_STATUS_LABELS
} = require('../constants/booking');
const { jobStage } = require('../constants/job');
const { notificationService } = require('./notification.service');
const { ServiceError } = require('./crane.service');
const { bookingHelpers: H } = require('./booking.service');

const C = BOOKING_CONFIG;
const r2 = (n) => Math.round(n * 100) / 100;

const minutesLabel = (minutes) => {
  if (minutes % 60 === 0) return `${minutes / 60} ${minutes === 60 ? 'Hour' : 'Hours'}`;
  return `${minutes} min`;
};

/** The hourly rate agreed for this booking (offer / booked hours); extra time is always charged at it */
const ratePerHour = (b) => {
  const rate = Number(b.hourlyRate);
  if (rate > 0) return rate;
  return r2(Number(b.totalAmount || 0) / Math.max(1, Number(b.durationHours) || 1));
};

const view = (e, booking = null, now = new Date()) => ({
  id: e.id,
  code: e.extensionCode,
  minutes: e.minutes,
  label: minutesLabel(e.minutes),
  amount: Number(e.amount),
  hourly_rate: Number(e.hourlyRate),
  message: e.message,
  status: e.status,
  status_label: EXTENSION_STATUS_LABELS[e.status],
  requested_at: H.iso(e.createdAt),
  expires_at: H.iso(e.expiresAt),
  seconds_left: e.status === EXTENSION_STATUS.PENDING && e.expiresAt
    ? Math.max(0, Math.round((new Date(e.expiresAt) - now) / 1000))
    : null,
  responded_at: H.iso(e.respondedAt),
  reject_reason: e.rejectReason,
  // what the operator sees on the approval screen
  current_start_at: booking ? H.iso(booking.workStartedAt || booking.startAt) : null,
  current_end_at: booking ? H.iso(booking.endAt) : null,
  new_end_at: booking ? H.iso(H.addMs(new Date(booking.endAt), e.minutes * 60000)) : null
});

class ExtensionService {
  view(e, booking, now) {
    return view(e, booking, now);
  }

  /** Requests the operator never answered within 5 minutes */
  async expireStale() {
    const stale = await BookingExtension.findAll({
      where: { status: EXTENSION_STATUS.PENDING, expiresAt: { [Op.lt]: new Date() } },
      include: [{ model: Booking, as: 'booking', attributes: ['id', 'bookingCode', 'customerId'] }]
    });
    if (!stale.length) return 0;
    await BookingExtension.update(
      { status: EXTENSION_STATUS.EXPIRED, respondedAt: new Date() },
      { where: { id: stale.map((e) => e.id), status: EXTENSION_STATUS.PENDING } }
    );
    for (const e of stale) {
      // eslint-disable-next-line no-await-in-loop
      await notificationService.notify(e.booking.customerId, {
        type: NOTIFICATION_TYPES.EXTENSION_EXPIRED,
        title: 'Extra Time Request Expired',
        body: `${e.booking.bookingCode}: the operator did not answer in time. You can request again.`,
        data: { booking_id: e.booking.id, booking_code: e.booking.bookingCode, extension_id: e.id }
      }, { preferenceKey: 'job_updates' });
    }
    return stale.length;
  }

  /** Extra time block of a booking: the request waiting for an answer and what is already approved */
  async blockFor(booking) {
    await this.expireStale();
    const rows = await BookingExtension.findAll({ where: { bookingId: booking.id }, order: [['createdAt', 'DESC']] });
    const now = new Date();
    const pending = rows.find((e) => e.status === EXTENSION_STATUS.PENDING);
    return {
      pending: pending ? view(pending, booking, now) : null,
      approved_minutes: booking.extraMinutes,
      approved_amount: Number(booking.extraAmount),
      history: rows.filter((e) => e.status !== EXTENSION_STATUS.PENDING).map((e) => view(e, booking, now))
    };
  }

  async conflicts(booking, minutes) {
    const newEnd = H.addMs(new Date(booking.endAt), minutes * 60000);
    return Booking.count({
      where: {
        craneId: booking.craneId,
        id: { [Op.ne]: booking.id },
        status: { [Op.in]: BLOCKING_STATUSES },
        startAt: { [Op.lt]: newEnd },
        endAt: { [Op.gt]: booking.endAt }
      }
    });
  }

  /** Customer: Request Extra Time */
  async request(customerId, bookingId, input = {}) {
    if (!H.UUID_RE.test(String(bookingId || ''))) throw new ServiceError('A valid booking_id is required.');
    await this.expireStale();
    const b = await Booking.findOne({ where: { id: bookingId, customerId } });
    if (!b) throw new ServiceError('Booking not found.', 404);
    if (jobStage(b) !== 'working') throw new ServiceError('Extra time can be requested while your job is in progress.', 409);

    const minutes = Number(input.minutes);
    if (!Number.isInteger(minutes) || minutes < C.EXTRA_TIME_STEP_MINUTES || minutes > C.EXTRA_TIME_MAX_MINUTES
      || minutes % C.EXTRA_TIME_STEP_MINUTES !== 0) {
      throw new ServiceError(`minutes must be a multiple of ${C.EXTRA_TIME_STEP_MINUTES} between ${C.EXTRA_TIME_STEP_MINUTES} and ${C.EXTRA_TIME_MAX_MINUTES}.`);
    }
    const open = await BookingExtension.count({ where: { bookingId: b.id, status: EXTENSION_STATUS.PENDING } });
    if (open) throw new ServiceError('You already have an extra time request waiting for the operator.', 409);
    if (await this.conflicts(b, minutes)) {
      throw new ServiceError('This crane is booked for another job right after yours, so extra time is not available.', 409);
    }

    const rate = ratePerHour(b);
    const amount = r2((rate * minutes) / 60);
    const digits = b.bookingCode.replace(/\D/g, '').slice(-5);
    const ext = await BookingExtension.create({
      extensionCode: `EXT-${digits}-${minutes % 60 === 0 ? `${minutes / 60}HR` : `${minutes}MIN`}`,
      bookingId: b.id,
      requestedBy: customerId,
      minutes,
      hourlyRate: rate,
      amount,
      message: input.message ? String(input.message).trim().slice(0, 500) : null,
      status: EXTENSION_STATUS.PENDING,
      expiresAt: H.addMs(new Date(), C.EXTRA_TIME_RESPONSE_MINUTES * 60000)
    });

    // the operator is not shown the customer's price, only the time
    const ask = `${b.bookingCode}: customer asks for ${minutesLabel(minutes)} more`;
    const wait = `Please answer within ${C.EXTRA_TIME_RESPONSE_MINUTES} minutes.`;
    for (const userId of [b.operatorId, b.ownerId]) {
      if (!userId) continue;
      // eslint-disable-next-line no-await-in-loop
      await notificationService.notify(userId, {
        type: NOTIFICATION_TYPES.EXTENSION_REQUESTED,
        title: 'Extra Time Request',
        body: userId === b.ownerId ? `${ask} (₹${amount}). ${wait}` : `${ask}. ${wait}`,
        data: { booking_id: b.id, booking_code: b.bookingCode, extension_id: ext.id }
      });
    }
    return view(ext, b);
  }

  /** Customer: Cancel Request */
  async cancel(customerId, bookingId) {
    if (!H.UUID_RE.test(String(bookingId || ''))) throw new ServiceError('A valid booking_id is required.');
    await this.expireStale();
    const b = await Booking.findOne({ where: { id: bookingId, customerId } });
    if (!b) throw new ServiceError('Booking not found.', 404);
    const ext = await BookingExtension.findOne({ where: { bookingId: b.id, status: EXTENSION_STATUS.PENDING } });
    if (!ext) throw new ServiceError('There is no extra time request to cancel.', 409);
    await ext.update({ status: EXTENSION_STATUS.CANCELLED, respondedAt: new Date() });
    return view(ext, b);
  }

  /** Operator: approve or reject. Approving adds the time and the amount to the booking. */
  async respond(operatorId, bookingId, input = {}) {
    if (!H.UUID_RE.test(String(bookingId || ''))) throw new ServiceError('A valid booking_id is required.');
    await this.expireStale();
    const b = await Booking.findOne({ where: { id: bookingId, operatorId } });
    if (!b) throw new ServiceError('Job not found.', 404);
    const ext = await BookingExtension.findOne({ where: { bookingId: b.id, status: EXTENSION_STATUS.PENDING } });
    if (!ext) throw new ServiceError('There is no extra time request waiting for an answer.', 409);

    const action = String(input.action || '').toLowerCase();
    if (!['approve', 'reject'].includes(action)) throw new ServiceError('action must be "approve" or "reject".');
    const now = new Date();

    if (action === 'approve') {
      if (jobStage(b) !== 'working') throw new ServiceError('The job is no longer in progress.', 409);
      if (await this.conflicts(b, ext.minutes)) {
        throw new ServiceError('This crane is booked for another job right after this one, so extra time cannot be approved.', 409);
      }
      await ext.update({ status: EXTENSION_STATUS.APPROVED, respondedAt: now });
      await b.update({
        extraMinutes: b.extraMinutes + ext.minutes,
        extraAmount: r2(Number(b.extraAmount) + Number(ext.amount)),
        endAt: H.addMs(new Date(b.endAt), ext.minutes * 60000)
      });
    } else {
      await ext.update({
        status: EXTENSION_STATUS.REJECTED,
        respondedAt: now,
        rejectReason: input.reason ? String(input.reason).trim().slice(0, 500) : null
      });
    }

    const approved = action === 'approve';
    await notificationService.notify(b.customerId, {
      type: approved ? NOTIFICATION_TYPES.EXTENSION_APPROVED : NOTIFICATION_TYPES.EXTENSION_REJECTED,
      title: approved ? 'Extra Time Approved' : 'Extra Time Not Approved',
      body: approved
        ? `${b.bookingCode}: ${minutesLabel(ext.minutes)} added (₹${Number(ext.amount)}).`
        : `${b.bookingCode}: the operator could not approve extra time.${ext.rejectReason ? ` ${ext.rejectReason}` : ''}`,
      data: { booking_id: b.id, booking_code: b.bookingCode, extension_id: ext.id }
    }, { preferenceKey: 'job_updates' });

    return view(ext, b);
  }

  /** The job ended: a request nobody answered is no longer needed */
  closePending(bookingId) {
    return BookingExtension.update(
      { status: EXTENSION_STATUS.CANCELLED, respondedAt: new Date() },
      { where: { bookingId, status: EXTENSION_STATUS.PENDING } }
    );
  }
}

module.exports = { ratePerHour, extensionService: new ExtensionService(), minutesLabel };
