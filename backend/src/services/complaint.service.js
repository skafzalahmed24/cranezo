const crypto = require('crypto');
const { Op } = require('sequelize');
const { Booking, Complaint, ComplaintUpdate, User } = require('../models');
const { parseRange } = require('../utils/range');
const { ServiceError } = require('./crane.service');
const { notificationService } = require('./notification.service');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const iso = (d) => (d ? new Date(d).toISOString() : null);

// `issues`: ready-made reasons the app shows as checkboxes (the ticked ones go into the description)
const CATEGORIES = [
  {
    id: 'payment_not_recorded', name: 'Payment not recorded', group: 'payment', description: 'I paid but the app still shows the amount as due',
    issues: ['Money was deducted from my account', 'App still shows the amount as due', 'I paid the advance but the booking was cancelled', 'I have a payment receipt / UPI reference']
  },
  {
    id: 'payment_failed', name: 'Payment failed or charged twice', group: 'payment', description: 'Money was deducted but the payment failed, or I was charged more than once',
    issues: ['Payment failed but money was deducted', 'I was charged twice', 'Refund not received yet']
  },
  {
    id: 'wrong_amount', name: 'Wrong amount charged', group: 'payment', description: 'The bill does not match what was agreed',
    issues: ['Extra time charged wrongly', 'Distance charge is wrong', 'Charges I did not agree to', 'Total is more than the offer I made']
  },
  {
    id: 'work_quality', name: 'Not happy with the work', group: 'service', description: 'The job was not done properly',
    issues: ['Work was slow', 'Work was left incomplete', 'Crane was not the one booked', 'Crane broke down during the job', 'Damage at the site']
  },
  {
    id: 'service_quality', name: 'Service or behaviour', group: 'service', description: 'Late arrival, rude behaviour, safety concerns',
    issues: ['Crane arrived late', 'Operator was rude', 'Safety rules were not followed', 'Operator did not answer calls']
  },
  { id: 'other', name: 'Something else', group: 'other', description: 'Anything not listed above', issues: [] }
];
const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
const STATUSES = ['open', 'in_review', 'resolved', 'rejected'];
const STATUS_LABELS = { open: 'Open', in_review: 'In Review', resolved: 'Resolved', rejected: 'Closed - not upheld' };
const CLOSED = ['resolved', 'rejected'];

const nameOf = (u) => (u ? u.companyName || u.fullName : null);
const userAttrs = ['id', 'fullName', 'companyName', 'memberId', 'mobileNumber', 'countryCode'];

const include = [
  { model: Booking, as: 'booking', attributes: ['id', 'bookingCode', 'siteName', 'siteAddress', 'completedAt', 'finalAmount', 'paymentStatus', 'paymentMethod'] },
  { model: User, as: 'customer', attributes: userAttrs },
  { model: User, as: 'owner', attributes: userAttrs }
];

const view = (c, { audience }) => {
  const category = CATEGORIES.find((x) => x.id === c.category);
  return {
    id: c.id,
    complaint_code: c.complaintCode,
    category: c.category,
    category_name: category ? category.name : c.category,
    category_group: category ? category.group : 'other',
    subject: c.subject,
    description: c.description,
    attachments: c.attachments || [],
    status: c.status,
    status_label: STATUS_LABELS[c.status],
    resolution_note: c.resolutionNote,
    resolved_at: iso(c.resolvedAt),
    resolved_by: c.resolvedByType,
    booking: c.booking ? {
      booking_id: c.booking.id,
      booking_code: c.booking.bookingCode,
      location: c.booking.siteName || c.booking.siteAddress,
      amount: c.booking.finalAmount !== null ? Number(c.booking.finalAmount) : null,
      payment_status: c.booking.paymentStatus,
      payment_method: c.booking.paymentMethod
    } : null,
    customer: c.customer ? {
      id: c.customer.id,
      name: nameOf(c.customer),
      member_id: c.customer.memberId,
      mobile_number: audience === 'customer' ? null : c.customer.mobileNumber,
      country_code: audience === 'customer' ? null : c.customer.countryCode
    } : null,
    owner: c.owner ? { id: c.owner.id, name: nameOf(c.owner), member_id: c.owner.memberId } : null,
    updates: (c.updates || []).map((u) => ({
      id: u.id,
      author_type: u.authorType,
      author_name: u.authorType === 'admin' ? 'Cranezo Support' : u.authorName,
      message: u.message,
      status_from: u.statusFrom,
      status_to: u.statusTo,
      status_to_label: u.statusTo ? STATUS_LABELS[u.statusTo] : null,
      created_at: iso(u.createdAt)
    })),
    can_reply: !CLOSED.includes(c.status),
    created_at: iso(c.createdAt),
    updated_at: iso(c.updatedAt)
  };
};

