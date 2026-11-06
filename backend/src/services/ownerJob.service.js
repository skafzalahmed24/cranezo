const { Op } = require('sequelize');
const { Booking, Crane, JobPhoto, JobIssue, StaticDropdown } = require('../models');
const { BOOKING_STATUS, BOOKING_STATUS_LABELS, BOOKING_CONFIG } = require('../constants/booking');
const { JOB_CONFIG, STAGE_LABELS, jobStage, timers, progressSteps, waitingSecondsNow, workingSecondsNow } = require('../constants/job');
const { parseRange } = require('../utils/range');
const { ServiceError } = require('./crane.service');
const { bookingService, bookingHelpers: H } = require('./booking.service');
const billing = require('./billing');
const { notificationService } = require('./notification.service');

const OFFSET_MS = JOB_CONFIG.IST_OFFSET_MINUTES * 60000;
const DAY_MS = 24 * 3600 * 1000;
const r2 = (n) => Math.round(n * 100) / 100;

// Jobs screen tabs: New Requests / Upcoming / Active / Completed (+ closed for declined, expired, cancelled)
const TABS = {
  new_requests: { statuses: [BOOKING_STATUS.AWAITING_OWNER], label: 'New Request', order: [['createdAt', 'DESC']], oldest: [['createdAt', 'ASC']] },
  upcoming: { statuses: [BOOKING_STATUS.AWAITING_PAYMENT, BOOKING_STATUS.CONFIRMED], label: 'Upcoming', order: [['startAt', 'ASC']], oldest: [['startAt', 'DESC']] },
  active: { statuses: [BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS], label: 'Active', order: [['startAt', 'ASC']], oldest: [['startAt', 'DESC']] },
  completed: { statuses: [BOOKING_STATUS.COMPLETED], label: 'Completed', order: [['completedAt', 'DESC']], oldest: [['completedAt', 'ASC']] },
  closed: { statuses: [BOOKING_STATUS.DECLINED, BOOKING_STATUS.EXPIRED, BOOKING_STATUS.CANCELLED], label: 'Closed', order: [['createdAt', 'DESC']], oldest: [['createdAt', 'ASC']] }
};
const tabOf = (status) => Object.keys(TABS).find((k) => TABS[k].statuses.includes(status));

const fullInclude = [
  ...H.bookingInclude,
  { model: JobPhoto, as: 'jobPhotos', required: false },
  { model: JobIssue, as: 'issues', required: false, include: [{ model: StaticDropdown, as: 'breakdownTypeInfo', attributes: ['id', 'dropdownName'] }] }
];

const minutesBetween = (a, b) => Math.max(0, Math.round((new Date(a) - new Date(b)) / 60000));

/**
 * What the owner earns from one job (services/billing.js). Completed jobs use their frozen amounts.
 * net = what the owner receives after the platform fee; share = what the owner keeps after commission and GST.
 */
const jobMoney = (b, feePercent) => {
  const bill = billing.billOf(b, feePercent);
  const deductions = Number(b.deductionsAmount || 0);
  return {
    gross: bill.total,
    platform_fee_percent: bill.platform_fee_percent,
    platform_fee: bill.platform_fee,
    other_deductions: deductions,
    net: r2(bill.owner_receives - deductions),
    gst: bill.gst_amount,
    commission: bill.operator_commission.amount,
    share: r2(bill.owner_share - deductions)
  };
};

const sumMoney = (rows, feePercent) => rows.reduce((acc, b) => {
  const m = jobMoney(b, feePercent);
  acc.gross = r2(acc.gross + m.gross);
  acc.platform_fee = r2(acc.platform_fee + m.platform_fee);
  acc.other_deductions = r2(acc.other_deductions + m.other_deductions);
  acc.net = r2(acc.net + m.net);
  acc.gst = r2(acc.gst + m.gst);
  acc.commission = r2(acc.commission + m.commission);
  acc.share = r2(acc.share + m.share);
  acc.jobs += 1;
  return acc;
}, { gross: 0, platform_fee: 0, other_deductions: 0, net: 0, gst: 0, commission: 0, share: 0, jobs: 0 });

