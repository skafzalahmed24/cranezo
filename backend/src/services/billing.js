/**
 * Every amount the apps show comes from here, so the customer bill, the owner's earnings,
 * the operator's commission and the admin's settlement figures always agree.
 *
 *   subtotal     = crane hire (booked hours) + approved extra time
 *   charges      = owner's additional charges, each fixed or a % of the subtotal
 *   taxable      = subtotal + charges
 *   gst          = owner's GST % of taxable
 *   gateway fee  = online payment fee (Razorpay, ~2%) of taxable + gst, paid by the customer
 *   total        = taxable + gst + gateway fee          -> the customer pays this
 *   platform fee = Super Admin's % of taxable (GST is tax, never commissioned)
 *   owner gets   = total - platform fee - gateway fee   (the gateway fee goes to Razorpay, never to the owner)
 *   commission   = operator's commission (percent of subtotal, per km, or fixed), paid by the owner
 *   owner share  = owner gets - commission - gst          -> what the owner keeps after paying everyone
 */
const { PlatformSetting, OwnerBillingSetting, PriceMinimum } = require('../models');
const { ServiceError } = require('./crane.service');

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const num = (v, fallback = 0) => (v === null || v === undefined || v === '' ? fallback : Number(v));

const CHARGE_TYPES = ['fixed', 'percent'];
// per_km is kept only so older jobs still read; owners can no longer choose it
const COMMISSION_TYPES = ['percent', 'fixed'];
const COMMISSION_LABELS = { percent: '% of job value', per_km: 'Per km', fixed: 'Fixed ₹ per job' };
const DEFAULT_FEE_PERCENT = 5;
const MAX_CHARGES = 10;

// ---------------------------------------------------------------- settings

let feeCache = null; // { value, at }
const FEE_CACHE_MS = 30 * 1000;

async function platformFeePercent() {
  if (feeCache && Date.now() - feeCache.at < FEE_CACHE_MS) return feeCache.value;
  const row = await PlatformSetting.findByPk('platform_fee_percent');
  const value = row ? num(row.value, DEFAULT_FEE_PERCENT) : DEFAULT_FEE_PERCENT;
  feeCache = { value, at: Date.now() };
  return value;
}

async function setPlatformFeePercent(value, adminId) {
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent < 0 || percent > 50) {
    throw new ServiceError('platform_fee_percent must be a number from 0 to 50.');
  }
  const rounded = r2(percent);
  await PlatformSetting.upsert({
    key: 'platform_fee_percent',
    value: rounded,
    description: 'Platform fee taken from every completed job, as a % of the amount before GST',
    updatedBy: adminId ? String(adminId) : null
  });
  feeCache = null;
  return rounded;
}

// ---------------------------------------------------------------- booking request rules (Super Admin)

const DEFAULT_RULES = {
  search_radius_km: 20,
  free_km: 7,
  min_per_km_rate: 50,
  request_minutes: 15,
  raise_after_minutes: 2,
  raise_step_percent: 10,
  raise_min_step: 100,
  payment_window_minutes: 10,
  // online payment fee added to the customer's bill (Razorpay)
  gateway_fee_percent: 2,
  // the operator can mark arrival only this close to the site
  arrival_radius_km: 1
};
const RULE_LIMITS = {
  search_radius_km: [1, 200],
  free_km: [0, 100],
  min_per_km_rate: [0, 10000],
  request_minutes: [2, 120],
  raise_after_minutes: [1, 60],
  raise_step_percent: [1, 100],
  raise_min_step: [0, 100000],
  payment_window_minutes: [2, 120],
  gateway_fee_percent: [0, 10],
  arrival_radius_km: [0.1, 20]
};

/**
 * ARRIVAL_CHECK_REQUIRED in .env (default true). true: the operator must reach the site before "arrived" works,
 * and the operator app shows the map and the Google Maps button. false: no location check, no map for the operator.
 */
const arrivalCheckRequired = () => !['false', '0', 'no', 'off'].includes(String(process.env.ARRIVAL_CHECK_REQUIRED || 'true').trim().toLowerCase());

