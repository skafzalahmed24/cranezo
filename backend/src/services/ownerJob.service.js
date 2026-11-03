const { Op } = require('sequelize');
const { Booking, JobPhoto, JobIssue, StaticDropdown } = require('../models');
const { BOOKING_STATUS, BOOKING_STATUS_LABELS, BOOKING_CONFIG } = require('../constants/booking');
const { JOB_CONFIG, STAGE_LABELS, jobStage, timers, progressSteps, waitingSecondsNow, workingSecondsNow } = require('../constants/job');
const { parseRange } = require('../utils/range');
const { ServiceError } = require('./crane.service');
const { bookingService, bookingHelpers: H } = require('./booking.service');

const OFFSET_MS = JOB_CONFIG.IST_OFFSET_MINUTES * 60000;
const DAY_MS = 24 * 3600 * 1000;
const r2 = (n) => Math.round(n * 100) / 100;

// Jobs screen tabs: New Requests / Upcoming / Active / Completed (+ closed for declined, expired, cancelled)
const TABS = {
  new_requests: { statuses: [BOOKING_STATUS.AWAITING_OWNER], label: 'New Request', order: [['createdAt', 'DESC']], oldest: [['createdAt', 'ASC']] },
  upcoming: { statuses: [BOOKING_STATUS.CONFIRMED], label: 'Upcoming', order: [['startAt', 'ASC']], oldest: [['startAt', 'DESC']] },
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

/** What the owner earns from one completed job. Stored values win; older jobs fall back to the current fee. */
const jobMoney = (b) => {
  const gross = Number(b.finalAmount !== null && b.finalAmount !== undefined ? b.finalAmount : b.totalAmount);
  const percent = b.platformFeePercent !== null && b.platformFeePercent !== undefined ? b.platformFeePercent : BOOKING_CONFIG.PLATFORM_FEE_PERCENT;
  const fee = b.platformFeeAmount !== null && b.platformFeeAmount !== undefined ? Number(b.platformFeeAmount) : r2((gross * percent) / 100);
  const deductions = Number(b.deductionsAmount || 0);
  const net = b.netAmount !== null && b.netAmount !== undefined ? Number(b.netAmount) : r2(gross - fee - deductions);
  return { gross, platform_fee_percent: percent, platform_fee: fee, other_deductions: deductions, net };
};

const sumMoney = (rows) => rows.reduce((acc, b) => {
  const m = jobMoney(b);
  acc.gross = r2(acc.gross + m.gross);
  acc.platform_fee = r2(acc.platform_fee + m.platform_fee);
  acc.other_deductions = r2(acc.other_deductions + m.other_deductions);
  acc.net = r2(acc.net + m.net);
  acc.jobs += 1;
  return acc;
}, { gross: 0, platform_fee: 0, other_deductions: 0, net: 0, jobs: 0 });

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
    const money = completed ? jobMoney(b) : null;
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
          net_amount: money.net
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

  // ---------------------------------------------------------------- Earnings

  async completedRows(ownerId, since = null) {
    const where = { ownerId, status: BOOKING_STATUS.COMPLETED, completedAt: { [Op.ne]: null } };
    if (since) where.completedAt = { [Op.gte]: since };
    return Booking.findAll({
      where,
      attributes: ['id', 'finalAmount', 'totalAmount', 'platformFeePercent', 'platformFeeAmount', 'deductionsAmount', 'netAmount', 'completedAt', 'settlementStatus', 'settledAt']
    });
  }

  async earningsSummary(ownerId, input = {}) {
    const key = String(input.period || 'today').toLowerCase();
    const now = new Date();
    const range = periodRange(key, now);
    const rows = await this.completedRows(ownerId);

    const current = sumMoney(inRange(rows, range.from, range.to));
    let compared = null;
    if (range.prev) {
      const previous = sumMoney(inRange(rows, range.prev.from, range.prev.to));
      compared = {
        label: range.prev.label,
        previous_net: previous.net,
        change_percent: previous.net > 0 ? Math.round(((current.net - previous.net) / previous.net) * 100) : null
      };
    }

    const card = (k) => { const r = periodRange(k, now); const s = sumMoney(inRange(rows, r.from, r.to)); return { net: s.net, jobs: s.jobs }; };

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
        platform_fee_percent: BOOKING_CONFIG.PLATFORM_FEE_PERCENT,
        platform_fee: current.platform_fee,
        other_deductions: current.other_deductions,
        net_earnings: current.net
      },
      jobs_completed: current.jobs,
      compared_to_previous: compared,
      cards: { today: card('today'), week: card('week'), month: card('month'), all: card('all') },
      settlement: {
        settled: { amount: sumMoney(settled).net, jobs: settled.length, last_settled_at: H.iso(lastSettled) },
        pending: {
          amount: sumMoney(pending).net,
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
    const keyOf = range === 'year' ? localMonthKey : localDateKey;
    const data = buckets.map((bk) => {
      const s = sumMoney(rows.filter((b) => keyOf(b.completedAt) === bk.key));
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
    const items = rows.map((b) => {
      const m = jobMoney(b);
      return {
        booking_id: b.id,
        booking_code: b.bookingCode,
        crane: { crane_code: b.crane.craneCode, title: H.craneTitle(b.crane), primary_photo: H.primaryPhoto(b.crane) },
        location: b.siteName || b.siteAddress,
        completed_at: H.iso(b.completedAt),
        amount: m.gross,
        net_amount: m.net,
        settlement_status: b.settlementStatus,
        settlement_label: b.settlementStatus === 'settled' ? 'Paid' : 'Pending'
      };
    });
    return { range, items, total: count };
  }
}

module.exports = { ownerJobService: new OwnerJobService() };
