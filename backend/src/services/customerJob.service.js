const crypto = require('crypto');
const { Op, fn, col } = require('sequelize');
const { Booking, BookingRating, Crane, User } = require('../models');
const {
  BOOKING_STATUS, BOOKING_STATUS_LABELS, BOOKING_CONFIG, PAYMENT_METHODS, NOTIFICATION_TYPES
} = require('../constants/booking');
const { jobStage, timers, workingSecondsNow } = require('../constants/job');
const { parseRange } = require('../utils/range');
const { notificationService } = require('./notification.service');
const { extensionService } = require('./extension.service');
const { ServiceError } = require('./crane.service');
const { bookingService, bookingHelpers: H } = require('./booking.service');
const billing = require('./billing');
const { paymentService } = require('./payment.service');

const C = BOOKING_CONFIG;
const r2 = (n) => Math.round(n * 100) / 100;

// My Jobs tabs: Upcoming / Active / Completed / Cancelled
const TABS = {
  upcoming: { statuses: [BOOKING_STATUS.AWAITING_OWNER, BOOKING_STATUS.AWAITING_PAYMENT, BOOKING_STATUS.CONFIRMED], label: 'Upcoming', order: [['startAt', 'ASC']] },
  active: { statuses: [BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS], label: 'In Progress', order: [['startAt', 'ASC']] },
  completed: { statuses: [BOOKING_STATUS.COMPLETED], label: 'Completed', order: [['completedAt', 'DESC']] },
  cancelled: { statuses: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.DECLINED, BOOKING_STATUS.EXPIRED], label: 'Cancelled', order: [['createdAt', 'DESC']] }
};
const tabOf = (status) => Object.keys(TABS).find((k) => TABS[k].statuses.includes(status));

const detailInclude = [...H.bookingInclude, { model: BookingRating, as: 'rating', required: false }];

/** What the customer is billed: booked amount + extra time + owner charges + GST; once finished, the frozen final amount */
const finalTotal = (b) => (b.finalAmount !== null && b.finalAmount !== undefined
  ? Number(b.finalAmount)
  : billing.billOf(b).total);

const paymentBlock = (b) => {
  const total = finalTotal(b);
  const paid = Number(b.paidAmount);
  const method = PAYMENT_METHODS.find((m) => m.id === b.paymentMethod);
  const isPaid = b.paymentStatus === 'paid';
  return {
    method: b.paymentMethod,
    method_name: method ? method.name : b.paymentMethod,
    status: b.paymentStatus,
    status_label: isPaid ? 'Paid' : (paid > 0 ? 'Advance paid' : 'Pending'),
    advance_paid: b.advancePaidAt ? Number(b.advanceAmount) : 0,
    advance_paid_at: H.iso(b.advancePaidAt),
    booking_amount: Number(b.totalAmount),
    booking_hours: b.durationHours,
    extra_minutes: b.extraMinutes,
    extra_time_amount: Number(b.extraAmount),
    final_total: total,
    charges_amount: billing.billOf(b).charges_amount,
    gst_percent: Number(b.gstPercent || 0),
    gst_amount: billing.billOf(b).gst_amount,
    breakdown: billing.breakdownLines(billing.billOf(b)),
    collected_by: b.paymentCollectedBy,
    advance_percent: b.advancePercent,
    advance_amount: Number(b.advanceAmount),
    paid_amount: paid,
    balance_due: isPaid ? 0 : r2(total - paid),
    payment_reference: b.paymentReference,
    paid_at: H.iso(b.paidAt),
    payment_methods: PAYMENT_METHODS
  };
};

const timeline = (b) => {
  const steps = [
    { key: 'booking_confirmed', label: 'Booking Confirmed', at: b.acceptedAt },
    { key: 'crane_dispatched', label: 'Crane Dispatched', at: b.enRouteAt },
    { key: 'arrived_at_site', label: 'Arrived at Site', at: b.arrivedAt },
    { key: 'job_started', label: 'Job Started', at: b.workStartedAt }
  ];
  const out = steps.map((s) => ({ key: s.key, label: s.label, at: H.iso(s.at), state: s.at ? 'done' : 'pending' }));
  if (b.status === BOOKING_STATUS.COMPLETED) {
    out.push({ key: 'job_completed', label: 'Job Completed', at: H.iso(b.completedAt), state: 'done' });
  } else if (b.status === BOOKING_STATUS.IN_PROGRESS) {
    out.push({ key: 'in_progress', label: 'In Progress', at: null, state: 'ongoing' });
  } else if (![BOOKING_STATUS.CANCELLED, BOOKING_STATUS.DECLINED, BOOKING_STATUS.EXPIRED].includes(b.status)) {
    out.push({ key: 'job_completed', label: 'Job Completed', at: null, state: 'pending' });
  }
  return out;
};

