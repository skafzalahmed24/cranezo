const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize, OwnerSubscription, SubscriptionPayment, PlatformSetting, User } = require('../models');
const { ServiceError } = require('./crane.service');
const { gateway } = require('./gateway.service');
const { notificationService } = require('./notification.service');
const billing = require('./billing');
const { parseRange } = require('../utils/range');

/**
 * Crane owner subscriptions.
 *   - the first month is a free trial (days are a Super Admin setting)
 *   - then a monthly or a yearly plan, paid online with Razorpay; the online payment fee (the same % as for
 *     bookings) is added to the price the owner pays
 *   - paying extends the due date from the old due date (not from the day of payment), so nobody loses or gains days;
 *     a payment after the grace period starts a new period from today
 *   - after the due date there are a few grace days; then the owner stops receiving and accepting requests
 */
const DAY = 24 * 60 * 60 * 1000;
const KEY = 'subscription_plans';
const DEFAULTS = { trial_days: 30, monthly_price: 999, yearly_price: 9999, gst_percent: 0, grace_days: 5, warn_days: 3 };
const LIMITS = {
  trial_days: [0, 365],
  monthly_price: [0, 1000000],
  yearly_price: [0, 10000000],
  gst_percent: [0, 40],
  grace_days: [0, 60],
  warn_days: [0, 30]
};
const PLAN_LABELS = { trial: 'Free trial', monthly: 'Monthly', yearly: 'Yearly' };
const r2 = (n) => Math.round(Number(n) * 100) / 100;
const iso = (d) => (d ? new Date(d).toISOString() : null);
const code = () => `SUB${String(new Date().getUTCFullYear()).slice(2)}${String(crypto.randomInt(0, 100000000)).padStart(8, '0')}`;

const addPeriod = (from, plan) => {
  const d = new Date(from);
  if (plan === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
};

let plansCache = null;
async function plans() {
  if (plansCache && Date.now() - plansCache.at < 30 * 1000) return plansCache.value;
  const row = await PlatformSetting.findByPk(KEY);
  const value = { ...DEFAULTS, ...((row && row.value) || {}) };
  plansCache = { value, at: Date.now() };
  return value;
}

async function savePlans(input = {}, adminId) {
  const next = { ...(await plans()) };
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    if (input[key] === undefined) continue;
    const v = Number(input[key]);
    if (!Number.isFinite(v) || v < min || v > max) throw new ServiceError(`${key} must be a number from ${min} to ${max}.`);
    next[key] = key.endsWith('_days') ? Math.round(v) : r2(v);
  }
  await PlatformSetting.upsert({
    key: KEY,
    value: next,
    description: 'Owner subscription: free trial days, monthly and yearly price, GST %, grace days after the due date, days before the due date when the red warning shows',
    updatedBy: adminId ? String(adminId) : null
  });
  plansCache = null;
  return next;
}

/** What a plan costs the owner: price + GST + the online payment fee on top */
async function quote(plan, settings) {
  const s = settings || (await plans());
  const price = plan === 'yearly' ? s.yearly_price : s.monthly_price;
  const rules = await billing.bookingRules();
  const gst = r2((price * s.gst_percent) / 100);
  const fee = r2(((price + gst) * Number(rules.gateway_fee_percent || 0)) / 100);
  return {
    plan,
    label: PLAN_LABELS[plan],
    price: r2(price),
    gst_percent: s.gst_percent,
    gst_amount: gst,
    gateway_fee_percent: Number(rules.gateway_fee_percent || 0),
    gateway_fee: fee,
    total: r2(price + gst + fee)
  };
}

/** Where a subscription stands right now */
function stateOf(row, settings, now = new Date()) {
  if (!row) return { state: 'none', allowed: true };
  const due = new Date(row.dueAt);
  const graceEnd = new Date(due.getTime() + settings.grace_days * DAY);
  let state;
  if (now <= due) state = row.plan === 'trial' ? 'trial' : 'active';
  else if (now <= graceEnd) state = 'grace';
  else state = 'expired';
  const daysLeft = Math.ceil((due - now) / DAY);
  const graceDaysLeft = Math.max(0, Math.ceil((graceEnd - now) / DAY));
  // red: ending soon, or already past the due date
  const red = state === 'grace' || state === 'expired' || (daysLeft <= settings.warn_days);
  return { state, allowed: state !== 'expired', days_left: daysLeft, grace_days_left: graceDaysLeft, grace_ends_at: iso(graceEnd), level: red ? 'red' : (state === 'trial' ? 'info' : 'ok') };
}