const code = () => {
  const d = new Date();
  return `CMP${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(crypto.randomInt(0, 1000000)).padStart(6, '0')}`;
};

const cleanAttachments = (list) => {
  if (list === undefined || list === null) return null;
  if (!Array.isArray(list)) throw new ServiceError('attachments must be a list of file urls.');
  if (list.length > 5) throw new ServiceError('You can attach up to 5 files.');
  return list.map((u) => {
    if (typeof u !== 'string' || !u.trim()) throw new ServiceError('Every attachment must be a file url from the upload API.');
    return u.trim().slice(0, 500);
  });
};

class ComplaintService {
  options() {
    return { categories: CATEGORIES, statuses: STATUSES.map((s) => ({ id: s, name: STATUS_LABELS[s] })) };
  }

  async load(id, where = {}) {
    if (!UUID_RE.test(String(id || ''))) throw new ServiceError('A valid complaint_id is required.');
    const c = await Complaint.findOne({
      where: { id, ...where },
      include: [...include, { model: ComplaintUpdate, as: 'updates', required: false }],
      order: [[{ model: ComplaintUpdate, as: 'updates' }, 'id', 'ASC']]
    });
    if (!c) throw new ServiceError('Complaint not found.', 404);
    return c;
  }

  async list(where, input, audience) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const filter = { ...where };
    if (input.status) {
      if (input.status === 'active') filter.status = { [Op.in]: ['open', 'in_review'] };
      else if (input.status === 'closed') filter.status = { [Op.in]: CLOSED };
      else if (STATUSES.includes(input.status)) filter.status = input.status;
      else throw new ServiceError('status must be open, in_review, resolved, rejected, active or closed.');
    }
    if (input.category) filter.category = input.category;
    if (input.search) {
      const term = `%${String(input.search).trim()}%`;
      filter[Op.or] = [{ complaintCode: { [Op.iLike]: term } }, { subject: { [Op.iLike]: term } }, { '$booking.booking_code$': { [Op.iLike]: term } }];
    }
    const { rows, count } = await Complaint.findAndCountAll({
      where: filter,
      include,
      limit: range.limit,
      offset: range.offset,
      order: [['createdAt', 'DESC'], ['id', 'ASC']]
    });
    return { range, items: rows.map((c) => view(c, { audience })), total: count };
  }

  async summary(where = {}) {
    const count = (status) => Complaint.count({ where: { ...where, status } });
    return {
      open: await count('open'),
      in_review: await count('in_review'),
      resolved: await count('resolved'),
      rejected: await count('rejected'),
      payment_disputes_open: await Complaint.count({
        where: { ...where, status: { [Op.in]: ['open', 'in_review'] }, category: { [Op.in]: ['payment_not_recorded', 'payment_failed', 'wrong_amount'] } }
      })
    };
  }

  async notifyParties(c, { title, body, skip }) {
    const targets = [];
    if (skip !== 'customer') targets.push(c.customerId);
    if (skip !== 'owner' && c.ownerId) targets.push(c.ownerId);
    for (const userId of targets) {
      // eslint-disable-next-line no-await-in-loop
      await notificationService.notify(userId, { type: 'complaint_update', title, body, data: { complaint_id: c.id } });
    }
  }

  // ---------------------------------------------------------------- customer

  async create(customerId, input = {}) {
    const category = String(input.category || '');
    if (!CATEGORY_IDS.includes(category)) throw new ServiceError(`category must be one of: ${CATEGORY_IDS.join(', ')}.`);
    const description = String(input.description || '').trim();
    if (description.length < 10) throw new ServiceError('Please describe the problem (at least 10 characters).');
    let booking = null;
    if (input.booking_id) {
      if (!UUID_RE.test(String(input.booking_id))) throw new ServiceError('booking_id is not valid.');
      booking = await Booking.findOne({ where: { id: input.booking_id, customerId }, attributes: ['id', 'ownerId', 'bookingCode'] });
      if (!booking) throw new ServiceError('Booking not found.', 404);
      const open = await Complaint.count({ where: { bookingId: booking.id, customerId, category, status: { [Op.in]: ['open', 'in_review'] } } });
      if (open) throw new ServiceError('You already have an open complaint of this type for this booking.', 409);
    } else if (category !== 'other') {
      throw new ServiceError('Choose the booking this complaint is about.');
    }
    const cat = CATEGORIES.find((x) => x.id === category);
    const subject = String(input.subject || '').trim().slice(0, 150) || cat.name;

    const customer = await User.findByPk(customerId, { attributes: ['id', 'fullName', 'companyName'] });
    let complaint;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        complaint = await Complaint.create({
          complaintCode: code(),
          bookingId: booking ? booking.id : null,
          customerId,
          ownerId: booking ? booking.ownerId : null,
          category,
          subject,
          description: description.slice(0, 2000),
          attachments: cleanAttachments(input.attachments)
        });
        break;
      } catch (error) {
        if (error.name !== 'SequelizeUniqueConstraintError' || attempt === 2) throw error;
      }
    }
    await ComplaintUpdate.create({
      complaintId: complaint.id, authorType: 'customer', authorId: customerId, authorName: nameOf(customer), message: null, statusTo: 'open'
    });
    if (complaint.ownerId) {
      await notificationService.notify(complaint.ownerId, {
        type: 'complaint_new',
        title: 'New Customer Complaint',
        body: `${complaint.complaintCode}${booking ? ` (${booking.bookingCode})` : ''}: ${subject}`,
        data: { complaint_id: complaint.id, booking_id: complaint.bookingId }
      });
    }
    return view(await this.load(complaint.id), { audience: 'customer' });
  }

  customerList(customerId, input = {}) { return this.list({ customerId }, input, 'customer'); }

  async customerGet(customerId, id) { return view(await this.load(id, { customerId }), { audience: 'customer' }); }

  async customerReply(customerId, input = {}) {
    const c = await this.load(input.complaint_id, { customerId });
    if (CLOSED.includes(c.status)) throw new ServiceError('This complaint is closed.', 409);
    const message = String(input.message || '').trim();
    if (!message) throw new ServiceError('message is required.');
    const customer = await User.findByPk(customerId, { attributes: ['fullName', 'companyName'] });
    await ComplaintUpdate.create({ complaintId: c.id, authorType: 'customer', authorId: customerId, authorName: nameOf(customer), message: message.slice(0, 2000) });
    await c.update({ updatedAt: new Date() });
    await this.notifyParties(c, { title: 'Complaint Updated', body: `${c.complaintCode}: the customer added a message.`, skip: 'customer' });
    return this.customerGet(customerId, c.id);
  }

  // ---------------------------------------------------------------- owner and admin

  ownerList(ownerId, input = {}) { return this.list({ ownerId }, input, 'owner'); }

  async ownerGet(ownerId, id) { return view(await this.load(id, { ownerId }), { audience: 'owner' }); }

  adminList(input = {}) {
    const where = {};
    if (input.owner_id) where.ownerId = input.owner_id;
    return this.list(where, input, 'admin');
  }

  async adminGet(id) { return view(await this.load(id), { audience: 'admin' }); }

  /**
   * Reply and/or change status. Owners can move a complaint to in_review or resolved;
   * only the Super Admin can reject it or reopen a closed one.
   */
  async update(actor, input = {}) {
    const isAdmin = actor.type === 'admin';
    const c = await this.load(input.complaint_id, isAdmin ? {} : { ownerId: actor.id });
    const message = input.message ? String(input.message).trim().slice(0, 2000) : null;
    const next = input.status ? String(input.status) : null;
    if (!message && !next) throw new ServiceError('Add a message or choose a new status.');
    if (next && !STATUSES.includes(next)) throw new ServiceError('status must be open, in_review, resolved or rejected.');
    if (next && next !== c.status) {
      if (!isAdmin && CLOSED.includes(c.status)) throw new ServiceError('Only Cranezo support can reopen a closed complaint.', 403);
      if (!isAdmin && next === 'rejected') throw new ServiceError('Only Cranezo support can close a complaint without resolving it.', 403);
      if (CLOSED.includes(next) && !message && !input.resolution_note) throw new ServiceError('Explain the outcome to the customer (message).');
    }
    if (!next && CLOSED.includes(c.status) && !isAdmin) throw new ServiceError('This complaint is closed.', 409);

    const changes = {};
    if (next && next !== c.status) {
      changes.status = next;
      if (CLOSED.includes(next)) {
        changes.resolvedAt = new Date();
        changes.resolvedByType = actor.type;
        changes.resolutionNote = (input.resolution_note || message || '').slice(0, 2000);
      } else {
        changes.resolvedAt = null;
        changes.resolvedByType = null;
      }
    }
    await ComplaintUpdate.create({
      complaintId: c.id,
      authorType: actor.type,
      authorId: String(actor.id),
      authorName: actor.name,
      message,
      statusFrom: changes.status ? c.status : null,
      statusTo: changes.status || null
    });
    await c.update({ ...changes, updatedAt: new Date() });

    const statusText = changes.status ? ` Status: ${STATUS_LABELS[changes.status]}.` : '';
    await this.notifyParties(c, {
      title: 'Complaint Updated',
      body: `${c.complaintCode}: ${actor.type === 'admin' ? 'Cranezo support' : 'the crane owner'} replied.${statusText}`,
      skip: actor.type === 'owner' ? 'owner' : null
    });
    return isAdmin ? this.adminGet(c.id) : this.ownerGet(actor.id, c.id);
  }
}

module.exports = { complaintService: new ComplaintService(), COMPLAINT_CATEGORIES: CATEGORIES };
