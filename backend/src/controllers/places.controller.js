const { placesService } = require('../services/places.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const handler = (message, run) => async (req, res) => {
  try {
    return successResponse(res, message, await run(req.body || {}));
  } catch (error) {
    return errorResponse(res, error.message, null, error.statusCode || 400);
  }
};

module.exports = {
  search: handler('Places retrieved successfully.', (b) => placesService.search(b)),
  reverse: handler('Address retrieved successfully.', (b) => placesService.reverse(b))
};
