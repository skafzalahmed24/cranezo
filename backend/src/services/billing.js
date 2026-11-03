/**
 * Every amount the apps show comes from here, so the customer bill, the owner's earnings,
 * the operator's commission and the admin's settlement figures always agree.
 *
 *   subtotal     = crane hire (booked hours) + approved extra time
 *   charges      = owner's additional charges, each fixed or a % of the subtotal
 *   taxable      = subtotal + charges
 *   gst          = owner's GST % of taxable
 *   total        = taxable + gst                        -> the customer pays this
 *   platform fee = Super Admin's % of taxable (GST is tax, never commissioned)
 *   owner gets   = total - platform fee
 *   commission   = operator's commission (percent of subtotal, per km, or fixed), paid by the owner
 *   owner share  = owner gets - commission - gst          -> what the owner keeps after paying everyone
 */
const { PlatformSetting, OwnerBillingSetting } = require('../models');
const { ServiceError } = require('./crane.service');

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const num = (v, fallback = 0) => (v === null || v === undefined || v === '' ? fallback : Number(v));

const CHARGE_TYPES = ['fixed', 'percent'];
const COMMISSION_TYPES = ['percent', 'per_km', 'fixed'];
const COMMISSION_LABELS = { percent: '% of job amount', per_km: 'Per km', fixed: 'Fixed amount' };
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

/** Owner's billing settings, with defaults when the owner never saved any */
async function ownerSettings(ownerId) {
  const row = ownerId ? await OwnerBillingSetting.findByPk(ownerId) : null;
  return {
    gst_percent: row ? num(row.gstPercent) : 0,
    gst_number: row ? row.gstNumber : null,
    charges: row && Array.isArray(row.charges) ? row.charges : [],
    default_commission_type: row ? row.defaultCommissionType : 'percent',
    default_commission_value: row ? num(row.defaultCommissionValue) : 0
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
  if (!COMMISSION_TYPES.includes(t)) throw new ServiceError('commission type must be percent, per_km or fixed.');
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

  await OwnerBillingSetting.upsert({
    ownerId,
    gstPercent: r2(gst),
    gstNumber,
    charges,
    defaultCommissionType: commission.type,
    defaultCommissionValue: commission.value
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
function quote({ craneRental, extraAmount = 0, charges = [], gstPercent = 0 }) {
  const subtotal = r2(num(craneRental) + num(extraAmount));
  const lines = chargeLines(charges, subtotal);
  const chargesAmount = r2(lines.reduce((s, l) => s + l.amount, 0));
  const taxable = r2(subtotal + chargesAmount);
  const gst = r2((taxable * num(gstPercent)) / 100);
  return {
    crane_hire: r2(num(craneRental)),
    extra_time: r2(num(extraAmount)),
    subtotal,
    charges: lines,
    charges_amount: chargesAmount,
    taxable_amount: taxable,
    gst_percent: num(gstPercent),
    gst_amount: gst,
    total: r2(taxable + gst)
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
  const q = quote({ craneRental: b.totalAmount, extraAmount: b.extraAmount, charges: b.charges || [], gstPercent: b.gstPercent });
  const frozen = !!b.completedAt && b.platformFeePercent !== null && b.platformFeePercent !== undefined;
  const feePercent = frozen ? num(b.platformFeePercent) : num(currentFeePercent);
  const fee = frozen && b.platformFeeAmount !== null && b.platformFeeAmount !== undefined
    ? num(b.platformFeeAmount)
    : r2((q.taxable_amount * feePercent) / 100);
  const ownerReceives = r2(q.total - fee);
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
  bill.charges.forEach((c, i) => lines.push({
    key: `charge_${i}`,
    label: c.type === 'percent' ? `${c.name} (${c.value}%)` : c.name,
    amount: c.amount
  }));
  if (bill.gst_amount > 0) lines.push({ key: 'gst', label: `GST (${bill.gst_percent}%)`, amount: bill.gst_amount });
  lines.push({ key: 'total', label: 'Total payable', amount: bill.total, total: true });
  if (audience === 'customer') return lines;

  lines.push({ key: 'platform_fee', label: `Platform fee (${bill.platform_fee_percent}%)`, amount: -bill.platform_fee });
  lines.push({ key: 'owner_receives', label: 'Owner receives', amount: bill.owner_receives, total: true });
  if (bill.operator_commission.set) {
    lines.push({ key: 'operator_commission', label: 'Operator commission', amount: -bill.operator_commission.amount });
  }
  if (bill.gst_amount > 0) lines.push({ key: 'gst_payable', label: 'GST to pay to government', amount: -bill.gst_amount });
  lines.push({ key: 'owner_share', label: "Owner's share", amount: bill.owner_share, total: true });
  return lines;
}

module.exports = {
  r2,
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
