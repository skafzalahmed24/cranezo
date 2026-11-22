const { Op } = require('sequelize');
const { User, StaticDropdown, OperatorInvite } = require('../models');
const { ServiceError } = require('./crane.service');
const { notificationService } = require('./notification.service');
const { DROPDOWN_TYPES } = require('../constants/dropdownTypes');

/**
 * An owner's operator team.
 *  - How an operator is paid: monthly salary, daily wage, or per job (the commission chosen when a job is given),
 *    plus an optional daily allowance (batta) for site days.
 *  - An operator who registered on their own is not added by the owner: the owner sends a request with the pay terms,
 *    and the operator accepts or declines. After accepting, the operator shows under that owner.
 */
const OPERATOR_ROLE_ID = 2;
const SALARY_TYPES = ['monthly', 'daily', 'per_job'];
const INVITE = { WAITING: 0, ACCEPTED: 1, DECLINED: 2, CANCELLED: 3, EXPIRED: 4 };
const STATUS_LABEL = { 0: 'Waiting', 1: 'Accepted', 2: 'Declined', 3: 'Cancelled', 4: 'Expired' };
const BRIEF = ['id', 'memberId', 'fullName', 'mobileNumber', 'countryCode', 'profileImage', 'ownerId', 'isActive', 'isDeleted'];

const money = (value, label) => {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1000000) throw new ServiceError(`${label} must be between 0 and 1000000.`);
  return Math.round(n * 100) / 100;
};

/** The pay terms from a request body: salary_type, monthly_salary, daily_wage and batta */
const cleanTerms = (body = {}) => {
  // without a salary_type (older callers) it follows the amounts: a monthly salary, else a daily wage, else paid per job
  const given = String(body.salary_type || '').trim();
  const salaryType = given || (Number(body.monthly_salary) > 0 ? 'monthly' : Number(body.daily_wage) > 0 ? 'daily' : 'per_job');
  if (!SALARY_TYPES.includes(salaryType)) throw new ServiceError(`salary_type must be one of: ${SALARY_TYPES.join(', ')}.`);
  const terms = {
    salaryType,
    monthlySalary: money(body.monthly_salary, 'monthly_salary'),
    dailyWage: money(body.daily_wage, 'daily_wage'),
    batta: money(body.batta, 'batta')
  };
  if (salaryType === 'monthly' && !(terms.monthlySalary > 0)) throw new ServiceError('Enter the monthly salary.');
  if (salaryType === 'daily' && !(terms.dailyWage > 0)) throw new ServiceError('Enter the daily wage.');
  // only the amount that belongs to the chosen type is kept
  if (salaryType !== 'monthly') terms.monthlySalary = 0;
  if (salaryType !== 'daily') terms.dailyWage = 0;
  if (salaryType === 'per_job') terms.batta = 0;
  return terms;
};

const termsOut = (row) => ({
  salary_type: row.salaryType || 'monthly',
  monthly_salary: Number(row.monthlySalary || 0),
  daily_wage: Number(row.dailyWage || 0),
  batta: Number(row.batta || 0)
});

const operatorBrief = (o) => ({
  id: o.id,
  member_id: o.memberId,
  full_name: o.fullName,
  mobile_number: o.mobileNumber,
  country_code: o.countryCode,
  profile_image: o.profileImage
});

class OperatorTeamService {
  cleanTerms(body) {
    return cleanTerms(body);
  }

  termsOut(row) {
    return termsOut(row);
  }

  /** Find a registered operator by operator ID (OP...) or mobile number, and say whether they can be asked */
  async search(ownerId, input = {}) {
    const query = String(input.query || input.operator_id || '').trim();
    if (query.length < 4) throw new ServiceError('Type the operator ID or the full mobile number.');
    const found = await User.findOne({
      where: {
        roleId: OPERATOR_ROLE_ID,
        isDeleted: 0,
        [Op.or]: [{ memberId: query.toUpperCase() }, { mobileNumber: query.replace(/\D/g, '').slice(-10) }]
      },
      attributes: BRIEF
    });
    if (!found) throw new ServiceError('No registered operator found with this ID or mobile number.', 404);

    let status = 'free';
    if (found.isActive !== 0) status = 'blocked';
    else if (found.ownerId === ownerId) status = 'yours';
    else if (found.ownerId) status = 'other_owner';
    else if (await OperatorInvite.findOne({ where: { ownerId, operatorId: found.id, status: INVITE.WAITING }, attributes: ['id'] })) status = 'requested';
    return { ...operatorBrief(found), status };
  }

  /** The owner sends a request to a registered operator, with the pay terms */
  async invite(ownerId, input = {}) {
    const memberId = String(input.operator_id || '').trim();
    if (!memberId) throw new ServiceError('operator_id is required.');
    const operator = await User.findOne({
      where: { roleId: OPERATOR_ROLE_ID, isDeleted: 0, [Op.or]: [{ id: /^[0-9a-f-]{36}$/i.test(memberId) ? memberId : null }, { memberId: memberId.toUpperCase() }] },
      attributes: BRIEF
    });
    if (!operator) throw new ServiceError('No operator found.', 404);
    if (operator.isActive !== 0) throw new ServiceError('This operator is blocked.', 409);
    if (operator.ownerId === ownerId) throw new ServiceError('This operator is already in your team.', 409);
    if (operator.ownerId) throw new ServiceError('This operator already works with another owner.', 409);
    if (await OperatorInvite.findOne({ where: { ownerId, operatorId: operator.id, status: INVITE.WAITING }, attributes: ['id'] })) {
      throw new ServiceError('You have already sent a request to this operator. Wait for the answer.', 409);
    }
    const terms = cleanTerms(input);
    const message = String(input.message || '').trim().slice(0, 300) || null;
    const invite = await OperatorInvite.create({ ownerId, operatorId: operator.id, ...terms, message, status: INVITE.WAITING });

    const owner = await User.findByPk(ownerId, { attributes: ['fullName', 'companyName'] });
    const ownerName = (owner && (owner.companyName || owner.fullName)) || 'An owner';
    await notificationService.notify(operator.id, {
      type: 'operator_invite',
      title: 'Request to join a team',
      body: `${ownerName} wants you to join their operator team. Open the request to accept or decline.`,
      data: { invite_id: invite.id, screen: 'operator_invites' }
    }).catch(() => {});
    return this.formatInvite(invite, { operator });
  }