const messageOf = (s) => {
  if (s.state === 'expired') return 'Your subscription has expired. Renew it to get booking requests again.';
  if (s.state === 'grace') return `Payment is overdue. Pay within ${s.grace_days_left} day${s.grace_days_left === 1 ? '' : 's'} to keep getting booking requests.`;
  if (s.days_left <= 0) return s.state === 'trial' ? 'Your free trial ends today.' : 'Your subscription is due today.';
  if (s.level === 'red') return s.state === 'trial' ? `Your free trial ends in ${s.days_left} day${s.days_left === 1 ? '' : 's'}.` : `Your subscription is due in ${s.days_left} day${s.days_left === 1 ? '' : 's'}.`;
  return s.state === 'trial' ? `Free trial: ${s.days_left} days left.` : `Next payment due in ${s.days_left} days.`;
};

class SubscriptionService {
  async plans() {
    return plans();
  }

  async savePlans(input, adminId) {
    return savePlans(input, adminId);
  }

  /** The prices the owner sees: price, GST, online payment fee and the total for each plan */
  async offer() {
    const s = await plans();
    return {
      trial_days: s.trial_days,
      grace_days: s.grace_days,
      warn_days: s.warn_days,
      plans: [await quote('monthly', s), await quote('yearly', s)]
    };
  }

  async rowOf(ownerId) {
    return OwnerSubscription.findByPk(ownerId);
  }

  /** Status of one owner; with autoTrial an owner who has never chosen a plan gets the free trial now */
  async summary(ownerId, { autoTrial = false } = {}) {
    const s = await plans();
    let row = await this.rowOf(ownerId);
    if (!row && autoTrial) row = await this.createTrial(ownerId, s).catch(() => this.rowOf(ownerId));
    const st = stateOf(row, s);
    if (!row) return { state: 'none', allowed: true, level: 'ok', message: null, plan: null, offer: await this.offer() };
    return {
      ...st,
      plan: row.plan,
      plan_label: PLAN_LABELS[row.plan],
      started_at: iso(row.startedAt),
      period_start: iso(row.periodStart),
      due_at: iso(row.dueAt),
      last_paid_at: iso(row.lastPaidAt),
      message: messageOf(st),
      offer: await this.offer()
    };
  }

  async createTrial(ownerId, settings) {
    const s = settings || (await plans());
    const now = new Date();
    return OwnerSubscription.create({
      ownerId, plan: 'trial', startedAt: now, periodStart: now, dueAt: new Date(now.getTime() + s.trial_days * DAY)
    });
  }

  async startTrial(ownerId) {
    if (await this.rowOf(ownerId)) throw new ServiceError('You already have a subscription.', 409);
    await this.createTrial(ownerId);
    return this.summary(ownerId);
  }

  /** Razorpay order for a monthly or yearly plan */
  async order(ownerId, input = {}) {
    const plan = String(input.plan || '');
    if (!['monthly', 'yearly'].includes(plan)) throw new ServiceError('plan must be monthly or yearly.');
    const q = await quote(plan);
    if (!(q.price > 0)) throw new ServiceError('This plan is not available yet.', 409);
    const payment = await SubscriptionPayment.create({
      paymentCode: code(), ownerId, plan, baseAmount: q.price, gstAmount: q.gst_amount, gatewayFee: q.gateway_fee, totalAmount: q.total, status: 'initiated'
    });
    const order = await gateway.createOrder({
      amount: q.total,
      receipt: payment.paymentCode,
      notes: { subscription_payment_id: payment.id, owner_id: ownerId, plan }
    });
    await payment.update({ gatewayOrderId: order.orderId });
    const owner = await User.findByPk(ownerId, { attributes: ['fullName', 'mobileNumber', 'countryCode'] });
    return {
      key_id: gateway.keyId(),
      order_id: order.orderId,
      amount_paise: order.amountPaise,
      amount: q.total,
      currency: order.currency,
      plan,
      quote: q,
      name: 'Cranezo',
      description: `${PLAN_LABELS[plan]} subscription`,
      prefill: { name: owner ? owner.fullName : null, contact: owner ? `${owner.countryCode || ''}${owner.mobileNumber || ''}` : null }
    };
  }