let rulesCache = null;
async function bookingRules() {
  if (rulesCache && Date.now() - rulesCache.at < FEE_CACHE_MS) return rulesCache.value;
  const row = await PlatformSetting.findByPk('booking_rules');
  const value = { ...DEFAULT_RULES, ...((row && row.value) || {}) };
  rulesCache = { value, at: Date.now() };
  return value;
}

async function setBookingRules(input = {}, adminId) {
  const current = await bookingRules();
  const next = { ...current };
  for (const [key, [min, max]] of Object.entries(RULE_LIMITS)) {
    if (input[key] === undefined) continue;
    const v = Number(input[key]);
    if (!Number.isFinite(v) || v < min || v > max) throw new ServiceError(`${key} must be a number from ${min} to ${max}.`);
    next[key] = r2(v);
  }
  await PlatformSetting.upsert({
    key: 'booking_rules',
    value: next,
    description: 'Booking requests: search radius, free distance, minimum ₹/km, request time, price raise and payment time limit',
    updatedBy: adminId ? String(adminId) : null
  });
  rulesCache = null;
  return next;
}

/** Admin minimum crane hire per hour for a crane type + capacity (0 when the admin has not set one) */
async function minHourlyFor(craneType, capacity) {
  const row = await PriceMinimum.findOne({ where: { craneType, capacity } });
  return row ? num(row.minHourlyRate) : 0;
}

/** Admin: every crane type x capacity with its minimum hourly rate (0 = not set) */
async function listMinimums() {
  const { StaticDropdown } = require('../models');
  const { DROPDOWN_TYPES } = require('../constants/dropdownTypes');
  const options = await StaticDropdown.findAll({
    where: { dropdownType: [DROPDOWN_TYPES.CRANE_TYPE, DROPDOWN_TYPES.CRANE_CAPACITY], dropdownTypeStatus: 0 },
    order: [['id', 'ASC']]
  });
  const types = options.filter((o) => o.dropdownType === DROPDOWN_TYPES.CRANE_TYPE);
  const capacities = options.filter((o) => o.dropdownType === DROPDOWN_TYPES.CRANE_CAPACITY);
  const rows = await PriceMinimum.findAll();
  const key = (t, c) => `${t}:${c}`;
  const byKey = new Map(rows.map((r) => [key(r.craneType, r.capacity), num(r.minHourlyRate)]));
  return {
    crane_types: types.map((t) => ({ id: t.id, name: t.dropdownName })),
    capacities: capacities.map((c) => ({ id: c.id, name: c.dropdownName })),
    minimums: rows.map((r) => ({ crane_type: r.craneType, capacity: r.capacity, min_hourly_rate: num(r.minHourlyRate) })),
    get: (t, c) => byKey.get(key(t, c)) || 0
  };
}

/** Admin: set (or clear with 0) the minimum hourly rate for one crane type + capacity */
async function saveMinimum({ crane_type: craneType, capacity, min_hourly_rate: rate }) {
  const t = Number(craneType);
  const c = Number(capacity);
  const v = Number(rate);
  if (!Number.isInteger(t) || !Number.isInteger(c)) throw new ServiceError('crane_type and capacity are required.');
  if (!Number.isFinite(v) || v < 0) throw new ServiceError('min_hourly_rate must be 0 or more.');
  if (v === 0) {
    await PriceMinimum.destroy({ where: { craneType: t, capacity: c } });
  } else {
    const row = await PriceMinimum.findOne({ where: { craneType: t, capacity: c } });
    if (row) await row.update({ minHourlyRate: r2(v) });
    else await PriceMinimum.create({ craneType: t, capacity: c, minHourlyRate: r2(v) });
  }
  return { crane_type: t, capacity: c, min_hourly_rate: r2(v) };
}

/** Distance charge: nothing for the first free km, then ₹/km for the rest (one way, crane to site) */
function distanceChargeFor(distanceKm, perKmRate, rules) {
  const extraKm = Math.max(0, num(distanceKm) - num(rules.free_km));
  const rate = Math.max(num(perKmRate), num(rules.min_per_km_rate));
  return { extra_km: r2(extraKm), per_km_rate: r2(rate), amount: r2(extraKm * rate) };
}

