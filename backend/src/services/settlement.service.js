const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize, Booking, Settlement, User } = require('../models');
const { BOOKING_STATUS } = require('../constants/booking');
const { parseRange } = require('../utils/range');
const { ServiceError } = require('./crane.service');
const { notificationService } = require('./notification.service');
const billing = require('./billing');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const METHODS = ['cash', 'bank_transfer', 'upi', 'cheque', 'other'];
const METHOD_LABELS = { cash: 'Cash', bank_transfer: 'Bank transfer', upi: 'UPI', cheque: 'Cheque', other: 'Other' };
const DIRECTION_LABELS = {
  owner_to_platform: 'Owner paid platform fee',
  platform_to_owner: 'Platform paid owner',
  owner_to_operator: 'Owner paid operator'
};
const r2 = billing.r2;
const iso = (d) => (d ? new Date(d).toISOString() : null);
const nameOf = (u) => (u ? u.companyName || u.fullName : null);

const code = (prefix) => {
  const d = new Date();
  return `${prefix}${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(crypto.randomInt(0, 1000000)).padStart(6, '0')}`;
};

const userAttrs = ['id', 'fullName', 'companyName', 'memberId', 'mobileNumber', 'countryCode'];

const settlementView = (s) => ({
  id: s.id,
  settlement_code: s.settlementCode,
  kind: s.kind,
  direction: s.direction,
  direction_label: DIRECTION_LABELS[s.direction],
  amount: Number(s.amount),
  jobs_count: s.jobsCount,
  method: s.method,
  method_label: METHOD_LABELS[s.method] || s.method,
  reference: s.reference,
  note: s.note,
  settled_at: iso(s.settledAt),
  owner: s.owner ? { id: s.owner.id, name: nameOf(s.owner), member_id: s.owner.memberId } : null,
  operator: s.operator ? { id: s.operator.id, name: s.operator.fullName, member_id: s.operator.memberId } : null,
  created_by_type: s.createdByType
});

/** One completed job as it appears in a settlement list */
const jobLine = (b, fee) => {
  const bill = billing.billOf(b, fee);
  const cash = (b.paymentCollectedBy || 'owner') === 'owner';
  return {
    booking_id: b.id,
    booking_code: b.bookingCode,
    completed_at: iso(b.completedAt),
    customer_total: bill.total,
    platform_fee: bill.platform_fee,
    owner_receives: bill.owner_receives,
    gst_amount: bill.gst_amount,
    operator_commission: bill.operator_commission.amount,
    commission_set: bill.operator_commission.set,
    owner_share: bill.owner_share,
    payment_status: b.paymentStatus,
    payment_method: b.paymentMethod,
    collected_by: b.paymentCollectedBy || (b.paymentStatus === 'paid' ? 'owner' : null),
    // + platform pays the owner, - the owner pays the platform
    platform_balance: b.paymentStatus !== 'paid' ? 0 : (cash ? -bill.platform_fee : bill.owner_receives),
    settlement_status: b.settlementStatus,
    operator_settlement_status: b.operatorSettlementStatus,
    operator: b.operator ? { id: b.operator.id, name: b.operator.fullName } : null
  };
};

const parseIds = (ids) => {
  if (!Array.isArray(ids) || !ids.length) throw new ServiceError('Select at least one job (booking_ids).');
  if (ids.length > 200) throw new ServiceError('You can settle up to 200 jobs at a time.');
  if (ids.some((id) => !UUID_RE.test(String(id)))) throw new ServiceError('booking_ids has an invalid id.');
  return [...new Set(ids.map(String))];
};

const parsePayout = (input) => {
  const method = String(input.method || '').toLowerCase();
  if (!METHODS.includes(method)) throw new ServiceError(`method must be one of: ${METHODS.join(', ')}.`);
  const reference = input.reference ? String(input.reference).trim().slice(0, 80) : null;
  if (method !== 'cash' && !reference) throw new ServiceError('Enter the transaction reference (UTR / UPI id / cheque number).');
  let settledAt = new Date();
  if (input.settled_at) {
    settledAt = new Date(input.settled_at);
    if (Number.isNaN(settledAt.getTime()) || settledAt > new Date()) throw new ServiceError('settled_at must be a valid date that is not in the future.');
  }
  return { method, reference, settledAt, note: input.note ? String(input.note).trim().slice(0, 500) : null };
};

