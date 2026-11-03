const crypto = require('crypto');
const { Op, QueryTypes } = require('sequelize');
const {
  sequelize, SupportSettings, FaqCategory, Faq, SupportTicket, SupportMessage, Announcement, Booking, Crane,
  StaticDropdown, User, Admin
} = require('../models');
const { parseRange } = require('../utils/range');
const { notificationService } = require('./notification.service');
const { ServiceError } = require('./crane.service');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLE_KEY = { 1: 'owner', 2: 'operator', 3: 'customer' };
const ROLE_NAME = { 1: 'Crane Owner', 2: 'Operator', 3: 'Customer' };
const AUDIENCES = ['all', 'customer', 'operator', 'owner'];

const CATEGORY_LABELS = {
  booking_help: 'Booking Help',
  payment_help: 'Payment Help',
  issue: 'Report an Issue',
  general: 'General',
  chat: 'Chat with Support',
  emergency: 'Emergency'
};
const USER_CATEGORIES = ['booking_help', 'payment_help', 'issue', 'general'];
const STATUS_LABELS = { 0: 'Open', 1: 'In Progress', 2: 'Resolved', 3: 'Closed' };
const PRIORITIES = ['normal', 'high', 'urgent'];

const iso = (d) => (d ? new Date(d).toISOString() : null);
const preview = (text, n = 90) => (text && text.length > n ? `${text.slice(0, n - 1)}…` : text);

// Tiles of the Help & Support screen. Operators do not get Booking / Payment help (as in the design).
const TILES = {
  call_support: { key: 'call_support', title: 'Call Support', subtitle: 'Talk to our support team for any assistance.', icon: 'phone', action: 'call' },
  chat_support: { key: 'chat_support', title: 'Chat with Support', subtitle: 'Get instant help from our support team.', icon: 'chat', action: 'chat' },
  booking_help: { key: 'booking_help', title: 'Booking Help', subtitle: 'Get help with bookings, modifications and more.', icon: 'booking', action: 'category', category: 'booking_help' },
  payment_help: { key: 'payment_help', title: 'Payment Help', subtitle: 'Support for payments, refunds and invoices.', icon: 'payment', action: 'category', category: 'payment_help' },
  report_issue: { key: 'report_issue', title: 'Report an Issue', subtitle: 'Let us know if you faced any problem.', icon: 'report', action: 'ticket', category: 'issue' },
  faqs: { key: 'faqs', title: 'FAQs', subtitle: 'Find quick answers to common questions.', icon: 'faq', action: 'faq' }
};
const TILES_BY_ROLE = {
  customer: ['call_support', 'chat_support', 'booking_help', 'payment_help', 'report_issue', 'faqs'],
  owner: ['call_support', 'chat_support', 'booking_help', 'payment_help', 'report_issue', 'faqs'],
  operator: ['call_support', 'chat_support', 'report_issue', 'faqs']
};

const cleanText = (value, label, { min = 1, max = 2000 } = {}) => {
  const text = String(value || '').trim();
  if (text.length < min) throw new ServiceError(`${label} is required.`);
  if (text.length > max) throw new ServiceError(`${label} is too long (up to ${max} characters).`);
  return text;
};

const cleanAttachments = (list) => {
  if (list === undefined || list === null) return null;
  if (!Array.isArray(list) || list.some((p) => typeof p !== 'string' || !p)) throw new ServiceError('attachments must be a list of file urls.');
  if (list.length > 5) throw new ServiceError('You can attach up to 5 files.');
  return list.length ? list : null;
};

class SupportService {
  // ---------------------------------------------------------------- settings

  async settings() {
    let row = await SupportSettings.findOne({ order: [['id', 'ASC']] });
    if (!row) row = await SupportSettings.create({});
    return row;
  }

  formatSettings(s) {
    return {
      support_phone: s.supportPhone,
      emergency_phone: s.emergencyPhone,
      support_email: s.supportEmail,
      hours_label: s.hoursLabel,
      team_message: s.teamMessage,
      chat_welcome: s.chatWelcome,
      updated_at: iso(s.updatedAt)
    };
  }

