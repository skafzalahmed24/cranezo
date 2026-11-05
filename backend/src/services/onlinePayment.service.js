const { Op } = require('sequelize');
const { Booking, PaymentTransaction, User } = require('../models');
const { BOOKING_STATUS } = require('../constants/booking');
const { ServiceError } = require('./crane.service');
const { paymentService } = require('./payment.service');
const { gateway } = require('./gateway.service');
const { bookingHelpers: H } = require('./booking.service');

const KINDS = ['advance', 'final'];
const r2 = (n) => Math.round(Number(n) * 100) / 100;

/**
 * Customer online payments through Razorpay:
 *   1. order:  the server works out the amount (never the app), creates a Razorpay order, logs it as "initiated"
 *   2. the app opens Razorpay Checkout with that order
 *   3. verify: the app sends Razorpay's (order id, payment id, signature); the server checks the signature,
 *      marks the ledger row "success" and applies it (advance -> booking confirmed, final -> booking paid)
 */
class OnlinePaymentService {
  async booking(customerId, bookingId) {
    if (!H.UUID_RE.test(String(bookingId || ''))) throw new ServiceError('A valid booking_id is required.');
    const b = await Booking.findOne({ where: { id: bookingId, customerId } });
    if (!b) throw new ServiceError('Booking not found.', 404);
    return b;
  }

  /** How much is due now for this kind of payment, with a readable reason when nothing can be paid */
  amountFor(b, kind) {
    const { customerJobService } = require('./customerJob.service');
    if (kind === 'advance') {
      if (b.status !== BOOKING_STATUS.AWAITING_PAYMENT) throw new ServiceError('This booking is not waiting for an advance.', 409);
      if (b.paymentDueAt && new Date() > new Date(b.paymentDueAt)) throw new ServiceError('The time to pay has run out. Please book again.', 410);
      return r2(b.advanceAmount);
    }
    if (b.status !== BOOKING_STATUS.COMPLETED) throw new ServiceError('You can pay once the job is completed.', 409);
    if (b.paymentStatus === 'paid') throw new ServiceError('This booking is already paid.', 409);
    return customerJobService.amountDue(b);
  }

  async order(customerId, input = {}) {
    const kind = String(input.kind || '');
    if (!KINDS.includes(kind)) throw new ServiceError('kind must be advance or final.');
    const b = await this.booking(customerId, input.booking_id);
    const amount = this.amountFor(b, kind);
    if (amount <= 0) throw new ServiceError('Nothing to pay.', 409);

    const order = await gateway.createOrder({
      amount,
      receipt: `${b.bookingCode}-${kind}`,
      notes: { booking_id: b.id, booking_code: b.bookingCode, kind }
    });
    // an older unpaid order for the same payment is no longer used
    await PaymentTransaction.update(
      { status: 'failed', failureReason: 'Replaced by a new payment attempt' },
      { where: { bookingId: b.id, status: 'initiated', meta: { kind } } }
    );
    await paymentService.record({
      booking: b, amount, method: 'ONLINE', status: 'initiated', gateway: 'razorpay', gatewayOrderId: order.orderId, meta: { kind }
    });
    const customer = await User.findByPk(customerId, { attributes: ['fullName', 'mobileNumber', 'countryCode'] });
    return {
      key_id: gateway.keyId(),
      order_id: order.orderId,
      amount_paise: order.amountPaise,
      amount,
      currency: order.currency,
      kind,
      name: 'Cranezo',
      description: kind === 'advance' ? `Advance for ${b.bookingCode}` : `Final payment for ${b.bookingCode}`,
      prefill: { name: customer ? customer.fullName : null, contact: customer ? `${customer.countryCode || ''}${customer.mobileNumber || ''}` : null }
    };
  }

  async verify(customerId, input = {}) {
    const orderId = String(input.razorpay_order_id || '');
    const paymentId = String(input.razorpay_payment_id || '');
    const signature = String(input.razorpay_signature || '');
    const b = await this.booking(customerId, input.booking_id);
    const tx = await PaymentTransaction.findOne({ where: { bookingId: b.id, gateway: 'razorpay', gatewayOrderId: orderId } });
    if (!tx) throw new ServiceError('Payment not found.', 404);
    const kind = (tx.meta && tx.meta.kind) || 'final';
    if (tx.status === 'success') return this.result(customerId, b, kind); // already applied (repeat call)

    if (!gateway.verifySignature(orderId, paymentId, signature)) {
      await tx.update({ status: 'failed', failureReason: 'Signature check failed', gatewayPaymentId: paymentId || null });
      throw new ServiceError('We could not confirm this payment. If money was taken, it will be refunded.', 400);
    }
    await tx.update({ status: 'success', gatewayPaymentId: paymentId, collectedBy: 'platform' });

    await b.reload();
    if (kind === 'advance') {
      if (b.status !== BOOKING_STATUS.AWAITING_PAYMENT) {
        // paid after the booking had already timed out: money is held for a refund by the team
        await tx.update({ meta: { ...(tx.meta || {}), needs_refund: true } });
        throw new ServiceError('The payment came after the booking expired. Your money will be refunded.', 409);
      }
      const { craneRequestService } = require('./craneRequest.service');
      await craneRequestService.confirmWithAdvance(b, { method: 'ONLINE', tx });
    } else {
      const { customerJobService } = require('./customerJob.service');
      await customerJobService.completeFinal(b, tx);
    }
    return this.result(customerId, await b.reload(), kind);
  }

  async failed(customerId, input = {}) {
    const b = await this.booking(customerId, input.booking_id);
    const tx = await PaymentTransaction.findOne({
      where: { bookingId: b.id, gateway: 'razorpay', gatewayOrderId: String(input.razorpay_order_id || ''), status: 'initiated' }
    });
    if (tx) await tx.update({ status: 'failed', failureReason: input.reason ? String(input.reason).slice(0, 300) : 'Payment cancelled or failed' });
    return { booking_id: b.id, recorded: !!tx };
  }

  async result(customerId, b, kind) {
    if (kind === 'advance' && b.craneRequestId) {
      const { craneRequestService } = require('./craneRequest.service');
      return { kind, request: await craneRequestService.get(customerId, b.craneRequestId) };
    }
    const { customerJobService } = require('./customerJob.service');
    return { kind, booking: await customerJobService.get(customerId, b.id) };
  }
}

module.exports = { onlinePaymentService: new OnlinePaymentService(), Op };