class SettlementService {
  // ======================================================================== platform <-> owner (Super Admin)

  /** Settlements page: one row per owner with what is due either way */
  async adminBalances(input = {}) {
    const fee = await billing.platformFeePercent();
    const rows = await Booking.findAll({
      where: { status: BOOKING_STATUS.COMPLETED, paymentStatus: 'paid', settlementStatus: { [Op.ne]: 'settled' } },
      include: [{ model: User, as: 'owner', attributes: userAttrs }]
    });
    const byOwner = new Map();
    rows.forEach((b) => {
      const line = jobLine(b, fee);
      const row = byOwner.get(b.ownerId) || {
        owner: { id: b.ownerId, name: nameOf(b.owner), member_id: b.owner ? b.owner.memberId : null },
        jobs: 0, owner_owes_platform: 0, platform_owes_owner: 0, oldest_job_at: null
      };
      row.jobs += 1;
      if (line.platform_balance < 0) row.owner_owes_platform = r2(row.owner_owes_platform - line.platform_balance);
      else row.platform_owes_owner = r2(row.platform_owes_owner + line.platform_balance);
      if (!row.oldest_job_at || b.completedAt < new Date(row.oldest_job_at)) row.oldest_job_at = iso(b.completedAt);
      byOwner.set(b.ownerId, row);
    });
    let items = [...byOwner.values()].map((r) => {
      const net = r2(r.platform_owes_owner - r.owner_owes_platform);
      return { ...r, net, net_label: net > 0 ? 'Pay owner' : (net < 0 ? 'Collect from owner' : 'Nothing due') };
    });
    if (input.search) {
      const term = String(input.search).toLowerCase();
      items = items.filter((r) => `${r.owner.name || ''} ${r.owner.member_id || ''}`.toLowerCase().includes(term));
    }
    items.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
    return {
      platform_fee_percent: fee,
      totals: {
        owners: items.length,
        collect_from_owners: r2(items.reduce((s, r) => s + r.owner_owes_platform, 0)),
        pay_to_owners: r2(items.reduce((s, r) => s + r.platform_owes_owner, 0))
      },
      items
    };
  }

  /** Jobs of one owner that are not settled with the platform yet */
  async pendingJobs(ownerId, { forAdmin = true } = {}) {
    if (!UUID_RE.test(String(ownerId || ''))) throw new ServiceError('A valid owner_id is required.');
    const fee = await billing.platformFeePercent();
    const rows = await Booking.findAll({
      where: { ownerId, status: BOOKING_STATUS.COMPLETED, settlementStatus: { [Op.ne]: 'settled' } },
      include: [{ model: User, as: 'operator', attributes: userAttrs }],
      order: [['completedAt', 'ASC']]
    });
    const items = rows.map((b) => jobLine(b, fee));
    const paid = items.filter((i) => i.payment_status === 'paid');
    const net = r2(paid.reduce((s, i) => s + i.platform_balance, 0));
    return {
      items,
      can_settle_count: paid.length,
      unpaid_count: items.length - paid.length,
      net,
      net_label: forAdmin
        ? (net > 0 ? 'Pay owner' : (net < 0 ? 'Collect from owner' : 'Nothing due'))
        : (net > 0 ? 'Platform will pay you' : (net < 0 ? 'You pay the platform' : 'Nothing due'))
    };
  }

