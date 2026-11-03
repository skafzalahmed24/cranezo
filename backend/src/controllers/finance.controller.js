const { ServiceError } = require('../services/crane.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { rangeResponse } = require('../utils/range');
const billing = require('../services/billing');
const { ownerJobService } = require('../services/ownerJob.service');
const { paymentService } = require('../services/payment.service');
const { settlementService, METHODS, METHOD_LABELS } = require('../services/settlement.service');
const { jobRequestService } = require('../services/jobRequest.service');
const { complaintService } = require('../services/complaint.service');

/**
 * Payments, commission, settlements, operator job requests and complaints, for every role.
 * All POST with a JSON payload (the same style as the other app APIs); admin updates use PUT.
 */
const body = (req) => req.body || {};
const me = (req) => req.user.id;

const fail = (res, error) => {
  if (error instanceof ServiceError) return errorResponse(res, error.message, null, error.statusCode);
  console.error(error); // eslint-disable-line no-console
  return errorResponse(res, error.message, null, 500);
};
const handler = (message, run) => async (req, res) => {
  try { return successResponse(res, message, await run(req)); } catch (error) { return fail(res, error); }
};
const ranged = (message, run) => async (req, res) => {
  try {
    const { range, items, total } = await run(req);
    return rangeResponse(res, message, items, range, total);
  } catch (error) { return fail(res, error); }
};

const payoutMethods = () => METHODS.map((id) => ({ id, name: METHOD_LABELS[id] }));
const adminActor = (req) => ({ type: 'admin', id: req.user.id, name: req.user.name || 'Admin' });
const ownerActor = (req) => ({ type: 'owner', id: req.user.id, name: req.user.companyName || req.user.fullName });

module.exports = {
  // ======================================================================== Owner app
  ownerBillingGet: handler('Billing settings retrieved successfully.', async (req) => ({
    ...(await billing.ownerSettings(me(req))),
    platform_fee_percent: await billing.platformFeePercent(),
    charge_types: billing.CHARGE_TYPES.map((id) => ({ id, name: id === 'fixed' ? 'Fixed amount (₹)' : 'Percentage of job amount (%)' })),
    commission_types: billing.COMMISSION_TYPES.map((id) => ({ id, name: billing.COMMISSION_LABELS[id] }))
  })),
  ownerBillingSave: handler('Billing settings saved. New bookings will use them.', (req) => billing.saveOwnerSettings(me(req), body(req))),
  ownerSetCommission: handler('Operator commission saved.', (req) => ownerJobService.setCommission(me(req), body(req))),
  ownerTransactions: ranged('Transactions retrieved successfully.', (req) => paymentService.ownerTransactions(me(req), body(req))),
  ownerPlatformPending: handler('Settlement details retrieved successfully.', (req) => settlementService.pendingJobs(me(req), { forAdmin: false })),
  ownerSettlements: ranged('Settlements retrieved successfully.', (req) => settlementService.ownerList(me(req), body(req))),
  ownerSettlementGet: handler('Settlement retrieved successfully.', (req) => settlementService.getFor(body(req).settlement_id, { ownerId: me(req) })),
  ownerOperatorDues: handler('Operator payments retrieved successfully.', async (req) => ({
    ...(await settlementService.operatorDues(me(req))),
    payout_methods: payoutMethods()
  })),
  ownerOperatorPending: handler('Operator jobs retrieved successfully.', (req) => settlementService.operatorPendingJobs(me(req), body(req).operator_id)),
  ownerPayOperator: handler('Payment to operator recorded.', (req) => settlementService.payOperator(me(req), body(req))),
  ownerJobRequests: ranged('Job requests retrieved successfully.', (req) => jobRequestService.ownerRequests(me(req), body(req))),
  ownerJobRequestRespond: handler('Job request answered.', (req) => jobRequestService.respond(me(req), body(req))),
  ownerComplaints: ranged('Complaints retrieved successfully.', (req) => complaintService.ownerList(me(req), body(req))),
  ownerComplaintSummary: handler('Complaint counts retrieved successfully.', (req) => complaintService.summary({ ownerId: me(req) })),
  ownerComplaintGet: handler('Complaint retrieved successfully.', (req) => complaintService.ownerGet(me(req), body(req).complaint_id)),
  ownerComplaintUpdate: handler('Complaint updated.', (req) => complaintService.update(ownerActor(req), body(req))),

  // ======================================================================== Operator app
  operatorAvailableJobs: ranged('Available jobs retrieved successfully.', (req) => jobRequestService.available(me(req), body(req))),
  operatorRequestJob: handler('Request sent to the owner.', (req) => jobRequestService.request(me(req), body(req))),
  operatorWithdrawRequest: handler('Request withdrawn.', (req) => jobRequestService.withdraw(me(req), body(req).request_id)),
  operatorMyRequests: ranged('Your job requests retrieved successfully.', (req) => jobRequestService.operatorRequests(me(req), body(req))),
  operatorSettlements: ranged('Payments retrieved successfully.', (req) => settlementService.operatorList(me(req), body(req))),
  operatorSettlementGet: handler('Payment retrieved successfully.', (req) => settlementService.getFor(body(req).settlement_id, { operatorId: me(req) })),

  // ======================================================================== Customer app
  customerTransactions: ranged('Payment history retrieved successfully.', (req) => paymentService.customerTransactions(me(req), body(req))),
  complaintOptions: handler('Complaint options retrieved successfully.', () => complaintService.options()),
  customerComplaintCreate: handler('Complaint submitted. We will update you here.', (req) => complaintService.create(me(req), body(req))),
  customerComplaints: ranged('Complaints retrieved successfully.', (req) => complaintService.customerList(me(req), body(req))),
  customerComplaintGet: handler('Complaint retrieved successfully.', (req) => complaintService.customerGet(me(req), body(req).complaint_id)),
  customerComplaintReply: handler('Message added.', (req) => complaintService.customerReply(me(req), body(req))),

  // ======================================================================== Admin panel
  adminPlatformSettings: handler('Platform settings retrieved successfully.', async () => ({ platform_fee_percent: await billing.platformFeePercent() })),
  adminSavePlatformSettings: handler('Platform fee updated. It applies to jobs completed from now on.', async (req) => ({
    platform_fee_percent: await billing.setPlatformFeePercent(body(req).platform_fee_percent, req.user.id)
  })),
  adminTransactions: ranged('Transactions retrieved successfully.', (req) => paymentService.adminTransactions(body(req))),
  adminTransactionSummary: handler('Payment summary retrieved successfully.', () => paymentService.adminSummary()),
  adminSettlementBalances: handler('Settlement balances retrieved successfully.', async (req) => ({
    ...(await settlementService.adminBalances(body(req))),
    payout_methods: payoutMethods()
  })),
  adminSettlementPending: handler('Owner jobs retrieved successfully.', (req) => settlementService.pendingJobs(body(req).owner_id)),
  adminSettle: handler('Settlement recorded.', (req) => settlementService.settleOwner(req.user, body(req))),
  adminSettlements: ranged('Settlements retrieved successfully.', (req) => settlementService.adminList(body(req))),
  adminSettlementGet: handler('Settlement retrieved successfully.', (req) => settlementService.get(body(req).settlement_id)),
  adminComplaints: ranged('Complaints retrieved successfully.', (req) => complaintService.adminList(body(req))),
  adminComplaintSummary: handler('Complaint counts retrieved successfully.', () => complaintService.summary()),
  adminComplaintGet: handler('Complaint retrieved successfully.', (req) => complaintService.adminGet(body(req).complaint_id)),
  adminComplaintUpdate: handler('Complaint updated.', (req) => complaintService.update(adminActor(req), body(req)))
};
