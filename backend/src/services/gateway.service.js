const crypto = require('crypto');
const { ServiceError } = require('./crane.service');

/**
 * Razorpay. The secret never leaves the server: the app only gets the Key ID and an order id,
 * opens Razorpay Checkout, and sends back (order id, payment id, signature), which we verify here.
 */
const keyId = () => process.env.RAZORPAY_KEY_ID || '';
const keySecret = () => process.env.RAZORPAY_KEY_SECRET || '';
const configured = () => !!(keyId() && keySecret());

async function createOrder({ amount, receipt, notes }) {
  if (!configured()) throw new ServiceError('Online payment is not set up yet. Please try again later.', 503);
  const paise = Math.round(Number(amount) * 100);
  if (!Number.isInteger(paise) || paise < 100) throw new ServiceError('The amount to pay must be at least ₹1.');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString('base64')}`
    },
    body: JSON.stringify({ amount: paise, currency: 'INR', receipt: String(receipt).slice(0, 40), notes: notes || {} })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.id) {
    const reason = body && body.error && body.error.description;
    throw new ServiceError(`Could not start the payment${reason ? `: ${reason}` : ''}. Please try again.`, 502);
  }
  return { orderId: body.id, amountPaise: body.amount, currency: body.currency };
}

const auth = () => `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString('base64')}`;

/**
 * The payment Razorpay holds for an order, if the customer really paid it (captured, or authorized and
 * captured here). Used when the app never got the success callback (UPI app switch, app killed, network).
 * Returns { paymentId } or null.
 */
async function paidPaymentFor(orderId) {
  if (!configured() || !orderId) return null;
  const res = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}/payments`, { headers: { Authorization: auth() } });
  if (!res.ok) return null;
  const body = await res.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];
  const captured = items.find((p) => p.status === 'captured');
  if (captured) return { paymentId: captured.id };
  const authorized = items.find((p) => p.status === 'authorized');
  if (!authorized) return null;
  // authorized but not captured yet (account without auto-capture): capture it now
  const cap = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(authorized.id)}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth() },
    body: JSON.stringify({ amount: authorized.amount, currency: authorized.currency || 'INR' })
  });
  const capBody = await cap.json().catch(() => ({}));
  return cap.ok || capBody.status === 'captured' ? { paymentId: authorized.id } : null;
}

/** Razorpay signs "order_id|payment_id" with the key secret (HMAC SHA256) */
function verifySignature(orderId, paymentId, signature) {
  if (!orderId || !paymentId || !signature) return false;
  const expected = crypto.createHmac('sha256', keySecret()).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { gateway: { configured, keyId, createOrder, verifySignature, paidPaymentFor } };