  async updateSettings(input = {}) {
    const s = await this.settings();
    const phone = (value, label) => {
      if (value === null || value === '') return null;
      const text = String(value).trim();
      if (!/^[+\d][\d\s-]{4,28}$/.test(text)) throw new ServiceError(`${label} is not a valid phone number.`);
      return text;
    };
    const updates = {};
    if (input.support_phone !== undefined) updates.supportPhone = phone(input.support_phone, 'support_phone');
    if (input.emergency_phone !== undefined) updates.emergencyPhone = phone(input.emergency_phone, 'emergency_phone');
    if (input.support_email !== undefined) {
      const email = String(input.support_email || '').trim();
      if (email && !/\S+@\S+\.\S+/.test(email)) throw new ServiceError('support_email is not valid.');
      updates.supportEmail = email || null;
    }
    if (input.hours_label !== undefined) updates.hoursLabel = cleanText(input.hours_label, 'hours_label', { max: 60 });
    if (input.team_message !== undefined) updates.teamMessage = cleanText(input.team_message, 'team_message', { max: 255 });
    if (input.chat_welcome !== undefined) updates.chatWelcome = cleanText(input.chat_welcome, 'chat_welcome', { max: 255 });
    if (!Object.keys(updates).length) throw new ServiceError('Nothing to update.');
    await s.update(updates);
    return this.formatSettings(s);
  }

  // ---------------------------------------------------------------- user: Help & Support home, FAQs

  roleKey(user) {
    return ROLE_KEY[user.roleId] || 'customer';
  }

  async home(user) {
    const settings = await this.settings();
    const open = await SupportTicket.count({ where: { userId: user.id, status: { [Op.in]: [0, 1] } } });
    const unread = await this.unreadReplies(user.id);
    return {
      search_placeholder: 'Search for help...',
      emergency: {
        title: 'Emergency Assistance',
        subtitle: 'Need immediate help? Contact our 24/7 emergency support.',
        phone: settings.emergencyPhone,
        available: !!settings.emergencyPhone
      },
      tiles: (TILES_BY_ROLE[this.roleKey(user)] || TILES_BY_ROLE.customer).map((k) => TILES[k]),
      call_support: { phone: settings.supportPhone, available: !!settings.supportPhone, hours: settings.hoursLabel },
      my_requests: { title: 'My Support Requests', subtitle: 'Track the status of your support tickets.', open_count: open, unread_replies: unread },
      team: { title: 'Our Support Team is Available', message: settings.teamMessage, hours: settings.hoursLabel },
      support_email: settings.supportEmail
    };
  }

  faqScope(user) {
    return { audience: { [Op.in]: ['all', this.roleKey(user)] }, isActive: 0 };
  }

