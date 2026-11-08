const { subscriptionService } = require('../services/subscription.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const run = (message, work) => async (req, res) => {
  try {
    return successResponse(res, message, await work(req));
  } catch (error) {
    return errorResponse(res, error.statusCode ? error.message : 'Could not complete the subscription request', null, error.statusCode || 500);
  }
};

const me = (req) => req.user.id;
const body = (req) => req.body || {};

module.exports = {
  // owner app
  status: run('Subscription retrieved successfully.', (req) => subscriptionService.summary(me(req), { autoTrial: !!body(req).auto_trial })),
  startTrial: run('Free trial started.', (req) => subscriptionService.startTrial(me(req))),
  order: run('Payment order created.', (req) => subscriptionService.order(me(req), body(req))),
  verify: run('Payment verified.', (req) => subscriptionService.verify(me(req), body(req))),
  sync: run('Payment checked.', (req) => subscriptionService.sync(me(req), body(req))),

  // admin panel
  plans: run('Subscription plans retrieved successfully.', () => subscriptionService.plans()),
  savePlans: run('Subscription plans saved.', (req) => subscriptionService.savePlans(body(req), req.user && req.user.id)),
  async list(req, res) {
    try {
      const out = await subscriptionService.adminList(body(req));
      const { min, max } = out.range;
      return res.status(200).json({
        status: 1,
        message: 'Subscriptions retrieved successfully.',
        data: out.items,
        summary: out.counts,
        pagination: { min, max, count: out.items.length, total: out.total, has_more: max < out.total },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return errorResponse(res, error.statusCode ? error.message : 'Could not load subscriptions', null, error.statusCode || 500);
    }
  }
};