/** Owner's billing settings, with defaults when the owner never saved any */
async function ownerSettings(ownerId) {
  const row = ownerId ? await OwnerBillingSetting.findByPk(ownerId) : null;
  return {
    gst_percent: row ? num(row.gstPercent) : 0,
    gst_number: row ? row.gstNumber : null,
    charges: row && Array.isArray(row.charges) ? row.charges : [],
    default_commission_type: row ? row.defaultCommissionType : 'percent',
    default_commission_value: row ? num(row.defaultCommissionValue) : 0,
    advance_percent: row ? row.advancePercent : 20,
    per_km_rate: row ? num(row.perKmRate) : 0
  };
}

const cleanCharges = (list) => {
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list)) throw new ServiceError('charges must be a list.');
  if (list.length > MAX_CHARGES) throw new ServiceError(`You can add up to ${MAX_CHARGES} charges.`);
  return list.map((c, i) => {
    const name = String((c && c.name) || '').trim().slice(0, 60);
    if (!name) throw new ServiceError(`Charge ${i + 1}: name is required.`);
    const type = String((c && c.type) || 'fixed').toLowerCase();
    if (!CHARGE_TYPES.includes(type)) throw new ServiceError(`${name}: type must be fixed or percent.`);
    const value = Number(c.value);
    if (!Number.isFinite(value) || value < 0) throw new ServiceError(`${name}: value must be 0 or more.`);
    if (type === 'percent' && value > 100) throw new ServiceError(`${name}: a percentage cannot be more than 100.`);
    return { name, type, value: r2(value) };
  });
};

const cleanCommission = (type, value) => {
  const t = String(type || '').toLowerCase();
  if (!COMMISSION_TYPES.includes(t)) throw new ServiceError('commission type must be percent or fixed.');
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0) throw new ServiceError('commission value must be 0 or more.');
  if (t === 'percent' && v > 100) throw new ServiceError('A commission percentage cannot be more than 100.');
  return { type: t, value: r2(v) };
};

async function saveOwnerSettings(ownerId, input = {}) {
  const current = await ownerSettings(ownerId);
  const gst = input.gst_percent !== undefined ? Number(input.gst_percent) : current.gst_percent;
  if (!Number.isFinite(gst) || gst < 0 || gst > 28) throw new ServiceError('gst_percent must be from 0 to 28.');
  let gstNumber = input.gst_number !== undefined ? String(input.gst_number || '').trim().toUpperCase() : current.gst_number;
  if (gstNumber && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstNumber)) {
    throw new ServiceError('gst_number is not a valid GST registration number.');
  }
  if (!gstNumber) gstNumber = null;
  const charges = input.charges !== undefined ? cleanCharges(input.charges) : current.charges;
  const commission = (input.default_commission_type !== undefined || input.default_commission_value !== undefined)
    ? cleanCommission(
      input.default_commission_type !== undefined ? input.default_commission_type : current.default_commission_type,
      input.default_commission_value !== undefined ? input.default_commission_value : current.default_commission_value
    )
    : { type: current.default_commission_type, value: current.default_commission_value };

  const advance = input.advance_percent !== undefined ? Number(input.advance_percent) : current.advance_percent;
  if (!Number.isInteger(advance) || advance < 0 || advance > 100) throw new ServiceError('advance_percent must be a whole number from 0 to 100.');
  const rules = await bookingRules();
  const perKm = input.per_km_rate !== undefined ? Number(input.per_km_rate) : current.per_km_rate;
  if (!Number.isFinite(perKm) || perKm < 0) throw new ServiceError('per_km_rate must be 0 or more.');
  if (input.per_km_rate !== undefined && perKm < num(rules.min_per_km_rate)) {
    throw new ServiceError(`The rate per km cannot be less than ₹${num(rules.min_per_km_rate)} (Cranezo minimum).`);
  }

  await OwnerBillingSetting.upsert({
    ownerId,
    gstPercent: r2(gst),
    gstNumber,
    charges,
    defaultCommissionType: commission.type,
    defaultCommissionValue: commission.value,
    advancePercent: advance,
    perKmRate: r2(perKm)
  });
  return ownerSettings(ownerId);
}

