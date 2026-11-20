const { Op } = require('sequelize');
const { User, OperatorCard, PlatformSetting } = require('../models');
const { notificationService } = require('./notification.service');

const OPERATOR_ROLE_ID = 2;
const DAY = 24 * 3600 * 1000;
const RULES_KEY = 'conduct_rules';
const DEFAULT_RULES = { inactive_days: 7, reinstall_penalty: 0 };
const r2 = (n) => Math.round(Number(n) * 100) / 100;

class ConductError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const cardView = (c) => ({
  id: c.id,
  kind: c.kind,
  reason: c.reason,
  penalty_amount: Number(c.penaltyAmount || 0),
  source: c.source,
  cleared: !!c.clearedAt,
  cleared_at: c.clearedAt,
  created_at: c.createdAt
});

class ConductService {
  async rules() {
    const row = await PlatformSetting.findByPk(RULES_KEY);
    return { ...DEFAULT_RULES, ...(row && row.value ? row.value : {}) };
  }

  async saveRules(admin, input = {}) {
    const days = Number(input.inactive_days);
    const penalty = Number(input.reinstall_penalty);
    if (!Number.isInteger(days) || days < 1 || days > 90) throw new ConductError('inactive_days must be a whole number from 1 to 90.');
    if (!Number.isFinite(penalty) || penalty < 0 || penalty > 100000) throw new ConductError('reinstall_penalty must be between 0 and 100000.');
    await PlatformSetting.upsert({ key: RULES_KEY, value: { inactive_days: days, reinstall_penalty: r2(penalty) }, description: 'Operator conduct rules', updatedBy: admin ? String(admin.id) : null });
    return this.rules();
  }

  /** The operator used the app: remember it (at most every 10 minutes) and forget a "removed" mark */
  async touch(user) {
    if (!user || user.roleId !== OPERATOR_ROLE_ID) return;
    const last = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
    if (Date.now() - last < 10 * 60 * 1000 && !user.appRemovedAt) return;
    await User.update({ lastActiveAt: new Date() }, { where: { id: user.id }, silent: true });
  }

  /** Push delivery said the app is gone (uninstalled): remember it and tell the Super Admin and the owner */
  async appRemoved(userId) {
    const u = await User.findByPk(userId, { attributes: ['id', 'roleId', 'fullName', 'ownerId', 'appRemovedAt'] });
    if (!u || u.roleId !== OPERATOR_ROLE_ID || u.appRemovedAt) return;
    await User.update({ appRemovedAt: new Date() }, { where: { id: u.id }, silent: true });
    if (u.ownerId) {
      await notificationService.notify(u.ownerId, {
        type: 'operator_needs_attention', title: 'Operator needs attention',
        body: `${u.fullName || 'Your operator'} removed the Cranezo app from their phone.`, data: { operator_id: u.id }
      }).catch(() => {});
    }
  }

  /** The operator signs in again after removing the app: a yellow card, and the penalty if the Super Admin set one */
  async onSignIn(user) {
    if (!user || user.roleId !== OPERATOR_ROLE_ID) return;
    const fresh = await User.findByPk(user.id, { attributes: ['id', 'appRemovedAt', 'fullName'] });
    if (!fresh || !fresh.appRemovedAt) return;
    const rules = await this.rules();
    const penalty = Number(rules.reinstall_penalty || 0);
    await OperatorCard.create({
      operatorId: user.id, kind: 'yellow', source: 'app_removed', penaltyAmount: penalty,
      reason: 'Came back after removing the Cranezo app.', givenBy: 'system'
    });
    const changes = { appRemovedAt: null, lastActiveAt: new Date() };
    if (penalty > 0) { changes.conductBlocked = true; changes.penaltyDue = penalty; changes.isOnline = false; }
    await User.update(changes, { where: { id: user.id }, silent: true });
  }

  async operator(operatorId) {
    const key = String(operatorId || '').trim();
    const byId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
    const u = await User.findOne({ where: { ...(byId ? { id: key } : { memberId: key.toUpperCase() }), roleId: OPERATOR_ROLE_ID, isDeleted: 0 } });
    if (!u) throw new ConductError('Operator not found.', 404);
    return u;
  }