/** Job In Progress screen: elapsed time, usage against the booked time and a running estimate */
const usageBlock = (b) => {
  if (!b.workStartedAt) return null;
  const used = workingSecondsNow(b);
  const booked = Math.round((b.durationHours * 3600) + (b.extraMinutes * 60));
  const remaining = Math.max(0, booked - used);
  return {
    started_at: H.iso(b.workStartedAt),
    elapsed_seconds: used,
    booked_seconds: booked,
    used_seconds: used,
    remaining_seconds: remaining,
    overtime_seconds: Math.max(0, used - booked),
    percent_used: booked ? Math.round((used / booked) * 1000) / 10 : 0,
    overtime_warning: b.status === BOOKING_STATUS.IN_PROGRESS && !b.workEndedAt && remaining <= C.OVERTIME_WARNING_MINUTES * 60,
    // usage so far at the hourly rate, shown as "Current Estimate"
    current_estimate: {
      amount: r2((Number(b.hourlyRate) * used) / 3600),
      hourly_rate: Number(b.hourlyRate),
      note: 'Final amount may change based on actual usage and approved extra time.'
    }
  };
};

const cancellationBlock = (b) => {
  if (![BOOKING_STATUS.CANCELLED, BOOKING_STATUS.DECLINED, BOOKING_STATUS.EXPIRED].includes(b.status)) return null;
  const paid = Number(b.paidAmount);
  const byLabel = { customer: 'You (Customer)', owner: 'Crane Owner', system: 'Cranzo' };
  const declined = b.status === BOOKING_STATUS.DECLINED;
  const expired = b.status === BOOKING_STATUS.EXPIRED;
  return {
    cancelled_by: declined ? 'owner' : (expired ? 'system' : b.cancelledBy),
    cancelled_by_label: byLabel[declined ? 'owner' : (expired ? 'system' : b.cancelledBy)] || null,
    cancelled_at: H.iso(b.cancelledAt || b.declinedAt || b.expiredAt),
    reason: b.cancelReason || b.declineReason || (expired ? 'The owner did not respond in time.' : null),
    refund: {
      status: paid > 0 ? 'pending' : 'not_required',
      status_label: paid > 0 ? 'Refund pending' : 'No payment was made',
      amount: paid
    }
  };
};