// ---------------------------------------------------------------- calculations

const chargeLines = (charges, subtotal) => (Array.isArray(charges) ? charges : []).map((c) => ({
  name: c.name,
  type: c.type,
  value: num(c.value),
  amount: c.type === 'percent' ? r2((subtotal * num(c.value)) / 100) : r2(num(c.value))
}));

/** Quote before a booking exists (crane details / booking confirm screen) */
function quote({ craneRental, extraAmount = 0, distanceCharge = 0, charges = [], gstPercent = 0, gatewayFeePercent = 0 }) {
  const subtotal = r2(num(craneRental) + num(extraAmount) + num(distanceCharge));
  const lines = chargeLines(charges, subtotal);
  const chargesAmount = r2(lines.reduce((s, l) => s + l.amount, 0));
  const taxable = r2(subtotal + chargesAmount);
  const gst = r2((taxable * num(gstPercent)) / 100);
  const gatewayFee = r2(((taxable + gst) * num(gatewayFeePercent)) / 100);
  return {
    crane_hire: r2(num(craneRental)),
    extra_time: r2(num(extraAmount)),
    distance_charge: r2(num(distanceCharge)),
    subtotal,
    charges: lines,
    charges_amount: chargesAmount,
    taxable_amount: taxable,
    gst_percent: num(gstPercent),
    gst_amount: gst,
    gateway_fee_percent: num(gatewayFeePercent),
    gateway_fee: gatewayFee,
    total: r2(taxable + gst + gatewayFee)
  };
}

const commissionOf = (b, subtotal) => {
  if (!b.operatorCommissionType) return { type: null, type_label: null, value: null, amount: 0, set: false };
  const value = num(b.operatorCommissionValue);
  let amount;
  if (b.operatorCommissionType === 'percent') amount = r2((subtotal * value) / 100);
  else if (b.operatorCommissionType === 'per_km') amount = r2(value * num(b.distanceKm));
  else amount = r2(value);
  // once the job is completed the stored amount is final
  if (b.operatorCommissionAmount !== null && b.operatorCommissionAmount !== undefined && b.completedAt) {
    amount = num(b.operatorCommissionAmount);
  }
  return {
    type: b.operatorCommissionType,
    type_label: COMMISSION_LABELS[b.operatorCommissionType],
    value,
    distance_km: b.operatorCommissionType === 'per_km' ? num(b.distanceKm) : null,
    amount,
    set: true
  };
};

/**
 * Full bill of a booking. Completed jobs use the stored (frozen) fee; open jobs use today's fee.
 * @param {object} b Booking
 * @param {number} currentFeePercent from platformFeePercent()
 */
function billOf(b, currentFeePercent = DEFAULT_FEE_PERCENT) {
  const q = quote({ craneRental: b.totalAmount, extraAmount: b.extraAmount, distanceCharge: b.distanceCharge, charges: b.charges || [], gstPercent: b.gstPercent, gatewayFeePercent: b.gatewayFeePercent });
  const frozen = !!b.completedAt && b.platformFeePercent !== null && b.platformFeePercent !== undefined;
  const feePercent = frozen ? num(b.platformFeePercent) : num(currentFeePercent);
  const fee = frozen && b.platformFeeAmount !== null && b.platformFeeAmount !== undefined
    ? num(b.platformFeeAmount)
    : r2((q.taxable_amount * feePercent) / 100);
  const ownerReceives = r2(q.total - fee - q.gateway_fee);
  const commission = commissionOf(b, q.subtotal);
  const ownerShare = r2(ownerReceives - commission.amount - q.gst_amount);
  return {
    ...q,
    platform_fee_percent: feePercent,
    platform_fee: fee,
    owner_receives: ownerReceives,
    operator_commission: commission,
    owner_share: ownerShare,
    final: frozen
  };
}

