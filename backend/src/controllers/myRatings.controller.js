const { myRatingsService } = require('../services/myRatings.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');

module.exports = {
  /** POST { min, max, stars? } -> the feedback the signed-in operator / owner received, newest first, with the summary */
  list: async (req, res) => {
    try {
      const out = await myRatingsService.list(req.user, req.body || {});
      return res.status(200).json({
        status: 1,
        message: 'Ratings retrieved successfully.',
        data: { summary: out.summary, items: out.items },
        pagination: { min: out.range.min, max: out.range.max, count: out.items.length, total: out.total, has_more: out.range.max < out.total },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return errorResponse(res, error.statusCode ? error.message : 'Failed to load ratings', null, error.statusCode || 500);
    }
  }
};