  /** The Super Admin gives a card. Red restricts the operator until the penalty is cleared. */
  async giveCard(admin, input = {}) {
    const kind = String(input.kind || '');
    if (!['yellow', 'red'].includes(kind)) throw new ConductError('kind must be yellow or red.');
    const reason = String(input.reason || '').trim();
    if (reason.length < 5) throw new ConductError('Write the reason (at least 5 letters).');
    const penalty = input.penalty_amount === undefined || input.penalty_amount === '' ? 0 : Number(input.penalty_amount);
    if (!Number.isFinite(penalty) || penalty < 0 || penalty > 100000) throw new ConductError('The penalty must be between 0 and 100000.');
    const u = await this.operator(input.operator_id);
    const card = await OperatorCard.create({ operatorId: u.id, kind, reason: reason.slice(0, 500), penaltyAmount: r2(penalty), source: 'admin', givenBy: admin ? String(admin.id) : null });
    if (kind === 'red') {
      await User.update({ conductBlocked: true, penaltyDue: r2(Number(u.penaltyDue || 0) + penalty), isOnline: false }, { where: { id: u.id }, silent: true });
    }
    const title = kind === 'red' ? 'Red card: your account is restricted' : 'Yellow card: a warning';
    await notificationService.notify(u.id, {
      type: 'operator_card', title,
      body: `${reason}${kind === 'red' ? ' You cannot take jobs until Cranezo clears this.' : ''}${penalty > 0 ? ` Penalty: ₹${r2(penalty)}.` : ''}`,
      data: { card_id: card.id, kind }
    }).catch(() => {});
    if (u.ownerId) {
      await notificationService.notify(u.ownerId, {
        type: 'operator_needs_attention', title: `${kind === 'red' ? 'Red' : 'Yellow'} card for ${u.fullName || 'your operator'}`,
        body: reason, data: { operator_id: u.id }
      }).catch(() => {});
    }
    return this.detail(u.id);
  }

  /** The penalty was paid / the matter is settled: the operator can work again */
  async clear(admin, input = {}) {
    const u = await this.operator(input.operator_id);
    await OperatorCard.update({ clearedAt: new Date() }, { where: { operatorId: u.id, kind: 'red', clearedAt: null } });
    await User.update({ conductBlocked: false, penaltyDue: 0 }, { where: { id: u.id }, silent: true });
    await notificationService.notify(u.id, {
      type: 'operator_card', title: 'Your account is open again', body: 'Cranezo cleared your restriction. You can take jobs again.', data: {}
    }).catch(() => {});
    return this.detail(u.id);
  }

  async detail(operatorId) {
    const u = await this.operator(operatorId);
    const cards = await OperatorCard.findAll({ where: { operatorId: u.id }, order: [['createdAt', 'DESC']] });
    return {
      operator: { id: u.id, name: u.fullName, member_id: u.memberId, mobile_number: u.mobileNumber },
      blocked: !!u.conductBlocked,
      penalty_due: Number(u.penaltyDue || 0),
      last_active_at: u.lastActiveAt,
      app_removed_at: u.appRemovedAt,
      yellow: cards.filter((c) => c.kind === 'yellow').length,
      red: cards.filter((c) => c.kind === 'red').length,
      cards: cards.map(cardView)
    };
  }

  /** What the operator sees about themselves (Home banner) */
  async mine(userId) {
    const u = await User.findByPk(userId, { attributes: ['id', 'conductBlocked', 'penaltyDue', 'safetyAckAt'] });
    const cards = await OperatorCard.findAll({ where: { operatorId: userId }, attributes: ['kind'] });
    return {
      restricted: !!(u && u.conductBlocked),
      penalty_due: u ? Number(u.penaltyDue || 0) : 0,
      yellow_cards: cards.filter((c) => c.kind === 'yellow').length,
      red_cards: cards.filter((c) => c.kind === 'red').length,
      safety_read: !!(u && u.safetyAckAt)
    };
  }

  async ackSafety(userId) {
    await User.update({ safetyAckAt: new Date() }, { where: { id: userId }, silent: true });
    return { safety_read: true };
  }

  /** Operators quiet for N days, or that removed the app (for the Super Admin, or one owner's team) */
  async attention({ ownerId = null } = {}) {
    const rules = await this.rules();
    const since = new Date(Date.now() - rules.inactive_days * DAY);
    const where = {
      roleId: OPERATOR_ROLE_ID, isDeleted: 0, isActive: 0,
      [Op.or]: [{ appRemovedAt: { [Op.ne]: null } }, { lastActiveAt: { [Op.lt]: since } }, { lastActiveAt: null, createdAt: { [Op.lt]: since } }]
    };
    if (ownerId) where.ownerId = ownerId;
    const rows = await User.findAll({ where, attributes: ['id', 'fullName', 'memberId', 'mobileNumber', 'ownerId', 'lastActiveAt', 'appRemovedAt', 'conductBlocked', 'createdAt'], order: [['lastActiveAt', 'ASC']], limit: 100 });
    return {
      inactive_days: rules.inactive_days,
      items: rows.map((u) => ({
        id: u.id, name: u.fullName, member_id: u.memberId, mobile_number: u.mobileNumber,
        reason: u.appRemovedAt ? 'app_removed' : 'inactive',
        reason_label: u.appRemovedAt ? 'Removed the app' : `No activity for ${rules.inactive_days}+ days`,
        last_active_at: u.lastActiveAt, app_removed_at: u.appRemovedAt, blocked: !!u.conductBlocked
      }))
    };
  }
}

module.exports = { conductService: new ConductService(), ConductError };
