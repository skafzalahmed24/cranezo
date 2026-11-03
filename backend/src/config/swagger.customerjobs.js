// Swagger docs for the customer's life after booking: My Jobs, Job Details, Request Extra Time,
// Complete Final Payment, Rate Your Experience, Track My Cranes, plus the operator's answer to extra time.
// Merged into the main spec in swagger.js (it replaces the older booking/list and booking/get entries).

const secured = [{ bearerAuth: [] }];
const ok = (description) => ({
  200: { description },
  400: { description: 'Validation error' },
  401: { description: 'Unauthorized' },
  403: { description: 'Forbidden' },
  409: { description: 'Not allowed at this step' }
});
const json = (properties, required = []) => ({
  required: required.length > 0,
  content: { 'application/json': { schema: { type: 'object', required, properties } } }
});
const bookingId = { booking_id: { type: 'string', format: 'uuid' } };
const rangeProps = {
  min: { type: 'integer', default: 0, example: 0 },
  max: { type: 'integer', default: 10, example: 10 }
};

module.exports = {
  tags: [],
  paths: {
    '/api/customer/booking/summary': {
      post: {
        tags: ['Book a Crane'],
        summary: 'My Jobs tab counts',
        description: '{ upcoming, active, completed, cancelled }.',
        security: secured,
        responses: ok('Counts')
      }
    },
    '/api/customer/booking/list': {
      post: {
        tags: ['Book a Crane'],
        summary: 'My Jobs list (tabs)',
        description: 'tab: **upcoming** (awaiting owner or confirmed), **active** (on the way or working), **completed**, **cancelled** (cancelled, declined or expired; tab_label tells which). Card: booking_code, crane (title, capacity_label like "50 Ton Capacity", photo), location, start_at, amount (final amount once completed), payment_status and can_rate. Paged with min / max.',
        security: secured,
        requestBody: json({ tab: { type: 'string', enum: ['upcoming', 'active', 'completed', 'cancelled'], default: 'upcoming' }, ...rangeProps }),
        responses: ok('Bookings with pagination')
      }
    },
    '/api/customer/booking/get': {
      post: {
        tags: ['Book a Crane'],
        summary: 'Job Details (upcoming, in progress, completed, cancelled)',
        description: [
          'One object for every state. Besides the booking itself (crane, provider, operator with real rating, site, schedule, duration, price, job):',
          '- **timeline**: Booking Confirmed, Crane Dispatched, Arrived at Site, Job Started, then In Progress or Job Completed (state done / ongoing / pending).',
          '- **summary_rows**: booking date, location, estimated duration, estimated amount, payment status (upcoming screen).',
          '- **usage** (once work started): elapsed_seconds, booked_seconds, used_seconds, remaining_seconds, percent_used, overtime_seconds, overtime_warning (15 minutes or less left) and current_estimate { amount, hourly_rate } = usage so far at the hourly rate. **timers** for the live clock (run the clock from working_seconds at server_now).',
          '- **extension**: pending request, approved minutes and amount, history, can_request, options [30, 60, 120, 240], step, max and response time.',
          '- **payment**: booking_amount, extra_time_amount, final_total, advance, paid_amount, **balance_due**, status_label (Pending / Paid), payment_reference, paid_at, payment_methods. **receipt** once paid.',
          '- **job_summary** (completed): started_at, completed_at, total_usage_seconds.',
          '- **cancellation** (cancelled, declined, expired): cancelled_by_label, cancelled_at, reason and refund (no refund when nothing was paid).',
          '- **rebook**: the values to pre-fill "Book Again".',
          '- **rating** and **actions**: can_cancel, can_modify (always false, not built), can_track, can_confirm_arrival, can_request_extra_time, can_pay, can_rate, can_view_receipt.'
        ].join('\n'),
        security: secured,
        requestBody: { required: true, ...json(bookingId, ['booking_id']) },
        responses: { ...ok('Booking details'), 404: { description: 'Not found' } }
      }
    },
    '/api/customer/booking/active-tracking': {
      post: {
        tags: ['Book a Crane'],
        summary: 'Track My Cranes',
        description: 'Every crane of mine that is on the way or working: crane, operator, tag (On the way / Arrived / In Progress), distance_km, eta_minutes and crane_location. Open one with POST /api/customer/booking/track.',
        security: secured,
        responses: ok('Active cranes')
      }
    },
    '/api/customer/booking/extension/request': {
      post: {
        tags: ['Book a Crane'],
        summary: 'Request Extra Time',
        description: 'While the job is in progress. minutes: a multiple of 30 from 30 to 240 (chips 30 min, 1 Hour, 2 Hours, 4 Hours). Cost = hourly rate x time (₹4,000/hour -> 1 Hour = ₹4,000). The operator must approve within 5 minutes, otherwise it expires. One request at a time. Not possible when the crane is booked right after this job. Returns { extension, booking }.',
        security: secured,
        requestBody: { required: true, ...json({ ...bookingId, minutes: { type: 'integer', enum: [30, 60, 90, 120, 150, 180, 210, 240], example: 60 }, message: { type: 'string', example: 'Work is taking longer than expected.' } }, ['booking_id', 'minutes']) },
        responses: { ...ok('Extension request'), 201: { description: 'Requested' } }
      }
    },
    '/api/customer/booking/extension/cancel': {
      post: {
        tags: ['Book a Crane'],
        summary: 'Cancel the extra time request',
        security: secured,
        requestBody: { required: true, ...json(bookingId, ['booking_id']) },
        responses: ok('{ extension, booking }')
      }
    },
    '/api/customer/booking/pay': {
      post: {
        tags: ['Book a Crane'],
        summary: 'Complete Final Payment (Cash on Delivery for now)',
        description: 'After the job is completed. Only COD is live: the customer confirms the cash payment, the booking becomes Paid with a payment_reference (pay_YYMMDD_NNNNNN) and the owner and operator are told. UPI, CARD and NETBANKING are refused until they go live. Returns the booking (see /get) with payment and receipt.',
        security: secured,
        requestBody: { required: true, ...json({ ...bookingId, payment_method: { type: 'string', enum: ['COD'], default: 'COD' } }, ['booking_id']) },
        responses: ok('Paid booking with receipt')
      }
    },
    '/api/customer/booking/rate': {
      post: {
        tags: ['Book a Crane'],
        summary: 'Rate Your Experience',
        description: 'Once per completed booking. 1 to 5 stars. The same rating counts for the crane, the operator and the provider, and shows on their cards (rating and reviews_count) from then on. "Skip for now" needs no call.',
        security: secured,
        requestBody: { required: true, ...json({ ...bookingId, rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 }, comment: { type: 'string' } }, ['booking_id', 'rating']) },
        responses: { ...ok('Booking with rating'), 201: { description: 'Rated' } }
      }
    },
    '/api/operator/jobs/extension/respond': {
      post: {
        tags: ['Operator Jobs'],
        summary: 'Extra Time Request: approve or reject',
        description: 'The pending request is in job.extension.pending (minutes, amount, customer message, current_end_at and new_end_at). Approve adds the time and the amount to the booking (the customer pays it, the operator and owner earn it) and moves the end time. Reject takes an optional reason. The customer is notified. Requests not answered in 5 minutes expire.',
        security: secured,
        requestBody: { required: true, ...json({ ...bookingId, action: { type: 'string', enum: ['approve', 'reject'] }, reason: { type: 'string' } }, ['booking_id', 'action']) },
        responses: ok('Updated job (same object as /api/operator/jobs/get)')
      }
    }
  }
};