  formatInvite(invite, { operator, owner } = {}) {
    return {
      id: invite.id,
      status: invite.status,
      status_label: STATUS_LABEL[invite.status],
      message: invite.message,
      ...termsOut(invite),
      created_at: invite.createdAt,
      responded_at: invite.respondedAt,
      operator: operator ? operatorBrief(operator) : null,
      owner: owner ? { id: owner.id, member_id: owner.memberId, full_name: owner.fullName, company_name: owner.companyName, contact: `${owner.countryCode || ''} ${owner.mobileNumber || ''}`.trim() } : null
    };
  }

  /** Requests the owner has sent, newest first */
  async sent(ownerId) {
    const rows = await OperatorInvite.findAll({ where: { ownerId }, order: [['createdAt', 'DESC']], limit: 50 });
    const operators = await User.findAll({ where: { id: rows.map((r) => r.operatorId) }, attributes: BRIEF });
    const byId = new Map(operators.map((o) => [o.id, o]));
    return rows.map((r) => this.formatInvite(r, { operator: byId.get(r.operatorId) }));
  }

  async cancel(ownerId, inviteId) {
    const invite = await OperatorInvite.findOne({ where: { id: String(inviteId || ''), ownerId } });
    if (!invite) throw new ServiceError('Request not found.', 404);
    if (invite.status !== INVITE.WAITING) throw new ServiceError('This request has already been answered.', 409);
    await invite.update({ status: INVITE.CANCELLED, respondedAt: new Date() });
    return { id: invite.id, status: invite.status, status_label: STATUS_LABEL[invite.status] };
  }

  /** The requests an operator has received (waiting ones first) */
  async received(operatorId) {
    const rows = await OperatorInvite.findAll({
      where: { operatorId },
      order: [['status', 'ASC'], ['createdAt', 'DESC']],
      limit: 50
    });
    const owners = await User.findAll({ where: { id: rows.map((r) => r.ownerId) }, attributes: ['id', 'memberId', 'fullName', 'companyName', 'countryCode', 'mobileNumber'] });
    const byId = new Map(owners.map((o) => [o.id, o]));
    return {
      waiting: rows.filter((r) => r.status === INVITE.WAITING).length,
      items: rows.map((r) => this.formatInvite(r, { owner: byId.get(r.ownerId) }))
    };
  }

  /** The operator accepts (joins that owner's team with the offered pay) or declines */
  async respond(operatorId, input = {}) {
    const invite = await OperatorInvite.findOne({ where: { id: String(input.invite_id || ''), operatorId } });
    if (!invite) throw new ServiceError('Request not found.', 404);
    if (invite.status !== INVITE.WAITING) throw new ServiceError('This request has already been answered.', 409);
    const accept = input.accept === true || input.accept === 1 || input.accept === 'true';
    const operator = await User.findByPk(operatorId);
    const owner = await User.findByPk(invite.ownerId, { attributes: ['id', 'fullName', 'companyName'] });

    if (!accept) {
      await invite.update({ status: INVITE.DECLINED, respondedAt: new Date() });
      await notificationService.notify(invite.ownerId, {
        type: 'operator_invite_declined',
        title: 'Request declined',
        body: `${operator.fullName || 'The operator'} declined your request to join your team.`,
        data: { invite_id: invite.id, screen: 'my_operators' }
      }).catch(() => {});
      return this.formatInvite(invite, { owner });
    }

    if (operator.ownerId && operator.ownerId !== invite.ownerId) {
      await invite.update({ status: INVITE.EXPIRED, respondedAt: new Date() });
      throw new ServiceError('You already work with another owner, so you cannot join this team.', 409);
    }
    const ownerBased = await StaticDropdown.findOne({
      where: { dropdownType: DROPDOWN_TYPES.OPERATOR_TYPE, dropdownName: 'Owner Based', dropdownTypeStatus: 0 },
      attributes: ['id']
    });
    await operator.update({
      ownerId: invite.ownerId,
      salaryType: invite.salaryType,
      monthlySalary: invite.monthlySalary,
      dailyWage: invite.dailyWage,
      batta: invite.batta,
      ...(ownerBased ? { operatorType: ownerBased.id } : {})
    });
    await invite.update({ status: INVITE.ACCEPTED, respondedAt: new Date() });
    // every other waiting request to this operator is over: they now work with one owner
    await OperatorInvite.update(
      { status: INVITE.EXPIRED, respondedAt: new Date() },
      { where: { operatorId, status: INVITE.WAITING, id: { [Op.ne]: invite.id } } }
    );
    await notificationService.notify(invite.ownerId, {
      type: 'operator_invite_accepted',
      title: 'Operator joined your team',
      body: `${operator.fullName || 'The operator'} accepted your request and is now in your team.`,
      data: { invite_id: invite.id, screen: 'my_operators' }
    }).catch(() => {});
    return this.formatInvite(invite, { owner });
  }
}

module.exports = { operatorTeamService: new OperatorTeamService(), cleanTerms, termsOut, INVITE };
