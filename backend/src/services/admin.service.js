const { Op, fn, col } = require('sequelize');
const {
  Booking, BookingRating, Complaint, Crane, CraneRequest, PaymentTransaction, StaticDropdown, User
} = require('../models');
const { BOOKING_STATUS, BOOKING_STATUS_LABELS } = require('../constants/booking');
const { parseRange } = require('../utils/range');
const { ServiceError } = require('./crane.service');
const billing = require('./billing');

const DAY = 24 * 3600 * 1000;
const IST = 330 * 60000;
const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;
const iso = (d) => (d ? new Date(d).toISOString() : null);
const nameOf = (u) => (u ? u.companyName || u.fullName : null);
const istDayStart = (d = new Date()) => {
  const local = new Date(d.getTime() + IST);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - IST);
};
const istKey = (d) => new Date(new Date(d).getTime() + IST).toISOString().slice(0, 10);
const ACTIVE = [BOOKING_STATUS.AWAITING_PAYMENT, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const userAttrs = ['id', 'fullName', 'companyName', 'memberId', 'mobileNumber', 'countryCode'];
const bookingInclude = [
  { model: User, as: 'customer', attributes: userAttrs },
  { model: User, as: 'owner', attributes: userAttrs },
  { model: User, as: 'operator', attributes: userAttrs },
  { model: Crane, as: 'crane', attributes: ['id', 'craneCode', 'registrationNumber'] },
  { model: StaticDropdown, as: 'craneTypeInfo', attributes: ['id', 'dropdownName'] },
  { model: StaticDropdown, as: 'capacityInfo', attributes: ['id', 'dropdownName'] }
];
const craneTitle = (b) => [b.capacityInfo && b.capacityInfo.dropdownName, b.craneTypeInfo && b.craneTypeInfo.dropdownName].filter(Boolean).join(' ');
const person = (u) => (u ? { id: u.id, name: nameOf(u), member_id: u.memberId, contact: `${u.countryCode || ''} ${u.mobileNumber || ''}`.trim() } : null);

const bookingRow = (b, fee) => {
  const bill = billing.billOf(b, fee);
  return {
    booking_id: b.id,
    booking_code: b.bookingCode,
    status: b.status,
    status_label: BOOKING_STATUS_LABELS[b.status],
    crane_title: craneTitle(b),
    crane_code: b.crane ? b.crane.craneCode : null,
    location: b.siteName || b.siteAddress,
    start_at: iso(b.startAt),
    duration_hours: b.durationHours,
    customer: person(b.customer),
    owner: person(b.owner),
    operator: person(b.operator),
    total: bill.total,
    platform_fee: bill.platform_fee,
    payment_status: b.paymentStatus,
    paid_amount: r2(b.paidAmount),
    created_at: iso(b.createdAt)
  };
};

/** Admin panel: live numbers for the dashboard, bookings, reviews, reports and alerts */
class AdminService {
  async getDashboardStats() {
    const now = new Date();
    const today = istDayStart(now);
    const users = await User.findAll({
      where: { isDeleted: 0 },
      attributes: ['roleId', [fn('COUNT', col('id')), 'n']],
      group: ['roleId'],
      raw: true
    });
    const byRole = Object.fromEntries(users.map((u) => [u.roleId, Number(u.n)]));
    const cranes = await Crane.findAll({ attributes: ['approvalStatus', [fn('COUNT', col('id')), 'n']], group: ['approvalStatus'], raw: true });
    const craneBy = Object.fromEntries(cranes.map((c) => [c.approvalStatus, Number(c.n)]));
    const sum = async (model, field, where) => r2(await model.sum(field, { where }));

    // last 7 days, India time
    const since = new Date(today.getTime() - 6 * DAY);
    const recentBookings = await Booking.findAll({ where: { createdAt: { [Op.gte]: since } }, attributes: ['createdAt'] });
    const recentPayments = await PaymentTransaction.findAll({ where: { status: 'success', createdAt: { [Op.gte]: since } }, attributes: ['amount', 'createdAt'] });
    const days = Array.from({ length: 7 }, (_, i) => istKey(new Date(since.getTime() + i * DAY)));
    const series = days.map((key) => ({
      date: key,
      bookings: recentBookings.filter((b) => istKey(b.createdAt) === key).length,
      revenue: r2(recentPayments.filter((p) => istKey(p.createdAt) === key).reduce((s, p) => s + Number(p.amount), 0))
    }));

    const fee = await billing.platformFeePercent();
    const latest = await Booking.findAll({ include: bookingInclude, order: [['createdAt', 'DESC']], limit: 8 });
    return {
      users: { customers: byRole[3] || 0, owners: byRole[1] || 0, operators: byRole[2] || 0, total: (byRole[1] || 0) + (byRole[2] || 0) + (byRole[3] || 0) },
      cranes: { total: Object.values(craneBy).reduce((a, b) => a + b, 0), verified: craneBy[1] || 0, under_review: craneBy[0] || 0, rejected: craneBy[2] || 0 },
      bookings: {
        active: await Booking.count({ where: { status: { [Op.in]: ACTIVE } } }),
        today: await Booking.count({ where: { createdAt: { [Op.gte]: today } } }),
        completed: await Booking.count({ where: { status: BOOKING_STATUS.COMPLETED } }),
        total: await Booking.count()
      },
      money: {
        collected: await sum(PaymentTransaction, 'amount', { status: 'success' }),
        platform_fee: await sum(Booking, 'platformFeeAmount', { status: BOOKING_STATUS.COMPLETED }),
        collected_today: await sum(PaymentTransaction, 'amount', { status: 'success', createdAt: { [Op.gte]: today } })
      },
      requests: {
        searching: await CraneRequest.count({ where: { status: 'searching' } }),
        no_crane_found: await CraneRequest.count({ where: { status: 'not_found', adminStatus: 'new' } })
      },
      last_7_days: series,
      recent_bookings: latest.map((b) => bookingRow(b, fee)),
      alerts: (await this.alerts()).total
    };
  }

  // ---------------------------------------------------------------- bookings

  async bookings(input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const where = {};
    if (input.status !== undefined && input.status !== null && input.status !== '') {
      if (input.status === 'active') where.status = { [Op.in]: ACTIVE };
      else where.status = Number(input.status);
    }
    if (input.search) {
      const term = `%${String(input.search).trim()}%`;
      where[Op.or] = [
        { bookingCode: { [Op.iLike]: term } },
        { siteAddress: { [Op.iLike]: term } },
        { '$customer.full_name$': { [Op.iLike]: term } },
        { '$owner.company_name$': { [Op.iLike]: term } }
      ];
    }
    const fee = await billing.platformFeePercent();
    const { rows, count } = await Booking.findAndCountAll({
      where, include: bookingInclude, limit: range.limit, offset: range.offset, order: [['createdAt', 'DESC'], ['id', 'ASC']], subQuery: false
    });
    return { range, items: rows.map((b) => bookingRow(b, fee)), total: count };
  }

  async booking(id) {
    if (!UUID_RE.test(String(id || ''))) throw new ServiceError('A valid booking_id is required.');
    const b = await Booking.findByPk(id, { include: bookingInclude });
    if (!b) throw new ServiceError('Booking not found.', 404);
    const fee = await billing.platformFeePercent();
    const bill = billing.billOf(b, fee);
    const payments = await PaymentTransaction.findAll({ where: { bookingId: b.id }, order: [['createdAt', 'ASC']] });
    const rating = await BookingRating.findOne({ where: { bookingId: b.id } });
    return {
      ...bookingRow(b, fee),
      site: { name: b.siteName, address: b.siteAddress, latitude: Number(b.latitude), longitude: Number(b.longitude) },
      site_contact: b.contactName ? { name: b.contactName, phone: b.contactPhone } : null,
      end_at: iso(b.endAt),
      bill: billing.breakdownLines(bill, { audience: 'owner' }),
      payments: payments.map((t) => ({
        code: t.transactionCode, amount: r2(t.amount), method: t.method, status: t.status, kind: t.meta && t.meta.kind,
        gateway_payment_id: t.gatewayPaymentId, failure_reason: t.failureReason, needs_refund: !!(t.meta && t.meta.needs_refund), at: iso(t.createdAt)
      })),
      timeline: [
        ['Requested', b.createdAt], ['Accepted', b.acceptedAt], ['Advance paid', b.advancePaidAt], ['On the way', b.enRouteAt],
        ['Arrived', b.arrivedAt], ['Work started', b.workStartedAt], ['Work finished', b.workEndedAt], ['Completed', b.completedAt],
        ['Cancelled', b.cancelledAt]
      ].filter(([, at]) => at).map(([label, at]) => ({ label, at: iso(at) })),
      cancel_reason: b.cancelReason,
      rating: rating ? { rating: rating.rating, comment: rating.comment } : null
    };
  }

  // ---------------------------------------------------------------- reviews

  async reviews(input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const where = {};
    if (input.rating) where.rating = Number(input.rating);
    const { rows, count } = await BookingRating.findAndCountAll({
      where,
      include: [{ model: Booking, as: 'booking', attributes: ['id', 'bookingCode', 'customerId', 'ownerId', 'operatorId'], include: bookingInclude.slice(0, 4) }],
      limit: range.limit,
      offset: range.offset,
      order: [['createdAt', 'DESC'], ['id', 'ASC']]
    });
    const stats = await BookingRating.findAll({ attributes: ['rating', [fn('COUNT', col('id')), 'n']], group: ['rating'], raw: true });
    const total = stats.reduce((s, r) => s + Number(r.n), 0);
    const avg = total ? stats.reduce((s, r) => s + Number(r.rating) * Number(r.n), 0) / total : null;
    return {
      range,
      total: count,
      summary: {
        average: avg !== null ? Math.round(avg * 10) / 10 : null,
        count: total,
        by_stars: [5, 4, 3, 2, 1].map((s) => ({ stars: s, count: Number((stats.find((r) => Number(r.rating) === s) || {}).n || 0) }))
      },
      items: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: iso(r.createdAt),
        booking_code: r.booking ? r.booking.bookingCode : null,
        booking_id: r.bookingId,
        customer: r.booking ? person(r.booking.customer) : null,
        owner: r.booking ? person(r.booking.owner) : null,
        operator: r.booking ? person(r.booking.operator) : null
      }))
    };
  }

  // ---------------------------------------------------------------- reports

  async reports(input = {}) {
    const months = Math.min(Math.max(Number(input.months) || 6, 1), 24);
    const now = new Date();
    const local = new Date(now.getTime() + IST);
    const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - (months - 1), 1) - IST);
    const monthKey = (d) => istKey(d).slice(0, 7);
    const keys = Array.from({ length: months }, (_, i) => {
      const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - (months - 1) + i, 1));
      return d.toISOString().slice(0, 7);
    });
    const completed = await Booking.findAll({
      where: { status: BOOKING_STATUS.COMPLETED, completedAt: { [Op.gte]: start } },
      include: [{ model: User, as: 'owner', attributes: userAttrs }]
    });
    const fee = await billing.platformFeePercent();
    const created = await Booking.findAll({ where: { createdAt: { [Op.gte]: start } }, attributes: ['createdAt', 'status'] });
    const monthly = keys.map((k) => {
      const done = completed.filter((b) => monthKey(b.completedAt) === k);
      const bills = done.map((b) => billing.billOf(b, fee));
      return {
        month: k,
        bookings: created.filter((b) => monthKey(b.createdAt) === k).length,
        completed: done.length,
        gross: r2(bills.reduce((s, x) => s + x.total, 0)),
        platform_fee: r2(bills.reduce((s, x) => s + x.platform_fee, 0))
      };
    });
    const owners = new Map();
    completed.forEach((b) => {
      const bill = billing.billOf(b, fee);
      const row = owners.get(b.ownerId) || { owner: person(b.owner), jobs: 0, gross: 0, platform_fee: 0 };
      row.jobs += 1;
      row.gross = r2(row.gross + bill.total);
      row.platform_fee = r2(row.platform_fee + bill.platform_fee);
      owners.set(b.ownerId, row);
    });
    const reqs = await CraneRequest.findAll({ where: { createdAt: { [Op.gte]: start } }, attributes: ['status'] });
    const decided = reqs.filter((r) => r.status !== 'searching');
    const accepted = reqs.filter((r) => ['accepted', 'confirmed'].includes(r.status) || r.status === 'payment_expired');
    return {
      months,
      monthly,
      totals: {
        bookings: created.length,
        completed: completed.length,
        cancelled: created.filter((b) => [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.DECLINED, BOOKING_STATUS.EXPIRED].includes(b.status)).length,
        gross: r2(monthly.reduce((s, m) => s + m.gross, 0)),
        platform_fee: r2(monthly.reduce((s, m) => s + m.platform_fee, 0))
      },
      requests: {
        total: reqs.length,
        accepted: accepted.length,
        acceptance_rate: decided.length ? Math.round((accepted.length / decided.length) * 100) : null,
        no_crane_found: reqs.filter((r) => r.status === 'not_found').length
      },
      top_owners: [...owners.values()].sort((a, b) => b.gross - a.gross).slice(0, 10)
    };
  }

  // ---------------------------------------------------------------- alerts (things waiting for the admin)

  async alerts() {
    const docsPending = await User.count({
      where: {
        roleId: 2,
        isDeleted: 0,
        [Op.or]: [
          { operatorLicenseFront: { [Op.ne]: null }, operatorLicenseStatus: 0 },
          { voterIdFile: { [Op.ne]: null }, voterIdStatus: 0 },
          { aadharCardFile: { [Op.ne]: null }, aadharStatus: 0 },
          { panCardFile: { [Op.ne]: null }, panStatus: 0 },
          { otherDocumentFile: { [Op.ne]: null }, otherDocumentStatus: 0 }
        ]
      }
    });
    const refunds = await PaymentTransaction.count({ where: { status: 'success', meta: { needs_refund: true } } });
    const items = [
      { key: 'cranes', label: 'Cranes waiting for approval', count: await Crane.count({ where: { approvalStatus: 0 } }), view: 'crane-approvals', tone: 'warn' },
      { key: 'documents', label: 'Operators with documents to check', count: docsPending, view: 'operators', tone: 'warn' },
      { key: 'no_crane', label: '"No crane found" requests to call', count: await CraneRequest.count({ where: { status: 'not_found', adminStatus: 'new' } }), view: 'crane-requests', tone: 'bad' },
      { key: 'complaints', label: 'Open complaints', count: await Complaint.count({ where: { status: { [Op.in]: ['open', 'in_review'] } } }), view: 'complaints', tone: 'bad' },
      { key: 'refunds', label: 'Payments to refund (paid after the booking expired)', count: refunds, view: 'payments', tone: 'bad' },
      {
        key: 'failed',
        label: 'Failed payments in the last 24 hours',
        count: await PaymentTransaction.count({ where: { status: 'failed', createdAt: { [Op.gte]: new Date(Date.now() - DAY) } } }),
        view: 'payments',
        tone: 'warn'
      }
    ];
    return { items, total: items.reduce((s, i) => s + i.count, 0) };
  }
}

module.exports = new AdminService();