  /** Record a payment between the platform and an owner and mark those jobs settled */
  async settleOwner(admin, input = {}) {
    if (!UUID_RE.test(String(input.owner_id || ''))) throw new ServiceError('A valid owner_id is required.');
    const ids = parseIds(input.booking_ids);
    const payout = parsePayout(input);
    const fee = await billing.platformFeePercent();

    return sequelize.transaction(async (transaction) => {
      const rows = await Booking.findAll({
        where: { id: ids, ownerId: input.owner_id },
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      if (rows.length !== ids.length) throw new ServiceError('Some jobs were not found for this owner.', 404);
      const bad = rows.find((b) => b.status !== BOOKING_STATUS.COMPLETED || b.paymentStatus !== 'paid' || b.settlementStatus === 'settled');
      if (bad) throw new ServiceError(`${bad.bookingCode} cannot be settled (not completed, not paid by the customer, or already settled).`, 409);

      const net = r2(rows.reduce((s, b) => s + jobLine(b, fee).platform_balance, 0));
      const settlement = await Settlement.create({
        settlementCode: code('STL'),
        kind: 'platform_owner',
        direction: net >= 0 ? 'platform_to_owner' : 'owner_to_platform',
        ownerId: input.owner_id,
        amount: Math.abs(net),
        jobsCount: rows.length,
        method: payout.method,
        reference: payout.reference,
        note: payout.note,
        settledAt: payout.settledAt,
        createdByType: 'admin',
        createdBy: admin ? String(admin.id) : null
      }, { transaction });
      await Booking.update(
        { settlementStatus: 'settled', settledAt: payout.settledAt, settlementId: settlement.id },
        { where: { id: ids }, transaction }
      );
      return settlement;
    }).then(async (settlement) => {
      await notificationService.notify(input.owner_id, {
        type: 'settlement_recorded',
        title: 'Settlement Recorded',
        body: settlement.direction === 'platform_to_owner'
          ? `Cranezo paid you ₹${Number(settlement.amount)} for ${settlement.jobsCount} job(s). Ref: ${settlement.reference || settlement.settlementCode}.`
          : `Your platform fee payment of ₹${Number(settlement.amount)} for ${settlement.jobsCount} job(s) is recorded.`,
        data: { settlement_id: settlement.id }
      });
      return this.get(settlement.id);
    });
  }

  // ======================================================================== owner -> operator (Owner app)

  /** Operator Payments: each operator with commission still to pay */
  async operatorDues(ownerId) {
    const rows = await Booking.findAll({
      where: { ownerId, status: BOOKING_STATUS.COMPLETED, operatorId: { [Op.ne]: null }, operatorSettlementStatus: { [Op.ne]: 'settled' } },
      include: [{ model: User, as: 'operator', attributes: userAttrs }]
    });
    const byOperator = new Map();
    rows.forEach((b) => {
      const c = billing.billOf(b).operator_commission;
      const row = byOperator.get(b.operatorId) || {
        operator: { id: b.operatorId, name: b.operator ? b.operator.fullName : null, member_id: b.operator ? b.operator.memberId : null },
        jobs: 0, amount_due: 0, jobs_without_commission: 0
      };
      row.jobs += 1;
      if (c.set) row.amount_due = r2(row.amount_due + c.amount);
      else row.jobs_without_commission += 1;
      byOperator.set(b.operatorId, row);
    });
    const items = [...byOperator.values()].sort((a, b) => b.amount_due - a.amount_due);
    return { total_due: r2(items.reduce((s, r) => s + r.amount_due, 0)), items };
  }

  async operatorPendingJobs(ownerId, operatorId) {
    if (!UUID_RE.test(String(operatorId || ''))) throw new ServiceError('A valid operator_id is required.');
    const rows = await Booking.findAll({
      where: { ownerId, operatorId, status: BOOKING_STATUS.COMPLETED, operatorSettlementStatus: { [Op.ne]: 'settled' } },
      include: [{ model: User, as: 'operator', attributes: userAttrs }],
      order: [['completedAt', 'ASC']]
    });
    const items = rows.map((b) => jobLine(b));
    return { items, total_due: r2(items.reduce((s, i) => s + (i.commission_set ? i.operator_commission : 0), 0)) };
  }

  /** Owner records paying an operator's commission for some jobs */
  async payOperator(ownerId, input = {}) {
    if (!UUID_RE.test(String(input.operator_id || ''))) throw new ServiceError('A valid operator_id is required.');
    const ids = parseIds(input.booking_ids);
    const payout = parsePayout(input);

    const settlement = await sequelize.transaction(async (transaction) => {
      const rows = await Booking.findAll({
        where: { id: ids, ownerId, operatorId: input.operator_id },
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      if (rows.length !== ids.length) throw new ServiceError('Some jobs were not found for this operator.', 404);
      const bad = rows.find((b) => b.status !== BOOKING_STATUS.COMPLETED || b.operatorSettlementStatus === 'settled');
      if (bad) throw new ServiceError(`${bad.bookingCode} cannot be paid (not completed or already paid).`, 409);
      const noCommission = rows.find((b) => !b.operatorCommissionType);
      if (noCommission) throw new ServiceError(`Set the commission for ${noCommission.bookingCode} first.`, 409);

      const amount = r2(rows.reduce((s, b) => s + billing.billOf(b).operator_commission.amount, 0));
      const created = await Settlement.create({
        settlementCode: code('OPS'),
        kind: 'owner_operator',
        direction: 'owner_to_operator',
        ownerId,
        operatorId: input.operator_id,
        amount,
        jobsCount: rows.length,
        method: payout.method,
        reference: payout.reference,
        note: payout.note,
        settledAt: payout.settledAt,
        createdByType: 'owner',
        createdBy: ownerId
      }, { transaction });
      await Booking.update(
        { operatorSettlementStatus: 'settled', operatorSettledAt: payout.settledAt, operatorSettlementId: created.id },
        { where: { id: ids }, transaction }
      );
      return created;
    });

    await notificationService.notify(input.operator_id, {
      type: 'commission_paid',
      title: 'Payment Received',
      body: `Your owner paid ₹${Number(settlement.amount)} for ${settlement.jobsCount} job(s).`,
      data: { settlement_id: settlement.id }
    });
    return this.get(settlement.id);
  }

  // ======================================================================== history

  async get(id) {
    const s = await Settlement.findByPk(id, {
      include: [{ model: User, as: 'owner', attributes: userAttrs }, { model: User, as: 'operator', attributes: userAttrs }]
    });
    if (!s) throw new ServiceError('Settlement not found.', 404);
    const jobs = await Booking.findAll({
      where: s.kind === 'owner_operator' ? { operatorSettlementId: s.id } : { settlementId: s.id },
      attributes: ['id', 'bookingCode', 'completedAt'],
      order: [['completedAt', 'ASC']]
    });
    return { ...settlementView(s), jobs: jobs.map((b) => ({ booking_id: b.id, booking_code: b.bookingCode, completed_at: iso(b.completedAt) })) };
  }

  async list(where, input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const filter = { ...where };
    if (input.kind) filter.kind = input.kind;
    const { rows, count } = await Settlement.findAndCountAll({
      where: filter,
      include: [{ model: User, as: 'owner', attributes: userAttrs }, { model: User, as: 'operator', attributes: userAttrs }],
      limit: range.limit,
      offset: range.offset,
      order: [['settledAt', 'DESC'], ['id', 'ASC']]
    });
    return { range, items: rows.map(settlementView), total: count };
  }

  adminList(input = {}) {
    const where = {};
    if (input.owner_id) where.ownerId = input.owner_id;
    return this.list(where, input);
  }

  ownerList(ownerId, input = {}) { return this.list({ ownerId }, input); }

  operatorList(operatorId, input = {}) { return this.list({ operatorId, kind: 'owner_operator' }, input); }

  async getFor(id, { ownerId, operatorId }) {
    if (!UUID_RE.test(String(id || ''))) throw new ServiceError('A valid settlement_id is required.');
    const s = await this.get(id);
    if (ownerId && (!s.owner || s.owner.id !== ownerId)) throw new ServiceError('Settlement not found.', 404);
    if (operatorId && (!s.operator || s.operator.id !== operatorId)) throw new ServiceError('Settlement not found.', 404);
    return s;
  }
}

module.exports = { settlementService: new SettlementService(), METHODS, METHOD_LABELS };
