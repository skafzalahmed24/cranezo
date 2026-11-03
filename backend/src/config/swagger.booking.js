// Swagger docs for Book a Crane (customer), incoming crane requests (owner) and notifications.
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

const rangeProps = {
  min: { type: 'integer', default: 0, example: 0, description: 'Index of the first record (default 0)' },
  max: { type: 'integer', default: 10, example: 10, description: 'Index after the last record (default 10)' }
};

// "what / where / when / how long" shared by search, crane-details and create
const requirement = {
  latitude: { type: 'number', example: 17.0005, description: 'Job site latitude' },
  longitude: { type: 'number', example: 82.2475, description: 'Job site longitude' },
  start_type: { type: 'string', enum: ['now', 'scheduled'], default: 'now' },
  scheduled_at: { type: 'string', format: 'date-time', example: '2026-09-05T09:00:00+05:30', description: 'Required when start_type is scheduled. ISO date time with the phone timezone' },
  duration: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['hours', 'full_day', 'days'], example: 'hours' },
      hours: { type: 'integer', example: 8, description: 'type hours: 4 to 12 (and not below the crane minimum)' },
      days: { type: 'integer', example: 2, description: 'type days: 1 to 30 (each day is 8 working hours)' }
    }
  }
};

module.exports = {
  tags: [
    { name: 'Book a Crane', description: 'Customer: pick crane type and capacity, find cranes within 20 km, review the price and send the request' },
    { name: 'Crane Requests', description: 'Crane Owner: the New Crane Request buzzer, accept or decline' },
    { name: 'Notifications', description: 'In-app notification feed and push registration for all app users' }
  ],
  paths: {
    '/api/customer/booking/options': {
      post: {
        tags: ['Book a Crane'],
        summary: 'Everything the Book a Crane steps need',
        description: 'Crane types (with image) for step 1, capacities (with description) for step 2, start options, duration options and limits, payment methods (only COD is enabled now), advance percent (20), search radius (20 km) and how long an owner has to answer.',
        security: secured,
        responses: ok('Booking options')
      }
    },
    '/api/customer/booking/search': {
      post: {
        tags: ['Book a Crane'],
        summary: 'Available Cranes: "We found N cranes near you"',
        description: 'Verified, available cranes of the chosen type and capacity within 20 km of the job site, nearest first, that are not already booked for the requested time. Each item has distance_km, eta_minutes, hourly_rate, operator_included and the price for the requested duration (total, 20% advance, remaining). rating is null until reviews exist. Paged with min / max (default 0 to 10).',
        security: secured,
        requestBody: {
          required: true,
          ...json({
            crane_type: { type: 'integer', example: 31, description: 'Dropdown type 6' },
            capacity: { type: 'integer', example: 38, description: 'Dropdown type 7' },
            radius_km: { type: 'number', example: 20, description: 'Optional, cannot be more than 20' },
            ...requirement,
            ...rangeProps
          }, ['crane_type', 'capacity', 'latitude', 'longitude', 'duration'])
        },
        responses: ok('Cranes with pagination { min, max, count, total, has_more }')
      }
    },
    '/api/customer/booking/crane-details': {
      post: {
        tags: ['Book a Crane'],
        summary: 'Crane Details + the numbers for Review Your Booking',
        description: 'Photos, specifications, About text, provider, distance, ETA and the price breakdown for the requested duration. bookable is false (with not_bookable_reason) when the crane is booked, too far or unavailable, so the app can disable Select This Crane.',
        security: secured,
        requestBody: {
          required: true,
          ...json({
            crane_id: { type: 'string', format: 'uuid' },
            site_address: { type: 'string', description: 'Optional, echoed in booking_details' },
            ...requirement
          }, ['crane_id', 'latitude', 'longitude', 'duration'])
        },
        responses: { ...ok('Crane details'), 404: { description: 'Crane not found' } }
      }
    },
    '/api/customer/booking/create': {
      post: {
        tags: ['Book a Crane'],
        summary: 'Confirm & Pay: send the booking request (Cash on Delivery for now)',
        description: 'Creates the booking as "Awaiting Owner" and sends the New Crane Request buzzer to the owner of that crane (only cranes within 20 km can be booked). The owner has 10 minutes for Now bookings and 2 hours for scheduled ones; after that the request expires and the customer can pick another crane. The price is always calculated on the server. payment_method defaults to COD; UPI, CARD and NETBANKING are rejected until they go live. Latitude and longitude are stored with the booking.',
        security: secured,
        requestBody: {
          required: true,
          ...json({
            crane_id: { type: 'string', format: 'uuid' },
            site_name: { type: 'string', example: 'Construction Site, Kakinada' },
            site_address: { type: 'string', example: '14-2-5, Radhalapeta, Kalyana Mandapam, Pithapuram, Andhra Pradesh 533450' },
            payment_method: { type: 'string', enum: ['COD'], default: 'COD' },
            special_requirements: { type: 'string', example: 'Heavy lifting equipment required. Site access available.', description: 'Optional note for the operator (up to 1000 characters)' },
            ...requirement
          }, ['crane_id', 'site_address', 'latitude', 'longitude', 'duration'])
        },
        responses: { ...ok('Booking created'), 201: { description: 'Request sent' }, 409: { description: 'Crane no longer available for that time' } }
      }
    },
    '/api/customer/booking/list': {
      post: {
        tags: ['Book a Crane'],
        summary: 'My bookings',
        security: secured,
        requestBody: json({
          group: { type: 'string', enum: ['active', 'past'], description: 'active: awaiting / confirmed / en route / in progress. past: declined / expired / cancelled / completed' },
          status: { type: 'integer', description: '0 awaiting owner, 1 confirmed, 2 declined, 3 expired, 4 cancelled, 5 en route, 6 in progress, 7 completed' },
          ...rangeProps
        }),
        responses: ok('Bookings with pagination')
      }
    },
    '/api/customer/booking/get': {
      post: {
        tags: ['Book a Crane'],
        summary: 'Booking details (Booking Confirmed screen)',
        description: 'Crane, provider, operator (after confirmation), schedule, price breakdown, payment summary (total, advance, remaining) and status. Poll this while status is 0 (Awaiting Owner).',
        security: secured,
        requestBody: { required: true, ...json({ booking_id: { type: 'string', format: 'uuid' } }, ['booking_id']) },
        responses: { ...ok('Booking'), 404: { description: 'Not found' } }
      }
    },
    '/api/customer/booking/track': {
      post: {
        tags: ['Book a Crane'],
        summary: 'Track My Crane',
        description: 'Light payload to poll every few seconds: status, operator, site position, crane position (is_live false means the crane home position until the operator app shares live location), distance, ETA and expected arrival.',
        security: secured,
        requestBody: { required: true, ...json({ booking_id: { type: 'string', format: 'uuid' } }, ['booking_id']) },
        responses: ok('Tracking')
      }
    },
    '/api/customer/booking/cancel': {
      post: {
        tags: ['Book a Crane'],
        summary: 'Cancel a booking',
        description: 'Allowed while Awaiting Owner or Confirmed. The owner is notified.',
        security: secured,
        requestBody: { required: true, ...json({ booking_id: { type: 'string', format: 'uuid' }, reason: { type: 'string' } }, ['booking_id']) },
        responses: { ...ok('Cancelled booking'), 409: { description: 'Can no longer be cancelled' } }
      }
    },
    '/api/owner/requests/list': {
      post: {
        tags: ['Crane Requests'],
        summary: 'Crane requests for my cranes',
        description: 'Waiting requests first, then newest. Each item has the requested crane, job location with distance_km, required date and time (schedule.start_at), duration, approx_earnings, seconds_left and can_respond. The customer phone is hidden until the request is accepted.',
        security: secured,
        requestBody: json({ status: { type: 'integer', description: '0 awaiting my response, 1 confirmed, 2 declined, 3 expired, 4 cancelled' }, ...rangeProps }),
        responses: ok('Requests with pagination')
      }
    },
    '/api/owner/requests/summary': {
      post: {
        tags: ['Crane Requests'],
        summary: 'Request counts (use awaiting_response for a badge)',
        security: secured,
        responses: ok('{ total, awaiting_response, confirmed, declined, expired, cancelled, completed }')
      }
    },
    '/api/owner/requests/get': {
      post: {
        tags: ['Crane Requests'],
        summary: 'One request (New Crane Request popup)',
        security: secured,
        requestBody: { required: true, ...json({ booking_id: { type: 'string', format: 'uuid' } }, ['booking_id']) },
        responses: { ...ok('Request'), 404: { description: 'Not found' } }
      }
    },
    '/api/owner/requests/accept': {
      post: {
        tags: ['Crane Requests'],
        summary: 'Accept (Booking Accepted screen)',
        description: 'Confirms the booking, assigns the crane operator, reveals the customer phone and notifies the customer. Other customers waiting for the same crane and time are told it was booked. 409 when the request already expired or the crane is no longer free.',
        security: secured,
        requestBody: { required: true, ...json({ booking_id: { type: 'string', format: 'uuid' } }, ['booking_id']) },
        responses: { ...ok('Accepted request with next_steps'), 409: { description: 'Already answered, expired or crane busy' } }
      }
    },
    '/api/owner/requests/decline': {
      post: {
        tags: ['Crane Requests'],
        summary: 'Decline',
        security: secured,
        requestBody: { required: true, ...json({ booking_id: { type: 'string', format: 'uuid' }, reason: { type: 'string' } }, ['booking_id']) },
        responses: ok('Declined request')
      }
    },
    '/api/notifications/list': {
      post: {
        tags: ['Notifications'],
        summary: 'Notification feed (newest first)',
        description: 'The owner buzzer is an item with type booking_request and data { booking_id, booking_code, expires_at }. Other types: booking_confirmed, booking_declined, booking_expired, booking_cancelled. Poll this (or unread-count) every 10 to 15 seconds while the app is open if push is not enabled.',
        security: secured,
        requestBody: json({ unread_only: { type: 'boolean' }, ...rangeProps }),
        responses: ok('Notifications with pagination')
      }
    },
    '/api/notifications/unread-count': {
      post: { tags: ['Notifications'], summary: 'Unread count', security: secured, responses: ok('{ unread }') }
    },
    '/api/notifications/mark-read': {
      post: {
        tags: ['Notifications'],
        summary: 'Mark notifications as read',
        security: secured,
        requestBody: json({ ids: { type: 'array', items: { type: 'string', format: 'uuid' } }, all: { type: 'boolean' } }),
        responses: ok('{ updated, unread }')
      }
    },
    '/api/notifications/register-device': {
      post: {
        tags: ['Notifications'],
        summary: 'Register the phone push token',
        description: 'Call after login and whenever the FCM token changes. Needed for the buzzer to reach a phone that is closed.',
        security: secured,
        requestBody: { required: true, ...json({ push_token: { type: 'string' }, platform: { type: 'string', example: 'android' } }, ['push_token']) },
        responses: ok('Registered')
      }
    }
  }
};
