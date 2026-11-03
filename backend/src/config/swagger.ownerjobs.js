// Swagger docs for the crane owner Jobs tabs, job details and Earnings.
// Merged into the main spec in swagger.js. All APIs are POST with a JSON payload.

const secured = [{ bearerAuth: [] }];
const ok = (description) => ({
  200: { description },
  400: { description: 'Validation error' },
  401: { description: 'Unauthorized' },
  403: { description: 'Forbidden' }
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
  tags: [
    { name: 'Owner Jobs', description: 'Crane Owner: Jobs tabs (New Requests, Upcoming, Active, Completed), job details, live location and evidence' },
    { name: 'Owner Earnings', description: 'Crane Owner: earnings by period, breakdown, settlement status, trend chart and recent completed jobs' }
  ],
  paths: {
    '/api/owner/jobs/summary': {
      post: {
        tags: ['Owner Jobs'],
        summary: 'Tab badges',
        description: 'Counts for the Jobs tabs: { new_requests, upcoming, active, completed, closed }.',
        security: secured,
        responses: ok('Counts')
      }
    },
    '/api/owner/jobs/list': {
      post: {
        tags: ['Owner Jobs'],
        summary: 'Jobs list for one tab',
        description: [
          'tab: **new_requests** (waiting for my Accept / Decline), **upcoming** (confirmed, not started), **active** (on the way or working), **completed**, **closed** (declined, expired, cancelled).',
          'Card fields: crane (title, model, code, photo), location (name, distance_km), schedule, duration_label, approx_earnings, operator and operator_label (Assigned / Awaiting operator / Not assigned).',
          'Time texts are given as numbers so the app formats them: requested_ago_minutes ("2m ago") and seconds_left for new requests, starts_in_minutes ("Starts in 2h") for upcoming, started_ago_minutes ("Started 2h 15m ago"), progress steps and timers for active, actual_duration_seconds and final_amount for completed.',
          'Accept or decline a new request with POST /api/owner/requests/accept and /decline. sort: newest (default) or oldest. Paged with min / max.'
        ].join('\n'),
        security: secured,
        requestBody: json({
          tab: { type: 'string', enum: ['new_requests', 'upcoming', 'active', 'completed', 'closed'], default: 'new_requests' },
          sort: { type: 'string', enum: ['newest', 'oldest'], default: 'newest' },
          ...rangeProps
        }),
        responses: ok('Jobs with pagination')
      }
    },
    '/api/owner/jobs/get': {
      post: {
        tags: ['Owner Jobs'],
        summary: 'Job Details (upcoming, active and completed)',
        description: 'Everything on the details screens: crane with specs, job_location, schedule, duration, assigned_operator, customer (phone after confirmation), approx_earnings, **timeline** (Request Received, Owner Accepted, Operator Notified, En Route, Arrived at Site, Working, Completed with time and state done / current / pending), **monitoring** for active jobs (start time, working and waiting seconds), **completion** for completed jobs (scheduled time, actual duration, extra time, earnings_summary with base, extra, final, platform fee and net amount, settlement), evidence counts and flags can_view_live_location, can_view_evidence, can_download_invoice (always false for now, invoices are not generated yet).',
        security: secured,
        requestBody: { required: true, ...json(bookingId, ['booking_id']) },
        responses: { ...ok('Job'), 404: { description: 'Job not found' } }
      }
    },
    '/api/owner/jobs/track': {
      post: {
        tags: ['Owner Jobs'],
        summary: 'View Live Location',
        description: 'Same payload the customer polls: stage, site position, crane position (is_live true once the operator shares location), distance, ETA and operator. Poll every 5 seconds while the screen is open.',
        security: secured,
        requestBody: { required: true, ...json(bookingId, ['booking_id']) },
        responses: ok('Tracking')
      }
    },
    '/api/owner/jobs/evidence': {
      post: {
        tags: ['Owner Jobs'],
        summary: 'View Job Evidence',
        description: 'Site photos and final photos (with place and time), job notes, arrival confirmation, and every breakdown, issue or emergency the operator reported.',
        security: secured,
        requestBody: { required: true, ...json(bookingId, ['booking_id']) },
        responses: ok('Evidence')
      }
    },
    '/api/owner/earnings/summary': {
      post: {
        tags: ['Owner Earnings'],
        summary: 'Earnings screen',
        description: [
          'period: today, week (Monday to Sunday), month or all. Dates follow India time.',
          'Returns the **earnings** breakdown (gross, platform fee 5%, other deductions, **net**), jobs_completed, compared_to_previous (e.g. vs yesterday, change_percent), the four **cards** (today, week, month, all, net amounts) and **settlement** (settled amount with last settled date; pending amount with when it will be settled, 3 days after completion).',
          'Net = final job amount - platform fee - other deductions. Other deductions are 0 until deduction rules exist. Jobs show as Pending until the Cranzo team marks them settled.'
        ].join('\n'),
        security: secured,
        requestBody: json({ period: { type: 'string', enum: ['today', 'week', 'month', 'all'], default: 'today' } }),
        responses: ok('Earnings')
      }
    },
    '/api/owner/earnings/trend': {
      post: {
        tags: ['Owner Earnings'],
        summary: 'Earnings Trend chart',
        description: 'range: week (last 7 days), month (each day of this month so far) or year (last 12 months). Returns points [{ key, label, net, gross, jobs }], the peak point (for the tooltip) and total_net.',
        security: secured,
        requestBody: json({ range: { type: 'string', enum: ['week', 'month', 'year'], default: 'month' } }),
        responses: ok('Trend')
      }
    },
    '/api/owner/earnings/jobs': {
      post: {
        tags: ['Owner Earnings'],
        summary: 'Recent Completed Jobs',
        description: 'Completed jobs, newest first: crane, location, completed_at, amount, net_amount and the tag settlement_label (Paid / Pending). Paged with min / max.',
        security: secured,
        requestBody: json(rangeProps),
        responses: ok('Jobs with pagination')
      }
    }
  }
};
