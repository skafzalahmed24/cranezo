const { Op } = require('sequelize');
const { Lead, Banner } = require('../models');
const C = require('../constants/leads');
const { parseRange } = require('../utils/range');

class LeadError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const text = (v, max, label, { required = false } = {}) => {
  const s = String(v === undefined || v === null ? '' : v).replace(/\s+/g, ' ').trim();
  if (!s) {
    if (required) throw new LeadError(`${label} is required.`);
    return '';
  }
  if (s.length > max) throw new LeadError(`${label} can be up to ${max} characters.`);
  return s;
};
const one = (v, allowed, label) => {
  if (!allowed.includes(v)) throw new LeadError(`Please choose ${label}.`);
  return v;
};
const many = (v, allowed, label, { required = false } = {}) => {
  const list = Array.isArray(v) ? [...new Set(v)] : [];
  if (list.some((x) => !allowed.includes(x))) throw new LeadError(`${label} has a choice that is not valid.`);
  if (required && !list.length) throw new LeadError(`Please choose at least one for ${label}.`);
  return list;
};

// a very small guard against floods from one address (this server only)
const HITS = new Map();
const tooMany = (ip) => {
  const now = Date.now();
  const hits = (HITS.get(ip) || []).filter((t) => now - t < 3600 * 1000);
  hits.push(now);
  HITS.set(ip, hits);
  if (HITS.size > 5000) HITS.clear();
  return hits.length > 12;
};

const view = (l) => ({
  id: l.id,
  kind: l.kind,
  full_name: l.fullName,
  mobile_number: l.mobileNumber,
  city: l.city,
  answers: l.answers || {},
  status: l.status,
  note: l.note,
  created_at: l.createdAt
});

class LeadsService {
  options() {
    const obj = (list) => list.map(([id, name]) => ({ id, name }));
    return {
      owner: { equipment: obj(C.OWNER_EQUIPMENT), operators: obj(C.OWNER_OPERATORS), documents: obj(C.OWNER_DOCS) },
      operator: { roles: obj(C.OPERATOR_ROLES), license: obj(C.OPERATOR_LICENSE), documents: obj(C.OPERATOR_DOCS) },
      statuses: C.STATUSES
    };
  }

  /** The website form: owner or operator. Nothing to sign in; a repeat from the same number in 24 hours updates the first one. */
  async create(input = {}, ip = '') {
    if (tooMany(ip || 'unknown')) throw new LeadError('Too many requests. Please try again later.', 429);
    if (input.website) return { received: true }; // hidden field a person never fills: a bot
    const kind = one(input.kind, ['owner', 'operator'], 'Owner or Operator');
    const fullName = text(input.full_name, 160, kind === 'owner' ? 'Owner / business name' : 'Full name', { required: true });
    const mobile = String(input.mobile_number || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!/^\d{10}$/.test(mobile)) throw new LeadError('Enter a 10 digit mobile number.');

    let city;
    let answers;
    if (kind === 'owner') {
      city = text(input.location, 200, 'Base yard location and operating areas', { required: true });
      const equipment = many(input.equipment, C.keys(C.OWNER_EQUIPMENT), 'Types of equipment you own', { required: true });
      answers = {
        equipment,
        equipment_other: equipment.includes('other') ? text(input.equipment_other, 120, 'Other equipment') : '',
        fleet_details: text(input.fleet_details, 500, 'Fleet count and models', { required: true }),
        supplies_operators: one(input.supplies_operators, C.keys(C.OWNER_OPERATORS), 'whether you supply operators'),
        documents: many(input.documents, C.keys(C.OWNER_DOCS), 'Documents')
      };
    } else {
      city = text(input.location, 200, 'City and work preference', { required: true });
      answers = {
        primary_role: one(input.primary_role, C.keys(C.OPERATOR_ROLES), 'your primary role'),
        experience: text(input.experience, 500, 'Crane models and experience', { required: true }),
        license_status: one(input.license_status, C.keys(C.OPERATOR_LICENSE), 'your license status'),
        documents: many(input.documents, C.keys(C.OPERATOR_DOCS), 'Documents')
      };
    }

    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const again = await Lead.findOne({ where: { kind, mobileNumber: mobile, createdAt: { [Op.gte]: since } } });
    if (again) await again.update({ fullName, city, answers });
    else await Lead.create({ kind, fullName, mobileNumber: mobile, city, answers, status: 'new', source: 'website' });
    return { received: true };
  }

  // ---------------------------------------------------------------- admin

  /**
   * filters: kind, status, search (name, mobile, place), and answer filters: equipment, supplies_operators (owners),
   * primary_role, license_status (operators). Answer filters are applied on the matching rows here (the list is small).
   */
  async list(input = {}) {
    const where = {};
    if (input.kind) where.kind = String(input.kind);
    if (input.status) where.status = String(input.status);
    if (input.search && String(input.search).trim()) {
      const term = `%${String(input.search).trim()}%`;
      where[Op.or] = [{ fullName: { [Op.iLike]: term } }, { mobileNumber: { [Op.iLike]: term } }, { city: { [Op.iLike]: term } }];
    }
    let rows = await Lead.findAll({ where, order: [['createdAt', 'DESC']], limit: 3000 });
    const eq = input.equipment ? String(input.equipment) : '';
    if (eq) rows = rows.filter((l) => (l.answers.equipment || []).includes(eq));
    ['supplies_operators', 'primary_role', 'license_status'].forEach((k) => {
      if (input[k]) rows = rows.filter((l) => l.answers[k] === String(input[k]));
    });
    const range = parseRange(input);
    if (range.error) throw new LeadError(range.error);
    return { range, items: rows.slice(range.offset, range.offset + range.limit).map(view), total: rows.length };
  }

  async summary() {
    const rows = await Lead.findAll({ attributes: ['kind', 'status'] });
    const count = (f) => rows.filter(f).length;
    return {
      total: rows.length,
      owners: count((l) => l.kind === 'owner'),
      operators: count((l) => l.kind === 'operator'),
      new: count((l) => l.status === 'new')
    };
  }

  async update(input = {}) {
    const l = await Lead.findByPk(String(input.id || ''));
    if (!l) throw new LeadError('Lead not found.', 404);
    const changes = {};
    if (input.status !== undefined) {
      if (!C.STATUSES.includes(input.status)) throw new LeadError(`status must be one of: ${C.STATUSES.join(', ')}.`);
      changes.status = input.status;
    }
    if (input.note !== undefined) changes.note = String(input.note || '').slice(0, 1000) || null;
    await l.update(changes);
    return view(l);
  }

  // ---------------------------------------------------------------- the website's banners

  async websiteBanners() {
    const now = new Date();
    const rows = await Banner.findAll({
      where: {
        audience: 'website',
        isActive: 0,
        [Op.and]: [
          { [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: now } }] },
          { [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: now } }] }
        ]
      },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']]
    });
    return rows.map((b) => ({ id: b.id, title: b.title, subtitle: b.subtitle, button_text: b.buttonText, image: b.image, action: { type: b.actionType, value: b.actionValue } }));
  }
}

module.exports = { leadsService: new LeadsService(), LeadError };
