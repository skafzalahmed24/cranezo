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
  // the tip inside this payout (the amount already includes it)
  tip_amount: Number(s.tipAmount || 0),
  method: s.method,
  method_label: METHOD_LABELS[s.method] || s.method,
  reference: s.reference,
  note: s.note,
  settled_at: iso(s.settledAt),
  owner: s.owner ? { id: s.owner.id, name: nameOf(s.owner), member_id: s.owner.memberId } : null,
  operator: s.operator ? { id: s.operator.id, name: s.operator.fullName, member_id: s.operator.memberId } : null,
  created_by_type: s.createdByType
});

// The tip: the customer paid it online, so the platform holds it and all of it belongs to the operator.
//  tipDueToOwner: what the platform still has to pay the owner (for the operator); tipDueToOperator: what the owner still has to pay the operator.
const tipOf = (b) => r2(Number(b.tipAmount || 0));
const tipDueToOwner = (b) => Math.max(0, r2(tipOf(b) - Number(b.tipSettledAmount || 0)));
const tipDueToOperator = (b) => Math.max(0, r2(tipOf(b) - Number(b.operatorTipPaidAmount || 0)));
// SQL: a job whose tip is not fully paid out yet (so a tip that comes after the job was settled is not lost)
const TIP_OWNER_PENDING = 'COALESCE("Booking"."tip_amount", 0) > COALESCE("Booking"."tip_settled_amount", 0)';
const TIP_OPERATOR_PENDING = 'COALESCE("Booking"."tip_amount", 0) > COALESCE("Booking"."operator_tip_paid_amount", 0)';

