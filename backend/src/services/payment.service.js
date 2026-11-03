const crypto = require('crypto');
const { Op } = require('sequelize');
const { PaymentTransaction, Booking, User } = require('../models');
const { PAYMENT_METHODS } = require('../constants/booking');
const { parseRange } = require('../utils/range');
const { ServiceError } = require('./crane.service');

const TX_STATUSES = ['initiated', 'success', 'failed', 'refunded'];
const STATUS_LABELS = { initiated: 'Processing', success: 'Successful', failed: 'Failed', refunded: 'Refunded' };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const iso = (d) => (d ? new Date(d).toISOString() : null);

const txCode = (d = new Date()) => `TXN${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  + `${String(d.getUTCDate()).padStart(2, '0')}${String(crypto.randomInt(0, 100000000)).padStart(8, '0')}`;

/** Cash is collected on site (by the owner's operator); gateway money lands in the platform's account */
const collectorOf = (method) => (method === 'COD' ? 'owner' : 'platform');

const view = (t) => {
  const method = PAYMENT_METHODS.find((m) => m.id === t.method);
  return {
    id: t.id,
    transaction_code: t.transactionCode,
    booking_id: t.bookingId,
    booking_code: t.booking ? t.booking.bookingCode : null,
    amount: Number(t.amount),
    method: t.method,
    method_name: method ? method.name : t.method,
    status: t.status,
    status_label: STATUS_LABELS[t.status] || t.status,
    collected_by: t.collectedBy,
    collected_by_label: t.collectedBy === 'owner' ? 'Cash with owner' : 'Platform account',
    gateway: t.gateway,
    gateway_payment_id: t.gatewayPaymentId,
    failure_reason: t.failureReason,
    customer: t.customer ? { id: t.customer.id, name: t.customer.companyName || t.customer.fullName } : null,
    owner: t.owner ? { id: t.owner.id, name: t.owner.companyName || t.owner.fullName, member_id: t.owner.memberId } : null,
    created_at: iso(t.createdAt)
  };
};

const include = [
  { model: Booking, as: 'booking', attributes: ['id', 'bookingCode'] },
  { model: User, as: 'customer', attributes: ['id', 'fullName', 'companyName'] },
  { model: User, as: 'owner', attributes: ['id', 'fullName', 'companyName', 'memberId'] }
];

class PaymentService {
  /** Adds one ledger row. Used by Cash on Delivery now and by the payment gateway webhook later. */
  async record({ booking, amount, method, status = 'success', gateway = null, gatewayOrderId = null, gatewayPaymentId = null, failureReason = null, meta = null }) {
    if (!TX_STATUSES.includes(status)) throw new ServiceError('Invalid transaction status.');
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        return await PaymentTransaction.create({
          transactionCode: txCode(),
          bookingId: booking.id,
          customerId: booking.customerId,
          ownerId: booking.ownerId,
          amount,
          method,
          status,
          collectedBy: collectorOf(method),
          gateway,
          gatewayOrderId,
          gatewayPaymentId,
          failureReason,
          meta
        });
      } catch (error) {
        const clash = error.name === 'SequelizeUniqueConstraintError';
        if (!clash || attempt === 2) throw error;
      }
    }
    return null;
  }

  async list(where, input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const filter = { ...where };
    if (input.status) {
      if (!TX_STATUSES.includes(input.status)) throw new ServiceError(`status must be one of: ${TX_STATUSES.join(', ')}.`);
      filter.status = input.status;
    }
    if (input.method) filter.method = String(input.method).toUpperCase();
    if (input.booking_id) {
      if (!UUID_RE.test(String(input.booking_id))) throw new ServiceError('booking_id is not valid.');
      filter.bookingId = input.booking_id;
    }
    if (input.from || input.to) {
      filter.createdAt = {};
      if (input.from) filter.createdAt[Op.gte] = new Date(input.from);
      if (input.to) filter.createdAt[Op.lte] = new Date(input.to);
    }
    const { rows, count } = await PaymentTransaction.findAndCountAll({
      where: filter,
      include,
      limit: range.limit,
      offset: range.offset,
      order: [['createdAt', 'DESC'], ['id', 'ASC']]
    });
    return { range, items: rows.map(view), total: count };
  }

  customerTransactions(customerId, input) { return this.list({ customerId }, input); }

  ownerTransactions(ownerId, input) { return this.list({ ownerId }, input); }

  async adminTransactions(input = {}) {
    const where = {};
    if (input.owner_id) where.ownerId = input.owner_id;
    if (input.customer_id) where.customerId = input.customer_id;
    if (input.search) {
      const term = `%${String(input.search).trim()}%`;
      where[Op.or] = [{ transactionCode: { [Op.iLike]: term } }, { '$booking.booking_code$': { [Op.iLike]: term } }];
    }
    return this.list(where, input);
  }

  async adminSummary() {
    const sum = async (where) => Number((await PaymentTransaction.sum('amount', { where })) || 0);
    return {
      total_collected: await sum({ status: 'success' }),
      cash_with_owners: await sum({ status: 'success', collectedBy: 'owner' }),
      in_platform_account: await sum({ status: 'success', collectedBy: 'platform' }),
      failed_count: await PaymentTransaction.count({ where: { status: 'failed' } }),
      transactions: await PaymentTransaction.count()
    };
  }
}

module.exports = { paymentService: new PaymentService(), TX_STATUSES, collectorOf };