class CustomerJobService {
  /** Tab badges */
  async summary(customerId) {
    await bookingService.expireStaleRequests();
    const rows = await Booking.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'n']],
      where: { customerId },
      group: ['status'],
      raw: true
    });
    const out = { upcoming: 0, active: 0, completed: 0, cancelled: 0 };
    rows.forEach((r) => {
      const tab = tabOf(r.status);
      if (tab) out[tab] += Number(r.n);
    });
    return out;
  }

  item(b) {
    const crane = b.crane;
    const tab = tabOf(b.status);
    return {
      booking_id: b.id,
      booking_code: b.bookingCode,
      status: b.status,
      status_label: BOOKING_STATUS_LABELS[b.status],
      tab,
      tab_label: tab === 'cancelled' ? BOOKING_STATUS_LABELS[b.status] : TABS[tab].label,
      stage: jobStage(b),
      crane: {
        id: crane.id,
        crane_code: crane.craneCode,
        title: H.craneTitle(crane),
        capacity_label: b.capacityInfo ? `${b.capacityInfo.dropdownName} Capacity` : null,
        primary_photo: H.primaryPhoto(crane)
      },
      location: b.siteName || b.siteAddress,
      start_at: H.iso(b.startAt),
      end_at: H.iso(b.endAt),
      amount: finalTotal(b),
      payment_status: b.paymentStatus,
      can_rate: b.status === BOOKING_STATUS.COMPLETED && !b.rating
    };
  }

  async list(customerId, input = {}) {
    await bookingService.expireStaleRequests();
    await extensionService.expireStale();
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const tab = String(input.tab || 'upcoming').toLowerCase();
    if (!TABS[tab]) throw new ServiceError('tab must be upcoming, active, completed or cancelled.');

    const { rows, count } = await Booking.findAndCountAll({
      where: { customerId, status: { [Op.in]: TABS[tab].statuses } },
      include: detailInclude,
      distinct: true,
      limit: range.limit,
      offset: range.offset,
      order: [...TABS[tab].order, ['id', 'ASC']]
    });
    return { range, items: rows.map((b) => this.item(b)), total: count };
  }

  async load(customerId, bookingId) {
    if (!H.UUID_RE.test(String(bookingId || ''))) throw new ServiceError('A valid booking_id is required.');
    const b = await Booking.findOne({ where: { id: bookingId, customerId }, include: detailInclude });
    if (!b) throw new ServiceError('Booking not found.', 404);
    return b;
  }

  /** Job Details for every tab, plus the Job In Progress, Job Completed and cancellation data */
  async get(customerId, bookingId) {
    await bookingService.expireStaleRequests();
    await extensionService.expireStale();
    return this.view(await this.load(customerId, bookingId));
  }

  async view(b) {
    const base = H.customerView(b);
    const stage = jobStage(b);
    const extension = await extensionService.blockFor(b);
    const payment = paymentBlock(b);
    const completed = b.status === BOOKING_STATUS.COMPLETED;
    const working = stage === 'working';
    const rated = b.rating || null;
    const usage = usageBlock(b);
    const totalSeconds = b.workStartedAt && b.workEndedAt ? Math.round((new Date(b.workEndedAt) - new Date(b.workStartedAt)) / 1000) : null;

    return {
      ...base,
      tab: tabOf(b.status),
      tab_label: tabOf(b.status) === 'cancelled' ? BOOKING_STATUS_LABELS[b.status] : TABS[tabOf(b.status)].label,
      stage,
      crane: {
        ...base.crane,
        capacity_label: b.capacityInfo ? `${b.capacityInfo.dropdownName} Capacity` : null,
        registration_number: b.crane.registrationNumber
      },
      timeline: timeline(b),
      // rows under "Job Timeline" on the upcoming job screen
      summary_rows: {
        booking_date: H.iso(b.createdAt),
        location: b.siteName || b.siteAddress,
        estimated_duration: base.duration.label,
        estimated_amount: billing.billOf(b).total,
        payment_status: payment.status_label
      },
      timers: timers(b),
      usage,
      extension: {
        ...extension,
        can_request: working && !extension.pending,
        options: C.EXTRA_TIME_OPTIONS,
        step_minutes: C.EXTRA_TIME_STEP_MINUTES,
        max_minutes: C.EXTRA_TIME_MAX_MINUTES,
        hourly_rate: Number(b.hourlyRate),
        response_minutes: C.EXTRA_TIME_RESPONSE_MINUTES
      },
      payment,
      job_summary: completed ? {
        started_at: H.iso(b.workStartedAt),
        completed_at: H.iso(b.completedAt),
        total_usage_seconds: totalSeconds,
        working_seconds: b.workingSeconds,
        waiting_seconds: b.waitingSeconds
      } : null,
      receipt: payment.status === 'paid' ? {
        payment_id: b.paymentReference,
        paid_at: H.iso(b.paidAt),
        booking_amount: payment.booking_amount,
        extra_time_amount: payment.extra_time_amount,
        total_amount: payment.final_total,
        // Cash on Delivery: nothing is collected online in advance, the whole amount is paid at the end
        advance_paid: 0,
        final_payment: payment.final_total,
        total_paid: payment.paid_amount,
        method_name: payment.method_name
      } : null,
      cancellation: cancellationBlock(b),
      // "Book Again" pre-fills the booking steps with this
      rebook: {
        crane_id: b.craneId,
        crane_type: b.craneType,
        capacity: b.capacity,
        latitude: H.num(b.latitude),
        longitude: H.num(b.longitude),
        site_name: b.siteName,
        site_address: b.siteAddress,
        duration: { type: b.durationType, hours: b.durationType === 'hours' ? b.durationHours : null, days: b.durationDays }
      },
      rating: rated ? { rated: true, rating: rated.rating, comment: rated.comment } : { rated: false, rating: null, comment: null },
      actions: {
        can_cancel: [BOOKING_STATUS.AWAITING_OWNER, BOOKING_STATUS.AWAITING_PAYMENT, BOOKING_STATUS.CONFIRMED].includes(b.status),
        // changing a booking (date, time, duration) is not built yet
        can_modify: false,
        can_track: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS].includes(b.status) && !!b.operatorId,
        can_confirm_arrival: !!b.arrivedAt && !b.arrivalConfirmedAt && b.status === BOOKING_STATUS.EN_ROUTE,
        can_request_extra_time: working && !extension.pending,
        can_pay: completed && payment.status !== 'paid',
        can_rate: completed && !rated,
        can_view_receipt: payment.status === 'paid'
      }
    };
  }

  /** Track My Cranes: every crane of mine that is on the way or working */
  async activeTracking(customerId) {
    await bookingService.expireStaleRequests();
    const rows = await Booking.findAll({
      where: { customerId, status: { [Op.in]: [BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS] } },
      include: H.bookingInclude,
      order: [['startAt', 'ASC']]
    });
    const tag = { en_route: 'On the way', arrived: 'Arrived', working: 'In Progress' };
    return rows.map((b) => {
      const t = bookingService.buildTrack(b);
      return {
        booking_id: b.id,
        booking_code: b.bookingCode,
        crane: { id: b.crane.id, crane_code: b.crane.craneCode, title: H.craneTitle(b.crane), primary_photo: H.primaryPhoto(b.crane) },
        operator: t.operator ? { full_name: t.operator.full_name, rating: t.operator.rating, reviews_count: t.operator.reviews_count } : null,
        stage: t.stage,
        tag: tag[t.stage] || t.status_label,
        distance_km: t.distance_km,
        eta_minutes: t.eta_minutes,
        crane_location: t.crane_location
      };
    });
  }

  /** Complete Final Payment. Cash on Delivery is the only live method, the customer confirms the cash payment. */
  async pay(customerId, bookingId, methodId) {
    const b = await this.load(customerId, bookingId);
    if (b.status !== BOOKING_STATUS.COMPLETED) throw new ServiceError('You can pay once the job is completed.', 409);
    if (b.paymentStatus === 'paid') throw new ServiceError('This booking is already paid.', 409);

    const id = String(methodId || 'COD').toUpperCase();
    const method = PAYMENT_METHODS.find((m) => m.id === id);
    if (!method) throw new ServiceError('payment_method is not valid.');
    if (!method.enabled) throw new ServiceError(`${method.name} is not available yet. Please choose Cash on Delivery.`);

    const grandTotal = finalTotal(b);
    // only what is left after the advance (paid online) is collected now
    const total = r2(Math.max(0, grandTotal - Number(b.paidAmount || 0)));
    // every payment goes into the ledger; cash is collected on site by the owner's side
    const tx = await paymentService.record({ booking: b, amount: total, method: id, status: 'success' });
    await b.update({
      paymentMethod: id,
      paymentStatus: 'paid',
      paidAmount: grandTotal,
      paymentReference: tx.transactionCode,
      paymentCollectedBy: Number(b.platformCollectedAmount || 0) > 0 ? 'mixed' : tx.collectedBy,
      platformCollectedAmount: r2(Number(b.platformCollectedAmount || 0) + (tx.collectedBy === 'platform' ? total : 0)),
      paidAt: tx.createdAt
    });

    for (const userId of [b.ownerId, b.operatorId]) {
      if (!userId) continue;
      // eslint-disable-next-line no-await-in-loop
      await notificationService.notify(userId, {
        type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
        title: 'Payment Received',
        body: `${b.bookingCode}: the customer paid ₹${total} (${method.name}).`,
        data: { booking_id: b.id, booking_code: b.bookingCode }
      });
    }
    await notificationService.notify(customerId, {
      type: 'payment_success',
      title: 'Payment Successful',
      body: `Your final payment of ₹${total} was completed.`,
      data: { booking_id: b.id, booking_code: b.bookingCode }
    });
    await notificationService.notify(customerId, {
      type: 'receipt_ready',
      title: 'Receipt Generated',
      body: `Your invoice for booking ${b.bookingCode} is ready.`,
      data: { booking_id: b.id, booking_code: b.bookingCode }
    });
    return this.get(customerId, bookingId);
  }

  /** Rate Your Experience (1 to 5 stars). The same rating counts for the crane, the operator and the provider. */
  async rate(customerId, bookingId, input = {}) {
    const b = await this.load(customerId, bookingId);
    if (b.status !== BOOKING_STATUS.COMPLETED) throw new ServiceError('You can rate a completed job.', 409);
    if (b.rating) throw new ServiceError('You have already rated this booking.', 409);
    const stars = Number(input.rating);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new ServiceError('rating must be a whole number from 1 to 5.');

    await BookingRating.create({
      bookingId: b.id,
      customerId,
      craneId: b.craneId,
      operatorId: b.operatorId,
      ownerId: b.ownerId,
      rating: stars,
      comment: input.comment ? String(input.comment).trim().slice(0, 1000) : null
    });

    const refresh = async (model, key, id) => {
      if (!id) return;
      const [row] = await BookingRating.findAll({
        where: { [key]: id },
        attributes: [[fn('AVG', col('rating')), 'avg'], [fn('COUNT', col('id')), 'n']],
        raw: true
      });
      await model.update(
        { ratingAverage: Math.round(Number(row.avg) * 100) / 100, ratingCount: Number(row.n) },
        { where: { id } }
      );
    };
    await refresh(Crane, 'craneId', b.craneId);
    await refresh(User, 'operatorId', b.operatorId);
    await refresh(User, 'ownerId', b.ownerId);

    return this.get(customerId, bookingId);
  }

  // ---- extra time (customer side) ----
  async requestExtraTime(customerId, bookingId, input) {
    const ext = await extensionService.request(customerId, bookingId, input);
    return { extension: ext, booking: await this.get(customerId, bookingId) };
  }

  async cancelExtraTime(customerId, bookingId) {
    const ext = await extensionService.cancel(customerId, bookingId);
    return { extension: ext, booking: await this.get(customerId, bookingId) };
  }
}

module.exports = { customerJobService: new CustomerJobService() };