/** Cash jobs: the owner holds the money and owes the platform fee. Online jobs: the platform holds it and owes the owner. */
const platformBalance = (rows, fee) => {
  const open = rows.filter((b) => b.settlementStatus !== 'settled' && b.paymentStatus === 'paid');
  // per job: money the platform holds (online / advance) minus its fee; + platform pays, - owner pays
  const lines = open.map((b) => billing.platformBalanceOf(b, billing.billOf(b, fee)));
  const owedToPlatform = r2(lines.filter((v) => v < 0).reduce((s, v) => s - v, 0));
  const owedToOwner = r2(lines.filter((v) => v > 0).reduce((s, v) => s + v, 0));
  const balance = r2(owedToOwner - owedToPlatform);
  return {
    you_owe_platform: owedToPlatform,
    platform_owes_you: owedToOwner,
    balance,
    balance_label: balance > 0 ? 'Platform will pay you' : (balance < 0 ? 'You pay the platform' : 'Nothing due'),
    cash_jobs: lines.filter((v) => v < 0).length,
    online_jobs: lines.filter((v) => v > 0).length,
    unpaid_jobs: rows.filter((b) => b.paymentStatus !== 'paid').length
  };
};

// ---- India time helpers (the apps show India dates) ----
const startOfDay = (date) => {
  const local = new Date(date.getTime() + OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - OFFSET_MS);
};
const startOfWeek = (date) => {
  const day = startOfDay(date);
  const dow = new Date(day.getTime() + OFFSET_MS).getUTCDay(); // 0 = Sunday
  return new Date(day.getTime() - ((dow + 6) % 7) * DAY_MS);
};
const startOfMonth = (date, monthsBack = 0) => {
  const local = new Date(date.getTime() + OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - monthsBack, 1) - OFFSET_MS);
};
const localDateKey = (date) => new Date(new Date(date).getTime() + OFFSET_MS).toISOString().slice(0, 10);
const localMonthKey = (date) => localDateKey(date).slice(0, 7);
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const periodRange = (key, now) => {
  const today = startOfDay(now);
  switch (key) {
    case 'today': return { from: today, to: new Date(today.getTime() + DAY_MS), prev: { from: new Date(today.getTime() - DAY_MS), to: today, label: 'yesterday' } };
    case 'week': {
      const from = startOfWeek(now);
      return { from, to: new Date(from.getTime() + 7 * DAY_MS), prev: { from: new Date(from.getTime() - 7 * DAY_MS), to: from, label: 'last week' } };
    }
    case 'month': {
      const from = startOfMonth(now);
      return { from, to: startOfMonth(now, -1), prev: { from: startOfMonth(now, 1), to: from, label: 'last month' } };
    }
    case 'all': return { from: new Date(0), to: new Date(now.getTime() + 365 * DAY_MS), prev: null };
    default: throw new ServiceError('period must be today, week, month or all.');
  }
};

const inRange = (rows, from, to) => rows.filter((b) => b.completedAt >= from && b.completedAt < to);

class OwnerJobService {
  // ---------------------------------------------------------------- Jobs screen

  /** Tab badges: New Requests (n), Upcoming (n), Active (n), Completed */
  async summary(ownerId) {
    await bookingService.expireStaleRequests();
    const rows = await Booking.findAll({
      attributes: ['status', [Booking.sequelize.fn('COUNT', Booking.sequelize.col('id')), 'n']],
      where: { ownerId },
      group: ['status'],
      raw: true
    });
    const out = { new_requests: 0, upcoming: 0, active: 0, completed: 0, closed: 0 };
    rows.forEach((r) => {
      const tab = tabOf(r.status);
      if (tab) out[tab] += Number(r.n);
    });
    return out;
  }