  async paymentFor(ownerId, orderId) {
    const payment = await SubscriptionPayment.findOne({ where: { ownerId, gatewayOrderId: String(orderId || '') } });
    if (!payment) throw new ServiceError('Payment not found.', 404);
    return payment;
  }

  async verify(ownerId, input = {}) {
    const orderId = String(input.razorpay_order_id || '');
    const paymentId = String(input.razorpay_payment_id || '');
    const signature = String(input.razorpay_signature || '');
    const payment = await this.paymentFor(ownerId, orderId);
    if (payment.status === 'success') return this.summary(ownerId); // repeat call
    if (!gateway.verifySignature(orderId, paymentId, signature)) {
      // the callback can break (UPI app switch, app killed): ask Razorpay before giving up
      const paid = await gateway.paidPaymentFor(orderId).catch(() => null);
      if (!paid) {
        await payment.update({ status: 'failed', failureReason: 'Signature check failed', gatewayPaymentId: paymentId || null });
        throw new ServiceError('We could not confirm this payment. If money was taken, it will be returned.', 400);
      }
      await this.apply(payment, paid.paymentId);
      return this.summary(ownerId);
    }
    await this.apply(payment, paymentId);
    return this.summary(ownerId);
  }

  /** The app lost the answer: ask Razorpay whether the order was paid */
  async sync(ownerId, input = {}) {
    const payment = await this.paymentFor(ownerId, input.order_id || input.razorpay_order_id);
    if (payment.status !== 'success') {
      const paid = await gateway.paidPaymentFor(payment.gatewayOrderId).catch(() => null);
      if (paid) await this.apply(payment, paid.paymentId);
    }
    return this.summary(ownerId);
  }

  /** Marks the payment paid and moves the due date: from the old due date while it is not expired, else from today */
  async apply(payment, gatewayPaymentId) {
    const s = await plans();
    await sequelize.transaction(async (transaction) => {
      const fresh = await SubscriptionPayment.findByPk(payment.id, { lock: transaction.LOCK.UPDATE, transaction });
      if (fresh.status === 'success') return;
      const now = new Date();
      const row = await OwnerSubscription.findByPk(fresh.ownerId, { lock: transaction.LOCK.UPDATE, transaction });
      const live = row && now <= new Date(new Date(row.dueAt).getTime() + s.grace_days * DAY);
      const start = live ? new Date(row.dueAt) : now;
      const end = addPeriod(start, fresh.plan);
      if (row) {
        await row.update({ plan: fresh.plan, periodStart: start, dueAt: end, lastPaidAt: now, remindedAt: null }, { transaction });
      } else {
        await OwnerSubscription.create({ ownerId: fresh.ownerId, plan: fresh.plan, startedAt: now, periodStart: start, dueAt: end, lastPaidAt: now }, { transaction });
      }
      await fresh.update({ status: 'success', gatewayPaymentId, periodStart: start, periodEnd: end, failureReason: null }, { transaction });
      payment.dueAfter = end;
    });
    const row = await this.rowOf(payment.ownerId);
    await notificationService.notify(payment.ownerId, {
      type: 'subscription_paid',
      title: 'Subscription Active',
      body: `Thank you. Your subscription is active until ${new Date(row.dueAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.`,
      data: { payment_id: payment.id }
    }).catch(() => {});
  }

