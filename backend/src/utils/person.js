/**
 * One phone number can hold up to three accounts (owner, operator, customer). For "is this the same person?"
 * rules (nobody books their own crane, the operator of a job is not its customer) compare the phone number,
 * not the account id, otherwise the same person could get around the rule with their other account.
 */
const { Op } = require('sequelize');
const { User } = require('../models');

/** Every account id that belongs to the same phone number as this account (always includes the account itself) */
const siblingIds = async (userId) => {
  if (!userId) return [];
  const me = await User.findByPk(userId, { attributes: ['id', 'countryCode', 'mobileNumber'] });
  if (!me || !me.mobileNumber) return [userId];
  const rows = await User.findAll({
    where: { mobileNumber: me.mobileNumber, countryCode: me.countryCode, isDeleted: { [Op.ne]: 1 } },
    attributes: ['id']
  });
  return [...new Set([userId, ...rows.map((r) => r.id)])];
};

/** True when both accounts are the same person (same account, or the same phone number) */
const samePerson = async (idA, idB) => {
  if (!idA || !idB) return false;
  if (idA === idB) return true;
  const rows = await User.findAll({ where: { id: [idA, idB] }, attributes: ['id', 'countryCode', 'mobileNumber'] });
  return rows.length === 2 && !!rows[0].mobileNumber
    && rows[0].mobileNumber === rows[1].mobileNumber && rows[0].countryCode === rows[1].countryCode;
};

module.exports = { siblingIds, samePerson };
