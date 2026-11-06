const { User } = require('../models');
const { errorResponse } = require('../utils/apiResponse');

const DOC_ATTRS = ['id', 'operatorLicenseFront', 'operatorLicenseStatus', 'aadharCardFile', 'aadharStatus',
  'panCardFile', 'panStatus', 'otherDocumentFile', 'otherDocumentStatus'];

/**
 * An operator can work once the admin has verified them: the driving / operator license is approved
 * and every other document they uploaded is approved too (none pending or rejected).
 */
function isVerifiedOperator(u) {
  if (!u || !u.operatorLicenseFront || u.operatorLicenseStatus !== 1) return false;
  const others = [
    [u.aadharCardFile, u.aadharStatus],
    [u.panCardFile, u.panStatus],
    [u.otherDocumentFile, u.otherDocumentStatus]
  ];
  return others.every(([file, status]) => !file || status === 1);
}

const NOT_VERIFIED = 'Your documents are waiting for Cranezo to verify them. You can take jobs once they are approved.';

async function operatorVerified(operatorId) {
  const u = await User.findByPk(operatorId, { attributes: DOC_ATTRS });
  return isVerifiedOperator(u);
}

/**
 * Blocks job actions for operators the admin has not verified yet. Going offline is always allowed;
 * safety reports (breakdown, issue, emergency) are never blocked.
 */
const requireVerifiedOperator = async (req, res, next) => {
  try {
    if (req.path === '/status' && req.body && req.body.online !== true) return next();
    if (await operatorVerified(req.user.id)) return next();
    return errorResponse(res, NOT_VERIFIED, { code: 'OPERATOR_NOT_VERIFIED' }, 403);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = { requireVerifiedOperator, isVerifiedOperator, operatorVerified, NOT_VERIFIED, DOC_ATTRS };
