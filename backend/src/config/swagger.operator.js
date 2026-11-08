// Swagger docs for the operator app (Home, Jobs, job steps, Earnings) plus the two related
// customer / owner calls. Merged into the main spec in swagger.js. All APIs are POST with a JSON payload.

const secured = [{ bearerAuth: [] }];
const ok = (description) => ({
  200: { description },
  400: { description: 'Validation error' },
  401: { description: 'Unauthorized' },
  403: { description: 'Forbidden' },
  409: { description: 'Not allowed at this step of the job' }
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
const photoItem = {
  type: 'object',
  properties: {
    photo_url: { type: 'string', example: '/public/uploads/site-1.jpg', description: 'url from POST /api/upload' },
    latitude: { type: 'number', example: 17.0005 },
    longitude: { type: 'number', example: 82.2475 },
    captured_at: { type: 'string', format: 'date-time' }
  }
};

const stageNote = 'Every job response has `stage` and `next_action` so the app always knows the next screen: awaiting_operator -> accept_job, accepted -> start_journey, en_route -> mark_arrived, arrived -> take_site_photos -> complete_checklist -> wait_for_customer_confirmation -> start_job, working -> monitor_job, summary -> request_customer_confirmation, awaiting_confirmation -> enter_customer_otp, completed -> done.';

const step = (summary, description, props = bookingId, required = ['booking_id']) => ({
  post: {
    tags: ['Operator Jobs'],
    summary,
    description,
    security: secured,
    requestBody: { required: true, ...json(props, required) },
    responses: ok('Updated job (same object as /api/operator/jobs/get)')
  }
});

module.exports = {
  tags: [
    { name: 'Operator Jobs', description: 'Operator app: Home, Jobs list, New Job Request and every step up to confirming completion' },
    { name: 'Operator Earnings', description: 'Operator app: Earnings summary and Jobs & Earnings list' }
  ],
  paths: {
    '/api/operator/home': {
      post: {
        tags: ['Operator Jobs'],
        summary: 'Home screen',
        description: 'Online / offline, the crane assigned to me (with the owner name), today\'s jobs, today\'s earnings, document status ("All documents verified"), the job in progress (active_job, to resume), how many jobs wait for my answer and unread notifications. "Today" means today in India time.',
        security: secured,
        responses: ok('Home')
      }
    },
    '/api/operator/status': {
      post: {
        tags: ['Operator Jobs'],
        summary: 'Go Online / Go Offline',
        security: secured,
        requestBody: { required: true, ...json({ online: { type: 'boolean' }, latitude: { type: 'number' }, longitude: { type: 'number' } }, ['online']) },
        responses: ok('{ online, online_label }')
      }
    },
    '/api/operator/location': {
      post: {
        tags: ['Operator Jobs'],
        summary: 'Share live location while driving',
        description: 'Send every 5 to 10 seconds from Start Journey until arrival. Updates the position of the crane the customer is tracking. With booking_id the response has the distance and ETA to the site.',
        security: secured,
        requestBody: { required: true, ...json({ latitude: { type: 'number' }, longitude: { type: 'number' }, ...bookingId }, ['latitude', 'longitude']) },
        responses: ok('{ updated, distance_km, eta_minutes }')
      }
    },
    '/api/operator/jobs/list': {
      post: {
        tags: ['Operator Jobs'],
        summary: 'Jobs list with tabs',
        description: 'tab: all (newest first), assigned (waiting to start), in_progress (on the way or working), completed. Items have customer_name, location, start_at, crane_label, duration_label and the tab_label tag (Assigned / In Progress / Completed). Paged with min / max.',
        security: secured,
        requestBody: json({ tab: { type: 'string', enum: ['all', 'assigned', 'in_progress', 'completed'], default: 'all' }, ...rangeProps }),
        responses: ok('Jobs with pagination')
      }
    },
    '/api/operator/jobs/get': {
      post: {
        tags: ['Operator Jobs'],
        summary: 'Job details (New Job Request screen and every later screen)',
        description: `One object with everything: requested_crane and assigned_crane, customer (phone shown after accepting), job_site (distance, ETA), schedule, duration, estimated_earnings, special_requirements, payment, progress steps, timers (working and waiting seconds, server_now), arrival, site_photos, checklist, start_checks (the 6 ticks) with can_start, final_photos, job_notes, summary (after finishing), completion and settlement. ${stageNote}`,
        security: secured,
        requestBody: { required: true, ...json(bookingId, ['booking_id']) },
        responses: { ...ok('Job'), 404: { description: 'Job not found (not assigned to you)' } }
      }
    },
    '/api/operator/jobs/accept': step('New Job Request: Accept', 'The owner is told. After this the customer phone number is visible and you can start the journey.'),
    '/api/operator/jobs/decline': step(
      'New Job Request: Decline',
      'The job goes back to the owner (who is told to assign another operator) and disappears from your list. Returns { booking_id, declined: true }.',
      { ...bookingId, reason: { type: 'string' } }
    ),
    '/api/operator/jobs/start-journey': step('Navigate to Job Site: Start Journey', 'Booking becomes En Route and the customer is notified. Allowed up to 4 hours before the booked time. Then send your position to /api/operator/location.'),
    '/api/operator/jobs/arrived': step('You\'ve Reached the Job Site', 'Asks the customer to confirm the arrival. Next: site photos and the checklist while waiting.'),
    '/api/operator/jobs/confirm-arrival': step('Confirm Arrival Manually', 'For when the customer does not confirm. The customer app confirms with POST /api/customer/booking/confirm-arrival.'),
    '/api/operator/jobs/site-photos': step(
      'Site Photo',
      'Replaces the current site photos (Retake = send the new list). Upload each photo first with POST /api/upload. At the site, before the job starts. 1 to 10 photos with place and time.',
      { ...bookingId, photos: { type: 'array', items: photoItem } },
      ['booking_id', 'photos']
    ),
    '/api/operator/jobs/checklist': {
      post: {
        tags: ['Operator Jobs'],
        summary: 'Safety Checklist items',
        description: 'Returns { items: [{ key, title, description, done }], completed_count, total, completed }. Render the items as returned.',
        security: secured,
        requestBody: { required: true, ...json(bookingId, ['booking_id']) },
        responses: ok('Checklist')
      }
    },
    '/api/operator/jobs/checklist/save': {
      post: {
        tags: ['Operator Jobs'],
        summary: 'Save the Safety Checklist',
        description: 'Send the items that changed. completed becomes true when all items are true.',
        security: secured,
        requestBody: { required: true, ...json({ ...bookingId, items: { type: 'object', example: { ground_checked: true, equipment_checked: true }, additionalProperties: { type: 'boolean' } } }, ['booking_id', 'items']) },
        responses: ok('Checklist')
      }
    },
    '/api/operator/jobs/start': step('Start Job', 'Every check in start_checks must be green: crane verified, operator verified, documents valid, arrival confirmed, site photos taken, checklist complete. Otherwise 409 with the first failing check. Booking becomes In Progress and the work timer starts.'),
    '/api/operator/jobs/waiting': step(
      'Job Monitoring: Add Waiting (start / stop)',
      'Waiting time is taken out of the working time. Returns the timers: working_seconds, waiting_seconds, is_waiting, server_now. Run the timers in the app from these values.',
      { ...bookingId, action: { type: 'string', enum: ['start', 'stop'] } },
      ['booking_id', 'action']
    ),
    '/api/operator/jobs/breakdown': step(
      'Report Crane Breakdown',
      'breakdown_type is a dropdown (POST /api/dropdowns { "type": 15 }). The owner is alerted. Returns { issue_id, kind, breakdown_type_name, status, message }.',
      { ...bookingId, breakdown_type: { type: 'integer', description: 'Dropdown type 15' }, description: { type: 'string' }, photos: { type: 'array', items: { type: 'string' } }, latitude: { type: 'number' }, longitude: { type: 'number' } },
      ['booking_id', 'breakdown_type']
    ),
    '/api/operator/jobs/issue': step(
      'Report Issue',
      'Free text issue. The owner is alerted.',
      { ...bookingId, description: { type: 'string' }, photos: { type: 'array', items: { type: 'string' } }, latitude: { type: 'number' }, longitude: { type: 'number' } },
      ['booking_id', 'description']
    ),
    '/api/operator/jobs/emergency': step(
      'Emergency: Get Help Now',
      'Creates an emergency record and alerts the owner immediately. Allowed on any active job. Contacting the Cranezo team beyond this record is not automated yet.',
      { ...bookingId, latitude: { type: 'number' }, longitude: { type: 'number' } }
    ),
    '/api/operator/jobs/finish': step(
      'Photos & Notes: Continue (finish the work)',
      'Stops the clock and fixes the amount. The job object then has summary: start and end time, working and waiting time, extra time (0 for now), base amount and final amount. Extra time and waiting are not charged yet, so final amount = booked amount.',
      { ...bookingId, final_photos: { type: 'array', items: photoItem }, notes: { type: 'string' } }
    ),
    '/api/operator/jobs/request-confirmation': {
      post: {
        tags: ['Operator Jobs'],
        summary: 'Request Customer Confirmation',
        description: 'Sends a 6 digit code to the customer (notification and booking.job.completion_otp in the customer app). The code is never returned to the operator. Valid 60 minutes; call again for a new code.',
        security: secured,
        requestBody: { required: true, ...json(bookingId, ['booking_id']) },
        responses: ok('{ otp_sent, expires_at, message }')
      }
    },
    '/api/operator/jobs/confirm-completion': step(
      'Customer Confirmation: Confirm Completion',
      'The operator types the 6 digit code the customer reads out. 5 wrong attempts lock the code (request a new one). On success the booking is Completed, the amount goes to earnings as Pending Settlement and the customer and owner are notified.',
      { ...bookingId, otp: { type: 'string', example: '482913' } },
      ['booking_id', 'otp']
    ),
    '/api/operator/earnings/summary': {
      post: {
        tags: ['Operator Earnings'],
        summary: 'Earnings screen cards',
        description: 'today_jobs, today_earnings (jobs completed today), pending_settlement and completed_settlement (settled), completed_jobs. Earnings equal the final job amount.',
        security: secured,
        responses: ok('Earnings summary')
      }
    },
    '/api/operator/earnings/list': {
      post: {
        tags: ['Operator Earnings'],
        summary: 'Jobs & Earnings list',
        description: 'Completed jobs, newest first, with customer, location, amount and the settlement tag (Pending Settlement / Settled).',
        security: secured,
        requestBody: json(rangeProps),
        responses: ok('Earnings with pagination')
      }
    },
    '/api/customer/booking/confirm-arrival': {
      post: {
        tags: ['Book a Crane'],
        summary: 'Customer confirms the operator has reached the site',
        description: 'Shown when booking.job.can_confirm_arrival is true (the operator marked arrival). The operator is notified.',
        security: secured,
        requestBody: { required: true, ...json(bookingId, ['booking_id']) },
        responses: ok('{ booking_id, arrival_confirmed }')
      }
    },
    '/api/owner/requests/assign-operator': {
      post: {
        tags: ['Crane Requests'],
        summary: 'Assign (or change) the operator of a confirmed booking',
        description: 'Use after an operator declines, or to replace the crane\'s operator. Only before the journey starts. The operator must be one of your operators or a self registered one. The new operator gets the New Job Request.',
        security: secured,
        requestBody: { required: true, ...json({ ...bookingId, operator_id: { type: 'string', format: 'uuid' } }, ['booking_id', 'operator_id']) },
        responses: ok('Request with the new operator')
      }
    }
  }
};