  async faqCategories(user) {
    const categories = await FaqCategory.findAll({ where: { isActive: 0 }, order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
    const counts = await Faq.findAll({
      where: this.faqScope(user),
      attributes: ['categoryId', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
      group: ['categoryId'],
      raw: true
    });
    const byId = Object.fromEntries(counts.map((c) => [c.categoryId, Number(c.n)]));
    return categories
      .map((c) => ({ id: c.id, code: c.code, name: c.name, description: c.description, faq_count: byId[c.id] || 0 }))
      .filter((c) => c.faq_count > 0);
  }

  formatFaq(f) {
    return {
      id: f.id,
      category: f.category ? { id: f.category.id, code: f.category.code, name: f.category.name } : null,
      question: f.question,
      answer: f.answer
    };
  }

  /** FAQs for the user's role; search covers question and answer (the "Search for help" box) */
  async faqList(user, input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const where = this.faqScope(user);
    const categoryInclude = { model: FaqCategory, as: 'category', where: { isActive: 0 }, attributes: ['id', 'code', 'name'] };
    if (input.category_code) categoryInclude.where = { isActive: 0, code: String(input.category_code) };
    if (input.search && String(input.search).trim()) {
      const term = `%${String(input.search).trim()}%`;
      where[Op.or] = [{ question: { [Op.iLike]: term } }, { answer: { [Op.iLike]: term } }];
    }
    const { rows, count } = await Faq.findAndCountAll({
      where,
      include: [categoryInclude],
      limit: range.limit,
      offset: range.offset,
      order: [['sortOrder', 'ASC'], ['id', 'ASC']]
    });
    return { range, items: rows.map((f) => this.formatFaq(f)), total: count };
  }

  async faqFeedback(faqId, helpful) {
    const faq = await Faq.findByPk(Number(faqId));
    if (!faq || faq.isActive !== 0) throw new ServiceError('FAQ not found.', 404);
    if (typeof helpful !== 'boolean') throw new ServiceError('helpful must be true or false.');
    await faq.increment(helpful ? 'helpfulYes' : 'helpfulNo');
    return { faq_id: faq.id, recorded: true };
  }

  // ---------------------------------------------------------------- tickets (user side)

  async unreadReplies(userId) {
    return SupportMessage.count({
      where: { senderType: { [Op.ne]: 'user' }, isRead: false },
      include: [{ model: SupportTicket, as: 'ticket', attributes: [], where: { userId } }]
    });
  }

  async newCode() {
    for (let i = 0; i < 5; i += 1) {
      const code = `TKT-${crypto.randomInt(100000, 1000000)}`;
      // eslint-disable-next-line no-await-in-loop
      if (!(await SupportTicket.count({ where: { ticketCode: code } }))) return code;
    }
    throw new ServiceError('Could not create a request number, please try again.', 500);
  }

  /** Lists tickets with their unread replies and last message */
  async ticketViews(tickets) {
    if (!tickets.length) return [];
    const ids = tickets.map((t) => t.id);
    const unread = await SupportMessage.findAll({
      where: { ticketId: ids, senderType: { [Op.ne]: 'user' }, isRead: false },
      attributes: ['ticketId', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
      group: ['ticketId'],
      raw: true
    });
    const unreadBy = Object.fromEntries(unread.map((u) => [u.ticketId, Number(u.n)]));
    const last = await sequelize.query(
      'SELECT DISTINCT ON (ticket_id) ticket_id, body, sender_type FROM support_messages WHERE ticket_id IN (:ids) ORDER BY ticket_id, created_at DESC, id DESC',
      { replacements: { ids }, type: QueryTypes.SELECT }
    );
    const lastBy = Object.fromEntries(last.map((m) => [m.ticket_id, m]));
    return tickets.map((t) => ({
      ticket_id: t.id,
      ticket_code: t.ticketCode,
      category: t.category,
      category_label: CATEGORY_LABELS[t.category] || t.category,
      subject: t.subject,
      status: t.status,
      status_label: STATUS_LABELS[t.status],
      priority: t.priority,
      booking_id: t.bookingId,
      unread_replies: unreadBy[t.id] || 0,
      last_message: lastBy[t.id] ? preview(lastBy[t.id].body) : null,
      last_message_from: lastBy[t.id] ? lastBy[t.id].sender_type : null,
      last_message_at: iso(t.lastMessageAt),
      created_at: iso(t.createdAt),
      resolved_at: iso(t.resolvedAt)
    }));
  }

  messageView(m, viewer) {
    const own = m.senderType === viewer;
    const labels = { user: viewer === 'user' ? 'You' : 'Customer', admin: 'Cranzo Support', system: 'Cranzo' };
    return {
      id: m.id,
      sender_type: m.senderType,
      is_mine: own,
      sender_label: labels[m.senderType],
      body: m.body,
      attachments: m.attachments || [],
      created_at: iso(m.createdAt)
    };
  }

  async ownTicket(user, ticketId) {
    if (!UUID_RE.test(String(ticketId || ''))) throw new ServiceError('A valid ticket_id is required.');
    const ticket = await SupportTicket.findOne({ where: { id: ticketId, userId: user.id } });
    if (!ticket) throw new ServiceError('Support request not found.', 404);
    return ticket;
  }

  async ticketDetail(user, ticket) {
    const messages = await SupportMessage.findAll({ where: { ticketId: ticket.id }, order: [['createdAt', 'ASC'], ['id', 'ASC']] });
    // opening the thread reads everything the support team wrote
    await SupportMessage.update({ isRead: true }, { where: { ticketId: ticket.id, senderType: { [Op.ne]: 'user' }, isRead: false } });
    const [view] = await this.ticketViews([ticket]);
    return {
      ...view,
      unread_replies: 0,
      is_chat: ticket.category === 'chat',
      can_reply: ticket.status !== 3,
      messages: messages.map((m) => this.messageView(m, 'user'))
    };
  }

  async linkedBooking(user, bookingId) {
    if (!bookingId) return null;
    if (!UUID_RE.test(String(bookingId))) throw new ServiceError('booking_id is not valid.');
    const booking = await Booking.findOne({
      where: { id: bookingId, [Op.or]: [{ customerId: user.id }, { ownerId: user.id }, { operatorId: user.id }] },
      attributes: ['id']
    });
    if (!booking) throw new ServiceError('Booking not found.', 404);
    return booking.id;
  }

  /** Booking Help, Payment Help, Report an Issue, general request */
  async createTicket(user, input = {}) {
    const category = String(input.category || 'issue');
    if (!USER_CATEGORIES.includes(category)) throw new ServiceError(`category must be one of: ${USER_CATEGORIES.join(', ')}.`);
    const description = cleanText(input.description, 'description', { min: 5 });
    const subject = input.subject && String(input.subject).trim()
      ? cleanText(input.subject, 'subject', { max: 200 })
      : preview(description.replace(/\s+/g, ' '), 60);
    const bookingId = await this.linkedBooking(user, input.booking_id);
    const attachments = cleanAttachments(input.photos);

    const ticket = await SupportTicket.create({
      ticketCode: await this.newCode(),
      userId: user.id,
      roleId: user.roleId,
      category,
      subject,
      bookingId,
      priority: 'normal'
    });
    await SupportMessage.create({ ticketId: ticket.id, senderType: 'user', senderId: user.id, body: description, attachments });
    return this.ticketDetail(user, ticket);
  }

  async listTickets(user, input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const where = { userId: user.id };
    const status = String(input.status === undefined ? '' : input.status).toLowerCase();
    if (status === 'open') where.status = { [Op.in]: [0, 1] };
    else if (status === 'closed') where.status = { [Op.in]: [2, 3] };
    else if (status !== '') {
      const n = Number(status);
      if (![0, 1, 2, 3].includes(n)) throw new ServiceError('status must be open, closed or 0 to 3.');
      where.status = n;
    }
    const { rows, count } = await SupportTicket.findAndCountAll({
      where, limit: range.limit, offset: range.offset, order: [['lastMessageAt', 'DESC'], ['id', 'ASC']]
    });
    return { range, items: await this.ticketViews(rows), total: count };
  }

  async getTicket(user, ticketId) {
    return this.ticketDetail(user, await this.ownTicket(user, ticketId));
  }

  async reply(user, ticketId, input = {}) {
    const ticket = await this.ownTicket(user, ticketId);
    if (ticket.status === 3) throw new ServiceError('This request is closed. Please create a new one.', 409);
    const body = cleanText(input.message, 'message');
    const attachments = cleanAttachments(input.attachments);
    const message = await SupportMessage.create({ ticketId: ticket.id, senderType: 'user', senderId: user.id, body, attachments });
    // a resolved request that gets a new message is open again
    await ticket.update({ lastMessageAt: new Date(), status: ticket.status === 2 ? 0 : ticket.status, resolvedAt: ticket.status === 2 ? null : ticket.resolvedAt });
    return this.messageView(message, 'user');
  }

  async closeTicket(user, ticketId) {
    const ticket = await this.ownTicket(user, ticketId);
    if (ticket.status === 3) throw new ServiceError('This request is already closed.', 409);
    await ticket.update({ status: 3, resolvedAt: ticket.resolvedAt || new Date() });
    return this.ticketDetail(user, ticket);
  }

  /** Chat with Support: one running chat per user, continued until closed */
  async chat(user) {
    let ticket = await SupportTicket.findOne({
      where: { userId: user.id, category: 'chat', status: { [Op.in]: [0, 1] } },
      order: [['createdAt', 'DESC']]
    });
    if (!ticket) {
      const settings = await this.settings();
      ticket = await SupportTicket.create({
        ticketCode: await this.newCode(), userId: user.id, roleId: user.roleId, category: 'chat', subject: 'Chat with Support'
      });
      await SupportMessage.create({ ticketId: ticket.id, senderType: 'system', body: settings.chatWelcome, isRead: true });
    }
    return this.ticketDetail(user, ticket);
  }

  /** Emergency Assistance: an urgent request that the support team sees first, plus the phone number to call */
  async emergency(user, input = {}) {
    const bookingId = await this.linkedBooking(user, input.booking_id);
    const ticket = await this.createEmergencyTicket(user.id, user.roleId, {
      bookingId,
      latitude: input.latitude,
      longitude: input.longitude,
      description: input.description
    });
    const settings = await this.settings();
    return {
      ticket: (await this.ticketViews([ticket]))[0],
      emergency_phone: settings.emergencyPhone,
      message: 'Our emergency team has been alerted. If you are in danger, call the emergency number now.'
    };
  }

  /** Also used when an operator presses Get Help Now during a job */
  async createEmergencyTicket(userId, roleId, { bookingId = null, latitude = null, longitude = null, description = null } = {}) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    const hasPlace = latitude !== undefined && latitude !== null && Number.isFinite(lat) && Number.isFinite(lng)
      && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const ticket = await SupportTicket.create({
      ticketCode: await this.newCode(),
      userId,
      roleId,
      category: 'emergency',
      subject: 'Emergency assistance requested',
      priority: 'urgent',
      bookingId,
      latitude: hasPlace ? lat : null,
      longitude: hasPlace ? lng : null
    });
    await SupportMessage.create({
      ticketId: ticket.id,
      senderType: 'user',
      senderId: userId,
      body: description && String(description).trim() ? String(description).trim().slice(0, 1000) : 'Emergency assistance requested.'
    });
    return ticket;
  }

  // ---------------------------------------------------------------- admin: tickets

  async adminSummary() {
    const rows = await SupportTicket.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
      group: ['status'],
      raw: true
    });
    const out = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    const key = { 0: 'open', 1: 'in_progress', 2: 'resolved', 3: 'closed' };
    rows.forEach((r) => { out[key[r.status]] = Number(r.n); });
    out.needs_attention = out.open + out.in_progress;
    out.emergency_open = await SupportTicket.count({ where: { category: 'emergency', status: { [Op.in]: [0, 1] } } });
    out.unread_from_users = await SupportMessage.count({ where: { senderType: 'user', isRead: false } });
    return out;
  }

  userBrief(u) {
    return u ? {
      id: u.id,
      member_id: u.memberId,
      full_name: u.fullName,
      company_name: u.companyName,
      role_id: u.roleId,
      role_name: ROLE_NAME[u.roleId] || null,
      mobile_number: u.mobileNumber,
      country_code: u.countryCode,
      contact: [u.countryCode, u.mobileNumber].filter(Boolean).join(' ')
    } : null;
  }

  async adminViews(tickets) {
    const base = await this.ticketViews(tickets);
    const ids = tickets.map((t) => t.id);
    const unread = ids.length ? await SupportMessage.findAll({
      where: { ticketId: ids, senderType: 'user', isRead: false },
      attributes: ['ticketId', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
      group: ['ticketId'],
      raw: true
    }) : [];
    const unreadBy = Object.fromEntries(unread.map((u) => [u.ticketId, Number(u.n)]));
    return base.map((view, i) => ({
      ...view,
      // from the admin's side "unread" means new messages from the customer
      unread_replies: undefined,
      unread_from_user: unreadBy[view.ticket_id] || 0,
      user: this.userBrief(tickets[i].user),
      assignee: tickets[i].assignee ? { id: tickets[i].assignee.id, name: tickets[i].assignee.name } : null
    }));
  }

  async adminList(input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const where = {};
    const status = String(input.status === undefined ? '' : input.status).toLowerCase();
    if (status === 'open') where.status = { [Op.in]: [0, 1] };
    else if (status === 'closed') where.status = { [Op.in]: [2, 3] };
    else if (status !== '') {
      const n = Number(status);
      if (![0, 1, 2, 3].includes(n)) throw new ServiceError('status must be open, closed or 0 to 3.');
      where.status = n;
    }
    if (input.category) {
      if (!CATEGORY_LABELS[input.category]) throw new ServiceError('category is not valid.');
      where.category = input.category;
    }
    if (input.priority) {
      if (!PRIORITIES.includes(input.priority)) throw new ServiceError('priority is not valid.');
      where.priority = input.priority;
    }
    if (input.role_id) where.roleId = Number(input.role_id);
    if (input.search && String(input.search).trim()) {
      const term = `%${String(input.search).trim()}%`;
      where[Op.or] = [
        { ticketCode: { [Op.iLike]: term } },
        { subject: { [Op.iLike]: term } },
        { '$user.full_name$': { [Op.iLike]: term } },
        { '$user.mobile_number$': { [Op.iLike]: term } },
        { '$user.member_id$': { [Op.iLike]: term } }
      ];
    }

    const { rows, count } = await SupportTicket.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'memberId', 'fullName', 'companyName', 'roleId', 'mobileNumber', 'countryCode'] },
        { model: Admin, as: 'assignee', attributes: ['id', 'name'] }
      ],
      distinct: true,
      limit: range.limit,
      offset: range.offset,
      // open requests first, emergencies and urgent ones on top, then the most recent activity
      order: [
        [sequelize.literal('CASE WHEN "SupportTicket"."status" IN (0, 1) THEN 0 ELSE 1 END'), 'ASC'],
        [sequelize.literal('CASE "SupportTicket"."priority" WHEN \'urgent\' THEN 0 WHEN \'high\' THEN 1 ELSE 2 END'), 'ASC'],
        ['lastMessageAt', 'DESC'],
        ['id', 'ASC']
      ]
    });
    return { range, items: await this.adminViews(rows), total: count };
  }

  async adminGet(ticketId) {
    if (!UUID_RE.test(String(ticketId || ''))) throw new ServiceError('A valid ticket_id is required.');
    const ticket = await SupportTicket.findOne({
      where: { id: ticketId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'memberId', 'fullName', 'companyName', 'roleId', 'mobileNumber', 'countryCode', 'userEmail'] },
        { model: Admin, as: 'assignee', attributes: ['id', 'name'] }
      ]
    });
    if (!ticket) throw new ServiceError('Support request not found.', 404);

    const messages = await SupportMessage.findAll({ where: { ticketId: ticket.id }, order: [['createdAt', 'ASC'], ['id', 'ASC']] });
    await SupportMessage.update({ isRead: true }, { where: { ticketId: ticket.id, senderType: 'user', isRead: false } });

    let booking = null;
    if (ticket.bookingId) {
      const b = await Booking.findByPk(ticket.bookingId, {
        include: [{ model: Crane, as: 'crane', attributes: ['craneCode'] }, { model: StaticDropdown, as: 'craneTypeInfo', attributes: ['dropdownName'] }]
      });
      if (b) {
        booking = {
          booking_id: b.id,
          booking_code: b.bookingCode,
          status: b.status,
          crane_code: b.crane ? b.crane.craneCode : null,
          crane_type_name: b.craneTypeInfo ? b.craneTypeInfo.dropdownName : null,
          site_address: b.siteAddress
        };
      }
    }
    const [view] = await this.adminViews([ticket]);
    return {
      ...view,
      user: { ...view.user, user_email: ticket.user ? ticket.user.userEmail : null },
      booking,
      latitude: ticket.latitude !== null ? Number(ticket.latitude) : null,
      longitude: ticket.longitude !== null ? Number(ticket.longitude) : null,
      unread_from_user: 0,
      messages: messages.map((m) => ({ ...this.messageView(m, 'admin'), sender_label: m.senderType === 'user' ? 'Customer' : (m.senderType === 'admin' ? 'Cranzo Support' : 'System') }))
    };
  }

  async adminReply(adminId, ticketId, input = {}) {
    if (!UUID_RE.test(String(ticketId || ''))) throw new ServiceError('A valid ticket_id is required.');
    const ticket = await SupportTicket.findByPk(ticketId);
    if (!ticket) throw new ServiceError('Support request not found.', 404);
    if (ticket.status === 3) throw new ServiceError('This request is closed. Reopen it to reply.', 409);
    const body = cleanText(input.message, 'message');
    const attachments = cleanAttachments(input.attachments);
    const message = await SupportMessage.create({ ticketId: ticket.id, senderType: 'admin', senderId: adminId, body, attachments });
    await ticket.update({
      lastMessageAt: new Date(),
      status: ticket.status === 0 ? 1 : ticket.status,
      assignedAdminId: ticket.assignedAdminId || adminId
    });
    await notificationService.notify(ticket.userId, {
      type: 'support_reply',
      title: 'Support replied to you',
      body: `${ticket.ticketCode}: ${preview(body, 100)}`,
      data: { ticket_id: ticket.id, ticket_code: ticket.ticketCode }
    });
    return this.messageView(message, 'admin');
  }

  async adminUpdate(adminId, ticketId, input = {}) {
    if (!UUID_RE.test(String(ticketId || ''))) throw new ServiceError('A valid ticket_id is required.');
    const ticket = await SupportTicket.findByPk(ticketId);
    if (!ticket) throw new ServiceError('Support request not found.', 404);

    const updates = {};
    if (input.priority !== undefined) {
      if (!PRIORITIES.includes(input.priority)) throw new ServiceError('priority must be normal, high or urgent.');
      updates.priority = input.priority;
    }
    if (input.assign_to_me === true) updates.assignedAdminId = adminId;
    let statusChanged = false;
    if (input.status !== undefined) {
      const status = Number(input.status);
      if (![0, 1, 2, 3].includes(status)) throw new ServiceError('status must be 0 (open), 1 (in progress), 2 (resolved) or 3 (closed).');
      statusChanged = status !== ticket.status;
      updates.status = status;
      updates.resolvedAt = status >= 2 ? (ticket.resolvedAt || new Date()) : null;
    }
    if (!Object.keys(updates).length) throw new ServiceError('Nothing to update.');
    await ticket.update(updates);

    if (statusChanged && updates.status >= 2) {
      const word = updates.status === 2 ? 'resolved' : 'closed';
      await SupportMessage.create({ ticketId: ticket.id, senderType: 'system', body: `This request was marked ${word} by the support team.`, isRead: false });
      await notificationService.notify(ticket.userId, {
        type: 'support_resolved',
        title: `Request ${word}`,
        body: `${ticket.ticketCode} was marked ${word}.`,
        data: { ticket_id: ticket.id, ticket_code: ticket.ticketCode }
      });
    }
    return this.adminGet(ticket.id);
  }

  // ---------------------------------------------------------------- admin: FAQs

  formatCategory(c, count = null) {
    return { id: c.id, code: c.code, name: c.name, description: c.description, sort_order: c.sortOrder, is_active: c.isActive === 0, ...(count === null ? {} : { faq_count: count }) };
  }

  async adminCategories() {
    const rows = await FaqCategory.findAll({ order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
    const counts = await Faq.findAll({ attributes: ['categoryId', [sequelize.fn('COUNT', sequelize.col('id')), 'n']], group: ['categoryId'], raw: true });
    const byId = Object.fromEntries(counts.map((c) => [c.categoryId, Number(c.n)]));
    return rows.map((c) => this.formatCategory(c, byId[c.id] || 0));
  }

  async adminCreateCategory(input = {}) {
    const code = String(input.code || '').trim().toLowerCase();
    if (!/^[a-z0-9_]{2,30}$/.test(code)) throw new ServiceError('code must be 2 to 30 letters, numbers or underscores.');
    if (await FaqCategory.count({ where: { code } })) throw new ServiceError('A category with this code already exists.', 409);
    const c = await FaqCategory.create({
      code,
      name: cleanText(input.name, 'name', { max: 100 }),
      description: input.description ? String(input.description).trim().slice(0, 255) : null,
      sortOrder: Number.isInteger(Number(input.sort_order)) ? Number(input.sort_order) : 0
    });
    return this.formatCategory(c, 0);
  }

  async adminUpdateCategory(id, input = {}) {
    const c = await FaqCategory.findByPk(Number(id));
    if (!c) throw new ServiceError('Category not found.', 404);
    const updates = {};
    if (input.name !== undefined) updates.name = cleanText(input.name, 'name', { max: 100 });
    if (input.description !== undefined) updates.description = input.description ? String(input.description).trim().slice(0, 255) : null;
    if (input.sort_order !== undefined) updates.sortOrder = Number(input.sort_order) || 0;
    if (input.is_active !== undefined) updates.isActive = input.is_active ? 0 : 1;
    if (!Object.keys(updates).length) throw new ServiceError('Nothing to update.');
    await c.update(updates);
    return this.formatCategory(c);
  }

  formatAdminFaq(f) {
    return {
      id: f.id,
      category_id: f.categoryId,
      category_name: f.category ? f.category.name : null,
      question: f.question,
      answer: f.answer,
      audience: f.audience,
      sort_order: f.sortOrder,
      is_active: f.isActive === 0,
      helpful_yes: f.helpfulYes,
      helpful_no: f.helpfulNo,
      updated_at: iso(f.updatedAt)
    };
  }

  async adminFaqs(input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const where = {};
    if (input.category_id) where.categoryId = Number(input.category_id);
    if (input.audience) where.audience = String(input.audience);
    if (input.search && String(input.search).trim()) {
      const term = `%${String(input.search).trim()}%`;
      where[Op.or] = [{ question: { [Op.iLike]: term } }, { answer: { [Op.iLike]: term } }];
    }
    const { rows, count } = await Faq.findAndCountAll({
      where,
      include: [{ model: FaqCategory, as: 'category', attributes: ['id', 'name'] }],
      limit: range.limit,
      offset: range.offset,
      order: [['categoryId', 'ASC'], ['sortOrder', 'ASC'], ['id', 'ASC']]
    });
    return { range, items: rows.map((f) => this.formatAdminFaq(f)), total: count };
  }

  async adminCreateFaq(input = {}) {
    const category = await FaqCategory.findByPk(Number(input.category_id));
    if (!category) throw new ServiceError('category_id is not valid.');
    const audience = String(input.audience || 'all');
    if (!AUDIENCES.includes(audience)) throw new ServiceError(`audience must be one of: ${AUDIENCES.join(', ')}.`);
    const f = await Faq.create({
      categoryId: category.id,
      question: cleanText(input.question, 'question', { max: 255 }),
      answer: cleanText(input.answer, 'answer', { max: 5000 }),
      audience,
      sortOrder: Number.isInteger(Number(input.sort_order)) ? Number(input.sort_order) : 0
    });
    f.category = category;
    return this.formatAdminFaq(f);
  }

  async adminUpdateFaq(id, input = {}) {
    const f = await Faq.findByPk(Number(id), { include: [{ model: FaqCategory, as: 'category', attributes: ['id', 'name'] }] });
    if (!f) throw new ServiceError('FAQ not found.', 404);
    const updates = {};
    if (input.category_id !== undefined) {
      if (!(await FaqCategory.count({ where: { id: Number(input.category_id) } }))) throw new ServiceError('category_id is not valid.');
      updates.categoryId = Number(input.category_id);
    }
    if (input.question !== undefined) updates.question = cleanText(input.question, 'question', { max: 255 });
    if (input.answer !== undefined) updates.answer = cleanText(input.answer, 'answer', { max: 5000 });
    if (input.audience !== undefined) {
      if (!AUDIENCES.includes(input.audience)) throw new ServiceError(`audience must be one of: ${AUDIENCES.join(', ')}.`);
      updates.audience = input.audience;
    }
    if (input.sort_order !== undefined) updates.sortOrder = Number(input.sort_order) || 0;
    if (input.is_active !== undefined) updates.isActive = input.is_active ? 0 : 1;
    if (!Object.keys(updates).length) throw new ServiceError('Nothing to update.');
    await f.update(updates);
    return this.formatAdminFaq(await Faq.findByPk(f.id, { include: [{ model: FaqCategory, as: 'category', attributes: ['id', 'name'] }] }));
  }

  // ---------------------------------------------------------------- admin: announcements

  async adminAnnouncements(input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const { rows, count } = await Announcement.findAndCountAll({
      limit: range.limit, offset: range.offset, order: [['createdAt', 'DESC'], ['id', 'DESC']]
    });
    return {
      range,
      items: rows.map((a) => ({ id: a.id, title: a.title, body: a.body, audience: a.audience, sent_count: a.sentCount, sent_at: iso(a.createdAt) })),
      total: count
    };
  }

  /** The "New Feature" style notification, delivered to every active user of the chosen group */
  async adminSendAnnouncement(adminId, input = {}) {
    const audience = String(input.audience || 'all');
    if (!AUDIENCES.includes(audience)) throw new ServiceError(`audience must be one of: ${AUDIENCES.join(', ')}.`);
    const title = cleanText(input.title, 'title', { max: 150 });
    const body = cleanText(input.body, 'body', { max: 1000 });
    const roleIds = audience === 'all' ? [1, 2, 3] : [{ owner: 1, operator: 2, customer: 3 }[audience]];

    const users = await User.findAll({ where: { roleId: { [Op.in]: roleIds }, isDeleted: 0, isActive: 0 }, attributes: ['id'] });
    const sent = await notificationService.broadcast(users.map((u) => u.id), { type: 'announcement', title, body, data: { audience } });
    const a = await Announcement.create({ title, body, audience, sentCount: sent, createdBy: adminId });
    return { id: a.id, title: a.title, body: a.body, audience: a.audience, sent_count: a.sentCount, sent_at: iso(a.createdAt) };
  }
}

module.exports = { supportService: new SupportService(), CATEGORY_LABELS, USER_CATEGORIES };