/** Columns to store when a job is completed, so later setting changes never rewrite history */
function freezeColumns(b, feePercent) {
  const bill = billOf({ ...b.get ? b.get({ plain: true }) : b, completedAt: null }, feePercent);
  return {
    subtotalAmount: bill.subtotal,
    chargesAmount: bill.charges_amount,
    charges: bill.charges.map(({ name, type, value }) => ({ name, type, value })),
    gstAmount: bill.gst_amount,
    finalAmount: bill.total,
    platformFeePercent: bill.platform_fee_percent,
    platformFeeAmount: bill.platform_fee,
    netAmount: bill.owner_receives,
    operatorCommissionAmount: bill.operator_commission.set ? bill.operator_commission.amount : null,
    ownerShareAmount: bill.owner_share
  };
}

/** Lines for a transparent breakdown screen (customer sees the first part, owner/admin see all) */
function breakdownLines(bill, { audience = 'customer' } = {}) {
  const lines = [{ key: 'crane_hire', label: 'Crane hire', amount: bill.crane_hire }];
  if (bill.extra_time > 0) lines.push({ key: 'extra_time', label: 'Extra time', amount: bill.extra_time });
  if (bill.distance_charge > 0) lines.push({ key: 'distance', label: 'Distance charge', amount: bill.distance_charge });
  bill.charges.forEach((c, i) => lines.push({
    key: `charge_${i}`,
    label: c.type === 'percent' ? `${c.name} (${c.value}%)` : c.name,
    amount: c.amount
  }));
  if (bill.gst_amount > 0) lines.push({ key: 'gst', label: `GST (${bill.gst_percent}%)`, amount: bill.gst_amount });
  if (bill.gateway_fee > 0) lines.push({ key: 'gateway_fee', label: `Online payment fee (${bill.gateway_fee_percent}%, Razorpay)`, amount: bill.gateway_fee });
  lines.push({ key: 'total', label: 'Total payable', amount: bill.total, total: true });
  if (audience === 'customer') return lines;

  if (bill.gateway_fee > 0) lines.push({ key: 'gateway_fee_out', label: 'Online payment fee (to Razorpay)', amount: -bill.gateway_fee });
  lines.push({ key: 'platform_fee', label: `Platform fee (${bill.platform_fee_percent}%)`, amount: -bill.platform_fee });
  lines.push({ key: 'owner_receives', label: 'Owner receives', amount: bill.owner_receives, total: true });
  if (bill.operator_commission.set) {
    lines.push({ key: 'operator_commission', label: 'Operator commission', amount: -bill.operator_commission.amount });
  }
  if (bill.gst_amount > 0) lines.push({ key: 'gst_payable', label: 'GST to pay to government', amount: -bill.gst_amount });
  lines.push({ key: 'owner_share', label: "Owner's share", amount: bill.owner_share, total: true });
  return lines;
}

/**
 * Settlement between the platform and the owner for one paid job.
 * The platform holds the online payments (advance, gateway); the owner holds the cash.
 * > 0: the platform pays the owner; < 0: the owner pays the platform its fee.
 */
function platformBalanceOf(b, bill) {
  let held = num(b.platformCollectedAmount);
  // jobs paid fully online before the advance flow existed
  if (held === 0 && b.paymentCollectedBy === 'platform') held = num(b.paidAmount) || bill.total;
  // the gateway fee was taken by Razorpay from what the platform holds
  return r2(held - bill.platform_fee - num(bill.gateway_fee));
}

module.exports = {
  r2,
  DEFAULT_RULES,
  bookingRules,
  arrivalCheckRequired,
  setBookingRules,
  minHourlyFor,
  listMinimums,
  saveMinimum,
  distanceChargeFor,
  platformBalanceOf,
  CHARGE_TYPES,
  COMMISSION_TYPES,
  COMMISSION_LABELS,
  platformFeePercent,
  setPlatformFeePercent,
  ownerSettings,
  saveOwnerSettings,
  cleanCommission,
  quote,
  billOf,
  freezeColumns,
  breakdownLines
};