  /** Owners whose subscription has run out (after the grace days): they get no requests and cannot accept */
  async blockedOwnerIds(ownerIds) {
    if (!ownerIds.length) return new Set();
    const s = await plans();
    const cutoff = new Date(Date.now() - s.grace_days * DAY);
    const rows = await OwnerSubscription.findAll({ where: { ownerId: ownerIds, dueAt: { [Op.lt]: cutoff } }, attributes: ['ownerId'] });
    return new Set(rows.map((r) => r.ownerId));
  }

  async assertActive(ownerId) {
    const blocked = await this.blockedOwnerIds([ownerId]);
    if (blocked.has(ownerId)) throw new ServiceError('Your subscription has expired. Renew it to accept booking requests.', 409);
  }

  /** Admin: every owner with the plan, from date, due date and state */
  async adminList(input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const s = await plans();
    const owners = await User.findAll({
      where: { roleId: 1, isDeleted: 0 },
      attributes: ['id', 'fullName', 'companyName', 'memberId', 'mobileNumber', 'countryCode'],
      order: [['createdAt', 'DESC']],
      limit: 5000
    });
    const rows = await OwnerSubscription.findAll({ where: { ownerId: owners.map((o) => o.id) } });
    const byOwner = new Map(rows.map((r) => [r.ownerId, r]));
    let items = owners.map((o) => {
      const row = byOwner.get(o.id);
      const st = stateOf(row, s);
      return {
        owner: { id: o.id, name: o.companyName || o.fullName, member_id: o.memberId, mobile: `${o.countryCode || ''}${o.mobileNumber || ''}` },
        state: st.state,
        plan: row ? row.plan : null,
        plan_label: row ? PLAN_LABELS[row.plan] : null,
        from_date: row ? iso(row.periodStart) : null,
        started_at: row ? iso(row.startedAt) : null,
        due_at: row ? iso(row.dueAt) : null,
        days_left: row ? st.days_left : null,
        grace_ends_at: row ? st.grace_ends_at : null,
        level: row ? st.level : 'ok',
        last_paid_at: row ? iso(row.lastPaidAt) : null
      };
    });
    const counts = { trial: 0, active: 0, grace: 0, expired: 0, none: 0, due_soon: 0 };
    items.forEach((i) => {
      counts[i.state] += 1;
      if ((i.state === 'trial' || i.state === 'active') && i.level === 'red') counts.due_soon += 1;
    });
    const filter = String(input.state || '').trim();
    if (filter === 'due_soon') items = items.filter((i) => (i.state === 'trial' || i.state === 'active') && i.level === 'red');
    else if (filter) items = items.filter((i) => i.state === filter);
    const search = String(input.search || '').trim().toLowerCase();
    if (search) items = items.filter((i) => `${i.owner.name} ${i.owner.member_id} ${i.owner.mobile}`.toLowerCase().includes(search));
    // the ones that need attention first: red, then by due date
    items.sort((a, b) => (a.level === 'red' ? 0 : 1) - (b.level === 'red' ? 0 : 1) || String(a.due_at || '9').localeCompare(String(b.due_at || '9')));
    return { counts, total: items.length, range, items: items.slice(range.offset, range.offset + range.limit) };
  }

  /** Once a day an owner whose due date is near (or past) gets a reminder */
  async sendReminders() {
    const s = await plans();
    const now = new Date();
    const rows = await OwnerSubscription.findAll({
      where: {
        dueAt: { [Op.lte]: new Date(now.getTime() + s.warn_days * DAY), [Op.gte]: new Date(now.getTime() - (s.grace_days + 1) * DAY) },
        [Op.or]: [{ remindedAt: null }, { remindedAt: { [Op.lt]: new Date(now.getTime() - 20 * 60 * 60 * 1000) } }]
      }
    });
    for (const row of rows) {
      const st = stateOf(row, s, now);
      if (st.state === 'expired') continue;
      // eslint-disable-next-line no-await-in-loop
      await notificationService.notify(row.ownerId, {
        type: 'subscription_due',
        title: st.state === 'grace' ? 'Subscription Overdue' : 'Subscription Due Soon',
        body: messageOf(st),
        data: { screen: 'subscription' }
      }).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await row.update({ remindedAt: now });
    }
    return rows.length;
  }
}

module.exports = { subscriptionService: new SubscriptionService() };