  item(b, now = new Date()) {
    const status = b.status;
    const crane = b.crane;
    const tab = tabOf(status);
    const startedAt = b.workStartedAt || b.enRouteAt;
    const operator = b.operator ? {
      id: b.operator.id,
      full_name: b.operator.fullName,
      member_id: b.operator.memberId,
      profile_image: b.operator.profileImage,
      mobile_number: b.operator.mobileNumber,
      country_code: b.operator.countryCode,
      rating: null,
      reviews_count: 0
    } : null;
    const stage = jobStage(b);
    const completed = status === BOOKING_STATUS.COMPLETED;
    const totalSeconds = b.workStartedAt && b.workEndedAt ? Math.round((new Date(b.workEndedAt) - new Date(b.workStartedAt)) / 1000) : null;

    return {
      booking_id: b.id,
      booking_code: b.bookingCode,
      status,
      status_label: BOOKING_STATUS_LABELS[status],
      tab,
      tab_label: TABS[tab] ? TABS[tab].label : BOOKING_STATUS_LABELS[status],
      stage,
      stage_label: STAGE_LABELS[stage],
      crane: {
        id: crane.id,
        crane_code: crane.craneCode,
        title: H.craneTitle(crane),
        model_name: crane.modelName,
        primary_photo: H.primaryPhoto(crane)
      },
      location: { name: b.siteName, address: b.siteAddress, distance_km: H.num(b.distanceKm) },
      schedule: { start_type: b.startType, start_at: H.iso(b.startAt), end_at: H.iso(b.endAt) },
      duration_label: H.durationLabel(b),
      approx_earnings: H.num(b.totalAmount) + Number(b.extraAmount),
      // "2m ago", "Starts in 2h", "Started 2h 15m ago"
      requested_ago_minutes: status === BOOKING_STATUS.AWAITING_OWNER ? minutesBetween(now, b.createdAt) : null,
      seconds_left: status === BOOKING_STATUS.AWAITING_OWNER && b.requestExpiresAt
        ? Math.max(0, Math.round((new Date(b.requestExpiresAt) - now) / 1000))
        : null,
      starts_in_minutes: status === BOOKING_STATUS.CONFIRMED ? Math.max(0, Math.round((new Date(b.startAt) - now) / 60000)) : null,
      started_at: H.iso(startedAt),
      started_ago_minutes: startedAt && !completed ? minutesBetween(now, startedAt) : null,
      can_respond: status === BOOKING_STATUS.AWAITING_OWNER,
      operator,
      operator_label: !operator ? 'Not assigned' : (b.operatorStatus === 1 ? 'Assigned' : 'Awaiting operator'),
      progress: [BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS].includes(status) ? progressSteps(b) : null,
      timers: [BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS].includes(status) ? timers(b, now) : null,
      completed_at: H.iso(b.completedAt),
      actual_duration_seconds: completed ? totalSeconds : null,
      final_amount: completed ? jobMoney(b).gross : null
    };
  }

  async list(ownerId, input = {}) {
    await bookingService.expireStaleRequests();
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const tab = String(input.tab || 'new_requests').toLowerCase();
    if (!TABS[tab]) throw new ServiceError('tab must be new_requests, upcoming, active, completed or closed.');
    const oldestFirst = String(input.sort || 'newest').toLowerCase() === 'oldest';

    const { rows, count } = await Booking.findAndCountAll({
      where: { ownerId, status: { [Op.in]: TABS[tab].statuses } },
      include: H.bookingInclude,
      distinct: true,
      limit: range.limit,
      offset: range.offset,
      order: [...(oldestFirst ? TABS[tab].oldest : TABS[tab].order), ['id', 'ASC']]
    });
    const now = new Date();
    return { range, items: rows.map((b) => this.item(b, now)), total: count };
  }

  // ---------------------------------------------------------------- Job details

  async load(ownerId, bookingId) {
    if (!H.UUID_RE.test(String(bookingId || ''))) throw new ServiceError('A valid booking_id is required.');
    const b = await Booking.findOne({
      where: { id: bookingId, ownerId },
      include: fullInclude,
      order: [[{ model: JobPhoto, as: 'jobPhotos' }, 'id', 'ASC']]
    });
    if (!b) throw new ServiceError('Job not found.', 404);
    return b;
  }

