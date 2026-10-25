const { Op } = require('sequelize');

/**
 * Get standard prefix based on user role
 * 1 (Crane Owner) -> ONR
 * 2 (Operator)    -> OP
 * 3 (Customer)    -> CUST
 */
function getRolePrefix(roleIdentifier) {
  if (!roleIdentifier && roleIdentifier !== 0) {
    return 'MBR';
  }

  // If role object was passed
  if (typeof roleIdentifier === 'object' && roleIdentifier !== null) {
    if (roleIdentifier.id) return getRolePrefix(roleIdentifier.id);
    if (roleIdentifier.code) return getRolePrefix(roleIdentifier.code);
  }

  const str = String(roleIdentifier).trim().toUpperCase();

  // Operator
  if (str === '2' || str === 'OPERATOR' || str === 'OP') {
    return 'OP';
  }

  // Customer
  if (str === '3' || str === 'CUSTOMER' || str === 'CUST') {
    return 'CUST';
  }

  // Crane Owner
  if (str === '1' || str === 'CRANE_OWNER' || str === 'OWNER' || str === 'ONR' || str === 'CRANE OWNER') {
    return 'ONR';
  }

  return 'MBR';
}

/**
 * Generate a unique member_id for a user based on role
 * Default start length: 6 digits (e.g. OP123456, CUST123456, ONR123456)
 * If 6 digits combinations are exhausted or collision threshold is reached,
 * automatically expands to 7 digits, 8 digits, etc.
 *
 * @param {string|number|object} roleIdentifier Role ID, code, or role object
 * @param {object} UserModel Sequelize User model
 * @returns {Promise<string>} Unique member_id
 */
async function generateUniqueMemberId(roleIdentifier, UserModel) {
  const prefix = getRolePrefix(roleIdentifier);

  let digits = 6; // Start with 6 digits
  const maxRetriesPerDigit = 15;

  while (true) {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;

    for (let attempt = 0; attempt < maxRetriesPerDigit; attempt++) {
      const randomNum = Math.floor(min + Math.random() * (max - min + 1));
      const candidate = `${prefix}${randomNum}`;

      const exists = await UserModel.findOne({
        where: { memberId: candidate },
        attributes: ['id']
      });

      if (!exists) {
        return candidate;
      }
    }

    // If 6 digits space is exhausted or collisions occur, expand to next digit count (7, 8, etc.)
    digits++;
  }
}

module.exports = {
  getRolePrefix,
  generateUniqueMemberId
};
