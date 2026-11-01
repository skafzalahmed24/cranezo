const { bookingService } = require('../services/booking.service');
const { ServiceError } = require('../services/crane.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { rangeResponse } = require('../utils/range');

const handle = (res, error) => {
  if (error instanceof ServiceError) return errorResponse(res, error.message, null, error.statusCode);
  return errorResponse(res, error.message, null, 500);
};

const body = (req) => req.body || {};

/** Book a Crane (customer) and the incoming request flow (crane owner). All POST with a JSON payload. */
class BookingController {
  // ---------------- customer ----------------
  async options(req, res) {
    try {
      return successResponse(res, 'Booking options retrieved successfully.', await bookingService.options());
    } catch (error) { return handle(res, error); }
  }

  async search(req, res) {
    try {
      const { range, items, total } = await bookingService.searchCranes(req.user.id, body(req));
      const message = total === 1 ? 'We found 1 crane near you.' : `We found ${total} cranes near you.`;
      return rangeResponse(res, message, items, range, total);
    } catch (error) { return handle(res, error); }
  }

  async craneDetails(req, res) {
    try {
      return successResponse(res, 'Crane details retrieved successfully.', await bookingService.craneDetails(req.user.id, body(req)));
    } catch (error) { return handle(res, error); }
  }

  async create(req, res) {
    try {
      const booking = await bookingService.create(req.user.id, body(req));
      return successResponse(res, 'Request sent. We will notify you as soon as the owner responds.', booking, 201);
    } catch (error) { return handle(res, error); }
  }

  async customerList(req, res) {
    try {
      const { range, items, total } = await bookingService.customerList(req.user.id, body(req));
      return rangeResponse(res, 'Bookings retrieved successfully.', items, range, total);
    } catch (error) { return handle(res, error); }
  }

  async customerGet(req, res) {
    try {
      return successResponse(res, 'Booking retrieved successfully.', await bookingService.customerGet(req.user.id, body(req).booking_id));
    } catch (error) { return handle(res, error); }
  }

  async track(req, res) {
    try {
      return successResponse(res, 'Tracking retrieved successfully.', await bookingService.track(req.user.id, body(req).booking_id));
    } catch (error) { return handle(res, error); }
  }

  async cancel(req, res) {
    try {
      const booking = await bookingService.cancel(req.user.id, body(req).booking_id, body(req).reason);
      return successResponse(res, 'Booking cancelled.', booking);
    } catch (error) { return handle(res, error); }
  }

  // ---------------- crane owner ----------------
  async ownerList(req, res) {
    try {
      const { range, items, total } = await bookingService.ownerList(req.user.id, body(req));
      return rangeResponse(res, 'Requests retrieved successfully.', items, range, total);
    } catch (error) { return handle(res, error); }
  }

  async ownerSummary(req, res) {
    try {
      return successResponse(res, 'Request summary retrieved successfully.', await bookingService.ownerSummary(req.user.id));
    } catch (error) { return handle(res, error); }
  }

  async ownerGet(req, res) {
    try {
      return successResponse(res, 'Request retrieved successfully.', await bookingService.ownerGet(req.user.id, body(req).booking_id));
    } catch (error) { return handle(res, error); }
  }

  async ownerAccept(req, res) {
    try {
      return successResponse(res, 'Booking Accepted. You have accepted this crane booking request.', await bookingService.ownerAccept(req.user.id, body(req).booking_id));
    } catch (error) { return handle(res, error); }
  }

  async ownerDecline(req, res) {
    try {
      return successResponse(res, 'Request declined.', await bookingService.ownerDecline(req.user.id, body(req).booking_id, body(req).reason));
    } catch (error) { return handle(res, error); }
  }
}

module.exports = new BookingController();