  timeline(b) {
    const steps = [
      { key: 'request_received', label: 'Request Received', at: b.createdAt },
      { key: 'owner_accepted', label: 'Owner Accepted', at: b.acceptedAt },
      { key: 'operator_notified', label: 'Operator Notified', at: b.operatorId ? b.acceptedAt : null },
      { key: 'en_route', label: 'En Route', at: b.enRouteAt },
      { key: 'arrived', label: 'Arrived at Site', at: b.arrivedAt },
      { key: 'working', label: 'Working', at: b.workStartedAt },
      { key: 'completed', label: 'Completed', at: b.completedAt }
    ];
    // the last finished step is the "current" one (yellow dot in the design) until the job is completed
    let lastDone = -1;
    steps.forEach((s, i) => { if (s.at) lastDone = i; });
    return steps.map((s, i) => ({
      key: s.key,
      label: s.label,
      at: H.iso(s.at),
      state: !s.at ? 'pending' : (i === lastDone && !b.completedAt ? 'current' : 'done')
    }));
  }

  async get(ownerId, bookingId) {
    await bookingService.expireStaleRequests();
    const b = await this.load(ownerId, bookingId);
    const base = this.item(b);
    const crane = b.crane;
    const completed = b.status === BOOKING_STATUS.COMPLETED;
    const confirmed = b.status >= BOOKING_STATUS.CONFIRMED && b.status !== BOOKING_STATUS.CANCELLED;
    const photos = b.jobPhotos || [];
    const feePercent = await billing.platformFeePercent();
    const money = completed ? jobMoney(b, feePercent) : null;
    const bill = billing.billOf(b, feePercent);
    const typeName = b.craneTypeInfo ? b.craneTypeInfo.dropdownName : null;
    const capName = b.capacityInfo ? b.capacityInfo.dropdownName : null;

    return {
      ...base,
      accepted_at: H.iso(b.acceptedAt),
      crane: {
        ...base.crane,
        capacity_name: capName,
        crane_type_name: typeName,
        fuel_type_name: crane.fuelTypeInfo ? crane.fuelTypeInfo.dropdownName : null,
        registration_number: crane.registrationNumber
      },
      job_location: {
        name: b.siteName,
        address: b.siteAddress,
        latitude: H.num(b.latitude),
        longitude: H.num(b.longitude),
        distance_km: H.num(b.distanceKm)
      },
      duration: { type: b.durationType, service_type: H.SERVICE_TYPE[b.durationType], hours: b.durationHours, days: b.durationDays, label: H.durationLabel(b) },
      // operators are per job; the crane's usual operator is offered first in the picker
      suggested_operator: crane.operator ? {
        id: crane.operator.id,
        full_name: crane.operator.fullName,
        member_id: crane.operator.memberId
      } : null,
      // who to call at the site when the customer booked for someone else
      site_contact: b.contactName || b.contactPhone ? { name: b.contactName, phone: b.contactPhone } : null,
      assigned_operator: base.operator ? {
        ...base.operator,
        role_label: capName ? `${capName} Crane Operator` : 'Crane Operator',
        tag: base.operator_label
      } : null,
      customer: b.customer ? {
        name: b.customer.companyName || b.customer.fullName,
        mobile_number: confirmed ? b.customer.mobileNumber : null,
        country_code: confirmed ? b.customer.countryCode : null
      } : null,
      special_requirements: b.specialRequirements,
      payment: H.paymentView(b),
      // waiting for the customer's advance: the same countdown the customer sees
      advance_due: b.status === BOOKING_STATUS.AWAITING_PAYMENT && b.paymentDueAt ? {
        amount: Number(b.advanceAmount),
        due_at: H.iso(b.paymentDueAt),
        seconds_left: Math.max(0, Math.round((new Date(b.paymentDueAt).getTime() - Date.now()) / 1000)),
        extended: !!b.paymentExtendedAt
      } : null,
      transactions: await require('./payment.service').paymentService.forBooking(b.id),
      // transparent breakdown: customer bill, platform fee, operator commission, GST, owner's share
      bill: {
        lines: billing.breakdownLines(bill, { audience: 'owner' }),
        total: bill.total,
        platform_fee_percent: bill.platform_fee_percent,
        platform_fee: bill.platform_fee,
        owner_receives: bill.owner_receives,
        gst_amount: bill.gst_amount,
        owner_share: bill.owner_share,
        final: bill.final
      },
      operator_commission: {
        ...bill.operator_commission,
        can_edit: !!b.operatorId && b.operatorSettlementStatus !== 'settled'
          && ![BOOKING_STATUS.CANCELLED, BOOKING_STATUS.DECLINED, BOOKING_STATUS.EXPIRED].includes(b.status),
        settlement_status: b.operatorSettlementStatus,
        settled_at: H.iso(b.operatorSettledAt),
        // the job value a % commission is taken from (crane hire + extra time + distance)
        job_value: bill.subtotal,
        types: billing.COMMISSION_TYPES.map((t) => ({ id: t, name: billing.COMMISSION_LABELS[t] }))
      },
      timeline: this.timeline(b),
      timers: timers(b),
      progress: progressSteps(b),
      // Job Monitoring screen
      monitoring: [BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS].includes(b.status) ? {
        start_time: H.iso(b.workStartedAt || b.enRouteAt),
        working_seconds: workingSecondsNow(b),
        waiting_seconds: waitingSecondsNow(b),
        extra_seconds: b.extraMinutes * 60,
        message: 'The job is in progress. You will be notified when it is completed.'
      } : null,
      // Completed job details
      completion: completed ? {
        scheduled_at: H.iso(b.startAt),
        actual_duration_seconds: base.actual_duration_seconds,
        working_seconds: b.workingSeconds,
        waiting_seconds: b.waitingSeconds,
        extra_seconds: b.extraMinutes * 60,
        earnings_summary: {
          base_amount: H.num(b.totalAmount),
          extra_time_amount: Number(b.extraAmount),
          final_amount: money.gross,
          platform_fee_percent: money.platform_fee_percent,
          platform_fee: money.platform_fee,
          other_deductions: money.other_deductions,
          net_amount: money.net,
          gst_amount: money.gst,
          operator_commission: money.commission,
          owner_share: money.share
        },
        settlement: { status: b.settlementStatus, label: b.settlementStatus === 'settled' ? 'Paid' : 'Pending', settled_at: H.iso(b.settledAt) }
      } : null,
      evidence: {
        site_photos: photos.filter((p) => p.kind === 'site').length,
        final_photos: photos.filter((p) => p.kind === 'final').length,
        issues: (b.issues || []).length,
        has_notes: !!b.jobNotes
      },
      can_view_live_location: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS].includes(b.status),
      can_view_evidence: completed || photos.length > 0,
      // invoices (PDF) are not generated yet
      can_download_invoice: false,
      created_at: H.iso(b.createdAt)
    };
  }

  /** View Live Location: same payload the customer polls */
  async track(ownerId, bookingId) {
    await bookingService.expireStaleRequests();
    return bookingService.buildTrack(await bookingService.mine(bookingId, { ownerId }));
  }

  /** View Job Evidence: photos, notes and anything the operator reported */
  async evidence(ownerId, bookingId) {
    const b = await this.load(ownerId, bookingId);
    const photos = b.jobPhotos || [];
    const photo = (p) => ({ id: p.id, photo_url: p.photoUrl, latitude: H.num(p.latitude), longitude: H.num(p.longitude), captured_at: H.iso(p.capturedAt) });
    return {
      booking_id: b.id,
      booking_code: b.bookingCode,
      site_photos: photos.filter((p) => p.kind === 'site').map(photo),
      final_photos: photos.filter((p) => p.kind === 'final').map(photo),
      job_notes: b.jobNotes,
      arrival: { arrived_at: H.iso(b.arrivedAt), confirmed_at: H.iso(b.arrivalConfirmedAt), confirmed_by: b.arrivalConfirmedBy },
      checklist_completed_at: H.iso(b.checklistCompletedAt),
      issues: (b.issues || []).map((i) => ({
        id: i.id,
        kind: i.kind,
        breakdown_type_name: i.breakdownTypeInfo ? i.breakdownTypeInfo.dropdownName : null,
        description: i.description,
        photos: i.photos || [],
        latitude: H.num(i.latitude),
        longitude: H.num(i.longitude),
        status: i.status,
        reported_at: H.iso(i.createdAt)
      }))
    };
  }

  // ---------------------------------------------------------------- Home dashboard (live numbers)

  /** Owner Home: fleet overview, today's jobs and earnings, and things waiting for the owner */
  async home(ownerId) {
    await bookingService.expireStaleRequests();
    const now = new Date();
    const today = startOfDay(now);
    const tomorrow = new Date(today.getTime() + DAY_MS);
    const cranes = await Crane.findAll({ where: { ownerId }, attributes: ['id', 'approvalStatus', 'availabilityStatus', 'isActive'] });
    const busyRows = await Booking.findAll({
      where: { ownerId, status: { [Op.in]: [BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS] } },
      attributes: ['craneId']
    });
    const busy = new Set(busyRows.map((b) => b.craneId));
    const verified = cranes.filter((c) => c.approvalStatus === 1 && c.isActive === 0);
    const fee = await billing.platformFeePercent();
    const completedToday = await Booking.findAll({
      where: { ownerId, status: BOOKING_STATUS.COMPLETED, completedAt: { [Op.gte]: today, [Op.lt]: tomorrow } }
    });
    const { craneRequestService } = require('./craneRequest.service');
    const requests = await craneRequestService.ownerList(ownerId).catch(() => ({ items: [] }));
    return {
      fleet: {
        total_cranes: cranes.length,
        available_cranes: verified.filter((c) => c.availabilityStatus === 0 && !busy.has(c.id)).length,
        busy_cranes: busy.size,
        pending_verification: cranes.filter((c) => c.approvalStatus === 0).length
      },
      todays_jobs: await Booking.count({
        where: {
          ownerId,
          status: { [Op.in]: [BOOKING_STATUS.AWAITING_PAYMENT, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.COMPLETED] },
          startAt: { [Op.gte]: today, [Op.lt]: tomorrow }
        }
      }),
      todays_earnings: sumMoney(completedToday, fee).net,
      crane_requests: requests.items.length,
      jobs_needing_operator: await Booking.count({
        where: { ownerId, operatorId: null, status: { [Op.in]: [BOOKING_STATUS.AWAITING_PAYMENT, BOOKING_STATUS.CONFIRMED] } }
      })
    };
  }

  // ---------------------------------------------------------------- Operator commission

  /** Set or edit the operator's commission on one job (percent of job amount, per km, or fixed) */
  async setCommission(ownerId, input = {}) {
    const b = await this.load(ownerId, input.booking_id);
    if (!b.operatorId) throw new ServiceError('Assign an operator before setting the commission.', 409);
    if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.DECLINED, BOOKING_STATUS.EXPIRED].includes(b.status)) {
      throw new ServiceError('This job is closed.', 409);
    }
    if (b.operatorSettlementStatus === 'settled') throw new ServiceError('This commission is already paid to the operator.', 409);
    const { type, value } = billing.cleanCommission(input.type, input.value);
    if (type === 'per_km' && !(Number(b.distanceKm) > 0)) throw new ServiceError('This job has no distance, so per km cannot be used.');

    const changes = { operatorCommissionType: type, operatorCommissionValue: value };
    if (b.completedAt) {
      // a completed job keeps its other frozen amounts; only the commission and the owner's share move
      const plain = { ...b.get({ plain: true }), ...changes, operatorCommissionAmount: null };
      const bill = billing.billOf(plain, Number(b.platformFeePercent));
      changes.operatorCommissionAmount = bill.operator_commission.amount;
      changes.ownerShareAmount = r2(bill.owner_receives - bill.operator_commission.amount - bill.gst_amount);
    }
    await b.update(changes);
    const amount = billing.billOf(b.get({ plain: true })).operator_commission.amount;
    await notificationService.notify(b.operatorId, {
      type: 'commission_updated',
      title: 'Your Earnings Updated',
      body: `${b.bookingCode}: you will earn ₹${amount} for this job.`,
      data: { booking_id: b.id, booking_code: b.bookingCode }
    });
    return this.get(ownerId, b.id);
  }

  // ---------------------------------------------------------------- Earnings

  async completedRows(ownerId, since = null) {
    const where = { ownerId, status: BOOKING_STATUS.COMPLETED, completedAt: { [Op.ne]: null } };
    if (since) where.completedAt = { [Op.gte]: since };
    return Booking.findAll({
      where,
      attributes: ['id', 'finalAmount', 'totalAmount', 'extraAmount', 'charges', 'gstPercent', 'distanceKm', 'platformFeePercent', 'platformFeeAmount',
        'deductionsAmount', 'netAmount', 'completedAt', 'settlementStatus', 'settledAt', 'paymentStatus', 'paymentCollectedBy',
        'paidAmount', 'platformCollectedAmount', 'distanceCharge',
        'operatorCommissionType', 'operatorCommissionValue', 'operatorCommissionAmount', 'operatorSettlementStatus']
    });
  }

  async earningsSummary(ownerId, input = {}) {
    const key = String(input.period || 'today').toLowerCase();
    const now = new Date();
    const range = periodRange(key, now);
    const rows = await this.completedRows(ownerId);
    const fee = await billing.platformFeePercent();
    const sum = (list) => sumMoney(list, fee);

    const current = sum(inRange(rows, range.from, range.to));
    let compared = null;
    if (range.prev) {
      const previous = sum(inRange(rows, range.prev.from, range.prev.to));
      compared = {
        label: range.prev.label,
        previous_net: previous.net,
        change_percent: previous.net > 0 ? Math.round(((current.net - previous.net) / previous.net) * 100) : null
      };
    }

    const card = (k) => { const r = periodRange(k, now); const s = sum(inRange(rows, r.from, r.to)); return { net: s.net, jobs: s.jobs }; };

    const settled = rows.filter((b) => b.settlementStatus === 'settled');
    const pending = rows.filter((b) => b.settlementStatus !== 'settled');
    const lastSettled = settled.reduce((max, b) => (b.settledAt && (!max || b.settledAt > max) ? b.settledAt : max), null);
    const firstPending = pending.reduce((min, b) => (!min || b.completedAt < min ? b.completedAt : min), null);
    const expectedBy = firstPending ? new Date(new Date(firstPending).getTime() + BOOKING_CONFIG.SETTLEMENT_DAYS * DAY_MS) : null;

    return {
      period: {
        key,
        from: key === 'all' ? null : H.iso(range.from),
        to: key === 'all' ? null : H.iso(new Date(range.to.getTime() - 1))
      },
      earnings: {
        gross_earnings: current.gross,
        platform_fee_percent: fee,
        platform_fee: current.platform_fee,
        other_deductions: current.other_deductions,
        net_earnings: current.net,
        gst_collected: current.gst,
        operator_commission: current.commission,
        owner_share: current.share
      },
      jobs_completed: current.jobs,
      compared_to_previous: compared,
      cards: { today: card('today'), week: card('week'), month: card('month'), all: card('all') },
      // platform settlement: cash jobs -> the owner owes the platform fee; online jobs -> the platform owes the owner
      platform_balance: platformBalance(rows, fee),
      operator_commission_due: {
        amount: sum(rows.filter((b) => b.operatorSettlementStatus !== 'settled' && b.operatorCommissionType)).commission,
        jobs: rows.filter((b) => b.operatorSettlementStatus !== 'settled' && b.operatorCommissionType).length
      },
      settlement: {
        settled: { amount: sum(settled).net, jobs: settled.length, last_settled_at: H.iso(lastSettled) },
        pending: {
          amount: sum(pending).net,
          jobs: pending.length,
          expected_by: H.iso(expectedBy),
          expected_in_days: expectedBy ? Math.max(0, Math.ceil((expectedBy - now) / DAY_MS)) : null
        }
      }
    };
  }

  /** Earnings Trend chart: week (last 7 days), month (this month, by day), year (last 12 months) */
  async earningsTrend(ownerId, input = {}) {
    const range = String(input.range || 'month').toLowerCase();
    const now = new Date();
    let since;
    let buckets;

    if (range === 'week') {
      const today = startOfDay(now);
      since = new Date(today.getTime() - 6 * DAY_MS);
      buckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(since.getTime() + i * DAY_MS);
        const local = new Date(d.getTime() + OFFSET_MS);
        return { key: localDateKey(d), label: WEEKDAYS[local.getUTCDay()] };
      });
    } else if (range === 'month') {
      since = startOfMonth(now);
      const days = Math.round((startOfDay(now) - since) / DAY_MS) + 1;
      buckets = Array.from({ length: days }, (_, i) => {
        const d = new Date(since.getTime() + i * DAY_MS);
        return { key: localDateKey(d), label: String(i + 1) };
      });
    } else if (range === 'year') {
      since = startOfMonth(now, 11);
      buckets = Array.from({ length: 12 }, (_, i) => {
        const d = startOfMonth(now, 11 - i);
        const local = new Date(d.getTime() + OFFSET_MS);
        return { key: localMonthKey(d), label: MONTHS[local.getUTCMonth()] };
      });
    } else {
      throw new ServiceError('range must be week, month or year.');
    }

    const rows = await this.completedRows(ownerId, since);
    const fee = await billing.platformFeePercent();
    const keyOf = range === 'year' ? localMonthKey : localDateKey;
    const data = buckets.map((bk) => {
      const s = sumMoney(rows.filter((b) => keyOf(b.completedAt) === bk.key), fee);
      return { key: bk.key, label: bk.label, net: s.net, gross: s.gross, jobs: s.jobs };
    });
    const peak = data.reduce((best, d) => (d.net > (best ? best.net : 0) ? d : best), null);
    return { range, points: data, peak, total_net: r2(data.reduce((n, d) => n + d.net, 0)) };
  }

  /** Recent Completed Jobs */
  async earningsJobs(ownerId, input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const { rows, count } = await Booking.findAndCountAll({
      where: { ownerId, status: BOOKING_STATUS.COMPLETED },
      include: H.bookingInclude,
      distinct: true,
      limit: range.limit,
      offset: range.offset,
      order: [['completedAt', 'DESC'], ['id', 'ASC']]
    });
    const fee = await billing.platformFeePercent();
    const items = rows.map((b) => {
      const m = jobMoney(b, fee);
      return {
        booking_id: b.id,
        booking_code: b.bookingCode,
        crane: { crane_code: b.crane.craneCode, title: H.craneTitle(b.crane), primary_photo: H.primaryPhoto(b.crane) },
        location: b.siteName || b.siteAddress,
        completed_at: H.iso(b.completedAt),
        // how long the crane worked (Recent Completed Jobs: "8h 10m")
        duration_seconds: b.workStartedAt && b.workEndedAt ? Math.round((new Date(b.workEndedAt) - new Date(b.workStartedAt)) / 1000) : (b.durationHours ? b.durationHours * 3600 : null),
        amount: m.gross,
        net_amount: m.net,
        platform_fee: m.platform_fee,
        gst_amount: m.gst,
        operator_commission: m.commission,
        owner_share: m.share,
        operator: b.operator ? { id: b.operator.id, full_name: b.operator.fullName } : null,
        payment_status: b.paymentStatus,
        payment_collected_by: b.paymentCollectedBy,
        settlement_status: b.settlementStatus,
        settlement_label: b.settlementStatus === 'settled' ? 'Settled' : 'Pending',
        operator_settlement_status: b.operatorSettlementStatus,
        operator_settlement_label: b.operatorSettlementStatus === 'settled' ? 'Paid' : 'Pending'
      };
    });
    return { range, items, total: count };
  }
}

module.exports = { ownerJobService: new OwnerJobService() };