/** One completed job as it appears in a settlement list */
const jobLine = (b, fee) => {
  const bill = billing.billOf(b, fee);
  const moneyPending = b.settlementStatus !== 'settled';
  const paid = b.paymentStatus === 'paid';
  // + platform pays the owner, - the owner pays the platform (advance online + rest in cash both work)
  const platformBalance = !paid || !moneyPending ? 0 : billing.platformBalanceOf(b, bill);
  const tipDue = tipDueToOwner(b);
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
    platform_held: r2(Number(b.platformCollectedAmount || 0)),
    platform_balance: platformBalance,
    // the tip the customer paid online for the operator, and what of it is still to be paid out
    tip: tipOf(b),
    tip_due: tipDue,
    operator_tip_due: tipDueToOperator(b),
    // what settling this job pays: the money balance plus the tip still due
    settlement_amount: paid ? r2(platformBalance + tipDue) : 0,
    money_pending: moneyPending,
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

  /** Settlements page: one row per owner with what is due either way (tips included) */
  async adminBalances(input = {}) {
    const fee = await billing.platformFeePercent();
    const rows = await Booking.findAll({
      where: {
        status: BOOKING_STATUS.COMPLETED,
        paymentStatus: 'paid',
        // not settled yet, or settled but a tip came after (or is still unpaid)
        [Op.or]: [{ settlementStatus: { [Op.ne]: 'settled' } }, sequelize.literal(TIP_OWNER_PENDING)]
      },
      include: [{ model: User, as: 'owner', attributes: userAttrs }]
    });
    const byOwner = new Map();
    rows.forEach((b) => {
      const line = jobLine(b, fee);
      const row = byOwner.get(b.ownerId) || {
        owner: { id: b.ownerId, name: nameOf(b.owner), member_id: b.owner ? b.owner.memberId : null },
        jobs: 0, owner_owes_platform: 0, platform_owes_owner: 0, tips: 0, oldest_job_at: null
      };
      row.jobs += 1;
      if (line.platform_balance < 0) row.owner_owes_platform = r2(row.owner_owes_platform - line.platform_balance);
      else row.platform_owes_owner = r2(row.platform_owes_owner + line.platform_balance);
      // the tip is always the platform's to pay out
      row.platform_owes_owner = r2(row.platform_owes_owner + line.tip_due);
      row.tips = r2(row.tips + line.tip_due);
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
        pay_to_owners: r2(items.reduce((s, r) => s + r.platform_owes_owner, 0)),
        tips: r2(items.reduce((s, r) => s + r.tips, 0))
      },
      items
    };
  }

  /** Jobs of one owner that are not settled with the platform yet (or whose tip is still to be paid out) */
  async pendingJobs(ownerId, { forAdmin = true } = {}) {
    if (!UUID_RE.test(String(ownerId || ''))) throw new ServiceError('A valid owner_id is required.');
    const fee = await billing.platformFeePercent();
    const rows = await Booking.findAll({
      where: {
        ownerId,
        status: BOOKING_STATUS.COMPLETED,
        [Op.or]: [{ settlementStatus: { [Op.ne]: 'settled' } }, sequelize.literal(TIP_OWNER_PENDING)]
      },
      include: [{ model: User, as: 'operator', attributes: userAttrs }],
      order: [['completedAt', 'ASC']]
    });
    const items = rows.map((b) => jobLine(b, fee));
    const paid = items.filter((i) => i.payment_status === 'paid');
    const net = r2(paid.reduce((s, i) => s + i.settlement_amount, 0));
    const tips = r2(paid.reduce((s, i) => s + i.tip_due, 0));
    return {
      items,
      can_settle_count: paid.length,
      unpaid_count: items.length - paid.length,
      // the money balance of the jobs and the tips inside the net
      tips,
      net_without_tips: r2(net - tips),
      net,
      net_label: forAdmin
        ? (net > 0 ? 'Pay owner' : (net < 0 ? 'Collect from owner' : 'Nothing due'))
        : (net > 0 ? 'Platform will pay you' : (net < 0 ? 'You pay the platform' : 'Nothing due'))
    };
  }

  /** Record a payment between the platform and an owner and mark those jobs settled (the tips are paid in the same payment) */
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
      // a settled job is still allowed when only a late tip is left to pay
      const bad = rows.find((b) => b.status !== BOOKING_STATUS.COMPLETED || b.paymentStatus !== 'paid' || (b.settlementStatus === 'settled' && tipDueToOwner(b) <= 0));
      if (bad) throw new ServiceError(`${bad.bookingCode} cannot be settled (not completed, not paid by the customer, or already settled).`, 409);

      const lines = rows.map((b) => jobLine(b, fee));
      const net = r2(lines.reduce((s, l) => s + l.settlement_amount, 0));
      const tipTotal = r2(lines.reduce((s, l) => s + l.tip_due, 0));
      const settlement = await Settlement.create({
        settlementCode: code('STL'),
        kind: 'platform_owner',
        direction: net >= 0 ? 'platform_to_owner' : 'owner_to_platform',
        ownerId: input.owner_id,
        amount: Math.abs(net),
        tipAmount: tipTotal,
        jobsCount: rows.length,
        method: payout.method,
        reference: payout.reference,
        note: payout.note,
        settledAt: payout.settledAt,
        createdByType: 'admin',
        createdBy: admin ? String(admin.id) : null
      }, { transaction });
      // eslint-disable-next-line no-restricted-syntax
      for (const b of rows) {
        const patch = { tipSettledAmount: tipOf(b) };
        if (b.settlementStatus !== 'settled') Object.assign(patch, { settlementStatus: 'settled', settledAt: payout.settledAt, settlementId: settlement.id });
        // eslint-disable-next-line no-await-in-loop
        await b.update(patch, { transaction });
      }
      return settlement;
    }).then(async (settlement) => {
      const tipNote = Number(settlement.tipAmount) > 0 ? ` (includes ₹${Number(settlement.tipAmount)} tip for your operator)` : '';
      await notificationService.notify(input.owner_id, {
        type: 'settlement_recorded',
        title: 'Settlement Recorded',
        body: settlement.direction === 'platform_to_owner'
          ? `Cranezo paid you ₹${Number(settlement.amount)} for ${settlement.jobsCount} job(s)${tipNote}. Ref: ${settlement.reference || settlement.settlementCode}.`
          : `Your platform fee payment of ₹${Number(settlement.amount)} for ${settlement.jobsCount} job(s) is recorded.`,
        data: { settlement_id: settlement.id }
      });
      return this.get(settlement.id);
    });
  }

  // ======================================================================== owner -> operator (Owner app)

  /** Operator Payments: each operator with commission and tips still to pay */
  async operatorDues(ownerId) {
    const rows = await Booking.findAll({
      where: {
        ownerId,
        status: BOOKING_STATUS.COMPLETED,
        operatorId: { [Op.ne]: null },
        [Op.or]: [{ operatorSettlementStatus: { [Op.ne]: 'settled' } }, sequelize.literal(TIP_OPERATOR_PENDING)]
      },
      include: [{ model: User, as: 'operator', attributes: userAttrs }]
    });
    const byOperator = new Map();
    rows.forEach((b) => {
      const row = byOperator.get(b.operatorId) || {
        operator: { id: b.operatorId, name: b.operator ? b.operator.fullName : null, member_id: b.operator ? b.operator.memberId : null },
        jobs: 0, amount_due: 0, commission_due: 0, tips_due: 0, jobs_without_commission: 0
      };
      row.jobs += 1;
      if (b.operatorSettlementStatus !== 'settled') {
        const c = billing.billOf(b).operator_commission;
        if (c.set) row.commission_due = r2(row.commission_due + c.amount);
        else row.jobs_without_commission += 1;
      }
      // the customer's tip is all the operator's
      row.tips_due = r2(row.tips_due + tipDueToOperator(b));
      row.amount_due = r2(row.commission_due + row.tips_due);
      byOperator.set(b.operatorId, row);
    });
    const items = [...byOperator.values()].sort((a, b) => b.amount_due - a.amount_due);
    return {
      total_due: r2(items.reduce((s, r) => s + r.amount_due, 0)),
      total_tips: r2(items.reduce((s, r) => s + r.tips_due, 0)),
      items
    };
  }

  async operatorPendingJobs(ownerId, operatorId) {
    if (!UUID_RE.test(String(operatorId || ''))) throw new ServiceError('A valid operator_id is required.');
    const rows = await Booking.findAll({
      where: {
        ownerId,
        operatorId,
        status: BOOKING_STATUS.COMPLETED,
        [Op.or]: [{ operatorSettlementStatus: { [Op.ne]: 'settled' } }, sequelize.literal(TIP_OPERATOR_PENDING)]
      },
      include: [{ model: User, as: 'operator', attributes: userAttrs }],
      order: [['completedAt', 'ASC']]
    });
    const items = rows.map((b) => ({ ...jobLine(b), commission_pending: b.operatorSettlementStatus !== 'settled' }));
    const commission = r2(items.reduce((s, i) => s + (i.commission_set && i.commission_pending ? i.operator_commission : 0), 0));
    const tips = r2(items.reduce((s, i) => s + i.operator_tip_due, 0));
    return { items, commission_due: commission, tips_due: tips, total_due: r2(commission + tips) };
  }

  /** Owner records paying an operator's commission and tips for some jobs */
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
      // a paid job is still allowed when only the operator's tip is left to pay
      const bad = rows.find((b) => b.status !== BOOKING_STATUS.COMPLETED || (b.operatorSettlementStatus === 'settled' && tipDueToOperator(b) <= 0));
      if (bad) throw new ServiceError(`${bad.bookingCode} cannot be paid (not completed or already paid).`, 409);
      const noCommission = rows.find((b) => b.operatorSettlementStatus !== 'settled' && !b.operatorCommissionType);
      if (noCommission) throw new ServiceError(`Set the commission for ${noCommission.bookingCode} first.`, 409);

      const commission = r2(rows.reduce((s, b) => s + (b.operatorSettlementStatus !== 'settled' ? billing.billOf(b).operator_commission.amount : 0), 0));
      const tips = r2(rows.reduce((s, b) => s + tipDueToOperator(b), 0));
      const created = await Settlement.create({
        settlementCode: code('OPS'),
        kind: 'owner_operator',
        direction: 'owner_to_operator',
        ownerId,
        operatorId: input.operator_id,
        // commission plus the tips: one payment to the operator
        amount: r2(commission + tips),
        tipAmount: tips,
        jobsCount: rows.length,
        method: payout.method,
        reference: payout.reference,
        note: payout.note,
        settledAt: payout.settledAt,
        createdByType: 'owner',
        createdBy: ownerId
      }, { transaction });
      // eslint-disable-next-line no-restricted-syntax
      for (const b of rows) {
        const patch = { operatorTipPaidAmount: tipOf(b) };
        if (b.operatorSettlementStatus !== 'settled') Object.assign(patch, { operatorSettlementStatus: 'settled', operatorSettledAt: payout.settledAt, operatorSettlementId: created.id });
        // eslint-disable-next-line no-await-in-loop
        await b.update(patch, { transaction });
      }
      return created;
    });

    const tipNote = Number(settlement.tipAmount) > 0 ? ` (includes ₹${Number(settlement.tipAmount)} tip)` : '';
    await notificationService.notify(input.operator_id, {
      type: 'commission_paid',
      title: 'Payment Received',
      body: `Your owner paid ₹${Number(settlement.amount)} for ${settlement.jobsCount} job(s)${tipNote}.`,
      data: { settlement_id: settlement.id }
    });
    return this.get(settlement.id);
  }

  // ======================================================================== monthly salaries (owner -> operator)

  /** Operators of this owner with a monthly salary: this month and last month, paid or not; tips still to pay are shown too */
  async salaryList(ownerId) {
    const ops = await User.findAll({ where: { ownerId, roleId: 2, isDeleted: 0, monthlySalary: { [Op.gt]: 0 } }, attributes: ['id', 'fullName', 'memberId', 'monthlySalary'], order: [['fullName', 'ASC']] });
    const now = new Date();
    const key = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const months = [key(now), key(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)))];
    const paid = ops.length ? await Settlement.findAll({ where: { operatorId: ops.map((o) => o.id), periodMonth: months }, attributes: ['operatorId', 'periodMonth', 'amount', 'settledAt'] }) : [];
    // the customers' tips the owner still has to hand over to each operator
    const tipRows = ops.length ? await Booking.findAll({
      where: { ownerId, operatorId: ops.map((o) => o.id), status: BOOKING_STATUS.COMPLETED, [Op.and]: [sequelize.literal(TIP_OPERATOR_PENDING)] },
      attributes: ['operatorId', 'tipAmount', 'operatorTipPaidAmount']
    }) : [];
    const tipsBy = new Map();
    tipRows.forEach((b) => tipsBy.set(b.operatorId, r2((tipsBy.get(b.operatorId) || 0) + tipDueToOperator(b))));
    const items = [];
    ops.forEach((o) => months.forEach((m) => {
      const p = paid.find((x) => x.operatorId === o.id && x.periodMonth === m);
      items.push({
        operator: { id: o.id, name: o.fullName, member_id: o.memberId }, month: m, salary: Number(o.monthlySalary), paid: !!p,
        paid_amount: p ? Number(p.amount) : null, paid_at: p ? iso(p.settledAt) : null, tips_due: tipsBy.get(o.id) || 0
      });
    }));
    return { months, items, total_due: r2(items.filter((i) => !i.paid).reduce((n, i) => n + i.salary, 0)), total_tips_due: r2([...tipsBy.values()].reduce((n, v) => n + v, 0)) };
  }

  /** The owner records paying a monthly salary; with include_tips the operator's pending tips are paid in the same payment */
  async paySalary(ownerId, input = {}) {
    const month = String(input.month || '');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new ServiceError('month must look like 2026-11.');
    if (!UUID_RE.test(String(input.operator_id || ''))) throw new ServiceError('A valid operator_id is required.');
    const op = await User.findOne({ where: { id: input.operator_id, ownerId, roleId: 2, isDeleted: 0 }, attributes: ['id', 'fullName', 'monthlySalary'] });
    if (!op) throw new ServiceError('This operator is not in your team.', 404);
    const salary = Number(op.monthlySalary || 0);
    if (!(salary > 0)) throw new ServiceError('This operator has no monthly salary set.', 409);
    if (await Settlement.findOne({ where: { operatorId: op.id, periodMonth: month }, attributes: ['id'] })) throw new ServiceError('This month is already paid.', 409);
    const payout = parsePayout(input);
    const withTips = input.include_tips === true || input.include_tips === 'true' || input.include_tips === 1;

    const created = await sequelize.transaction(async (transaction) => {
      let tips = 0;
      let tipJobs = [];
      if (withTips) {
        tipJobs = await Booking.findAll({
          where: { ownerId, operatorId: op.id, status: BOOKING_STATUS.COMPLETED, [Op.and]: [sequelize.literal(TIP_OPERATOR_PENDING)] },
          lock: transaction.LOCK.UPDATE,
          transaction
        });
        tips = r2(tipJobs.reduce((s, b) => s + tipDueToOperator(b), 0));
      }
      const row = await Settlement.create({
        settlementCode: code('SAL'), kind: 'owner_operator', direction: 'owner_to_operator', ownerId, operatorId: op.id,
        amount: r2(salary + tips), tipAmount: tips, jobsCount: tipJobs.length, periodMonth: month, method: payout.method, reference: payout.reference,
        note: payout.note || (tips > 0 ? `Salary for ${month} + tips` : `Salary for ${month}`),
        settledAt: payout.settledAt, createdByType: 'owner', createdBy: ownerId
      }, { transaction });
      // eslint-disable-next-line no-restricted-syntax
      for (const b of tipJobs) {
        // eslint-disable-next-line no-await-in-loop
        await b.update({ operatorTipPaidAmount: tipOf(b) }, { transaction });
      }
      return row;
    });
    const tipNote = Number(created.tipAmount) > 0 ? ` and ₹${Number(created.tipAmount)} in tips` : '';
    await notificationService.notify(op.id, {
      type: 'commission_paid', title: 'Salary Received',
      body: `Your owner paid your salary of ₹${salary} for ${month}${tipNote}.`, data: { settlement_id: created.id }
    }).catch(() => {});
    return this.get(created.id);
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
