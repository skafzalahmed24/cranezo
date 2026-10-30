// Swagger docs for crane management, operators, admin crane approvals and admin settings.
// Merged into the main spec in swagger.js. All read APIs are POST with a JSON payload.

const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const secured = [{ bearerAuth: [] }];
const ok = (description) => ({
  200: { description },
  400: { description: 'Validation error' },
  401: { description: 'Unauthorized' },
  403: { description: 'Forbidden' }
});
const json = (properties, required = []) => ({
  required: false,
  content: { 'application/json': { schema: { type: 'object', required, properties } } }
});

// Shared by every list API: records [min, max). Defaults 0 to 10; max - min cannot exceed 100.
const rangeProps = {
  min: { type: 'integer', default: 0, example: 0, description: 'Index of the first record (default 0)' },
  max: { type: 'integer', default: 10, example: 10, description: 'Index after the last record (default 10). { min: 10, max: 20 } is the next 10' }
};

const documentsSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      document_type: { type: 'integer', example: 28, description: 'static dropdown id, type 9' },
      file_url: { type: 'string', example: '/public/uploads/rc.pdf' },
      expiry_date: { type: 'string', format: 'date', example: '2027-08-12' }
    }
  }
};

const craneBody = {
  crane_type: { type: 'integer', example: 1, description: 'static dropdown id, type 6' },
  capacity: { type: 'integer', example: 4, description: 'static dropdown id, type 7' },
  fuel_type: { type: 'integer', example: 1, description: 'static dropdown id, type 8 (optional)' },
  model_name: { type: 'string', example: 'Liebherr LTM 1050' },
  registration_number: { type: 'string', example: 'TN-09-AB-1234' },
  location: { type: 'string', example: 'Chennai, TN' },
  latitude: { type: 'number', example: 13.0827 },
  longitude: { type: 'number', example: 80.2707 },
  hourly_rate: { type: 'number', example: 5000 },
  minimum_hours: { type: 'integer', example: 4 },
  operator_id: { type: 'string', format: 'uuid', description: 'from POST /api/owner/operators (optional)' },
  availability_status: { type: 'integer', example: 0, description: '0 available, 1 not available' },
  photos: {
    type: 'array',
    items: { type: 'string' },
    example: ['/public/uploads/crane-1.png'],
    description: 'urls returned by POST /api/upload'
  },
  documents: documentsSchema
};

module.exports = {
  tags: [
    { name: 'Owner Cranes', description: 'Crane Owner: add, view, edit cranes, manage operators, re-upload documents' },
    { name: 'Admin Crane Approvals', description: 'Admin review of submitted cranes (24-48 hrs): approve or reject with reason' },
    { name: 'Admin Settings', description: 'Manage dropdown values (add and edit only, no delete)' }
  ],
  paths: {
    '/api/owner/cranes/form-options': {
      post: {
        tags: ['Owner Cranes'],
        summary: 'Add Crane form options (dynamic dropdowns)',
        description: 'Send no body to get everything: crane_types, capacities, fuel_types, document_types, operators and availability_options. Send **type** to get just one list (array of { id, name }): 6 crane type, 7 capacity, 8 fuel type, 9 document type. Values are managed from Admin > Settings.',
        security: secured,
        requestBody: json({ type: { type: 'integer', enum: [6, 7, 8, 9], example: 6 } }),
        responses: ok('Form options')
      }
    },
    '/api/owner/operators': {
      post: {
        tags: ['Owner Cranes'],
        summary: 'Fetch all operators',
        description: 'Operators the owner added (source = owner_added) plus independently registered operators (source = registered).',
        security: secured,
        requestBody: json({
          search: { type: 'string', example: 'Rajesh', description: 'name, mobile or member id (optional)' },
          ...rangeProps
        }),
        responses: ok('Operators')
      }
    },
    '/api/owner/operators/add': {
      post: {
        tags: ['Owner Cranes'],
        summary: 'Owner adds an operator',
        description: 'Stored in the users table (role 2) with owner_id set to the calling owner. The operator can sign in later with the normal OTP flow using this mobile number.',
        security: secured,
        requestBody: json({
          full_name: { type: 'string', example: 'Rajesh Kumar' },
          mobile_number: { type: 'string', example: '9876543210' },
          country_code: { type: 'string', example: '+91' },
          user_email: { type: 'string', example: 'rajesh@example.com' },
          profile_image: { type: 'string', example: '/public/uploads/rajesh.png' }
        }, ['full_name', 'mobile_number']),
        responses: { ...ok('Operator added'), 201: { description: 'Operator added' }, 409: { description: 'Mobile number already registered' } }
      }
    },
    '/api/owner/getCranes': {
      post: {
        tags: ['Owner Cranes'],
        summary: 'Get cranes (single API: list or details by id)',
        description: 'Send **crane_id** to get one crane (object); omit it to get cranes with full details (array) for the min/max range (default 0 to 10). The response includes pagination { min, max, count, total, has_more }. No status filter: every crane is returned with its approval_label, rejection_reason and status_message. Crane owners only ever see their own cranes; owner_id is optional and must match the token.',
        security: secured,
        requestBody: json({
          crane_id: { type: 'string', format: 'uuid', description: 'Optional. Returns that crane only' },
          owner_id: { type: 'string', format: 'uuid', description: 'Optional. Owner whose cranes to list' },
          ...rangeProps
        }),
        responses: { ...ok('Crane details or list of cranes'), 404: { description: 'Crane not found' } }
      }
    },
    '/api/owner/cranes': {
      post: {
        tags: ['Owner Cranes'],
        summary: 'Submit a crane for review',
        description: 'Creates the crane as **Under Review** (approval_status 0). Admin approves within 24-48 hours. Upload photos and documents first via POST /api/upload and pass the returned urls.',
        security: secured,
        requestBody: { required: true, ...json(craneBody, ['crane_type', 'capacity', 'registration_number', 'location', 'hourly_rate', 'photos', 'documents']) },
        responses: {
          ...ok('Crane submitted'),
          201: { description: 'Crane submitted (status_message explains the 24-48 hr review)' },
          409: { description: 'Registration number already exists' }
        }
      }
    },
    '/api/owner/cranes/{id}': {
      put: {
        tags: ['Owner Cranes'],
        summary: 'Edit crane',
        description: 'Send only the fields to change. Editing a rejected crane, its type, capacity or registration, or its documents sends it back to review.',
        security: secured,
        parameters: [idParam],
        requestBody: json(craneBody),
        responses: ok('Crane updated')
      }
    },
    '/api/owner/cranes/{id}/documents': {
      put: {
        tags: ['Owner Cranes'],
        summary: 'Add or replace crane documents',
        description: 'Upload Document screen. Documents are matched by document_type and replaced; the crane goes back to Under Review.',
        security: secured,
        parameters: [idParam],
        requestBody: { required: true, ...json({ documents: documentsSchema }, ['documents']) },
        responses: ok('Documents saved')
      }
    },
    '/api/admin/cranes/list': {
      post: {
        tags: ['Admin Crane Approvals'],
        summary: 'List cranes for review',
        description: 'Pending cranes first, oldest submission first. All filters are optional.',
        security: secured,
        requestBody: json({
          approval_status: { type: 'integer', enum: [0, 1, 2], description: '0 under review, 1 verified, 2 rejected' },
          search: { type: 'string', description: 'crane code, registration number or location' },
          ...rangeProps
        }),
        responses: ok('Paginated cranes')
      }
    },
    '/api/admin/cranes/summary': {
      post: {
        tags: ['Admin Crane Approvals'],
        summary: 'Counts by approval status',
        security: secured,
        responses: ok('{ under_review, verified, rejected }')
      }
    },
    '/api/admin/cranes/get': {
      post: {
        tags: ['Admin Crane Approvals'],
        summary: 'Crane details with documents, owner and operator',
        security: secured,
        requestBody: { required: true, ...json({ crane_id: { type: 'string', format: 'uuid' } }, ['crane_id']) },
        responses: { ...ok('Crane details'), 404: { description: 'Not found' } }
      }
    },
    '/api/admin/cranes/{id}/approve': {
      put: {
        tags: ['Admin Crane Approvals'],
        summary: 'Approve crane (status becomes Verified)',
        security: secured,
        parameters: [idParam],
        responses: ok('Approved')
      }
    },
    '/api/admin/cranes/{id}/reject': {
      put: {
        tags: ['Admin Crane Approvals'],
        summary: 'Reject crane with a reason',
        security: secured,
        parameters: [idParam],
        requestBody: { required: true, ...json({ reason: { type: 'string', example: 'RC copy is not readable' } }, ['reason']) },
        responses: ok('Rejected')
      }
    },
    '/api/admin/settings/dropdown-types': {
      post: { tags: ['Admin Settings'], summary: 'List dropdown groups with counts', security: secured, responses: ok('Dropdown types') }
    },
    '/api/admin/settings/dropdowns/list': {
      post: {
        tags: ['Admin Settings'],
        summary: 'List dropdown values (including inactive)',
        security: secured,
        requestBody: json({
          type: { type: 'integer', example: 6, description: '6 crane type, 7 capacity, 8 fuel type, 9 document type (optional)' },
          ...rangeProps
        }),
        responses: ok('Dropdown values')
      }
    },
    '/api/admin/settings/dropdowns': {
      post: {
        tags: ['Admin Settings'],
        summary: 'Add a dropdown value',
        security: secured,
        requestBody: {
          required: true,
          ...json({
            type: { type: 'integer', example: 6 },
            name: { type: 'string', example: 'Floating Crane' },
            description: { type: 'string' }
          }, ['type', 'name'])
        },
        responses: { ...ok('Added'), 201: { description: 'Added' }, 409: { description: 'Duplicate' } }
      }
    },
    '/api/admin/settings/dropdowns/{id}': {
      put: {
        tags: ['Admin Settings'],
        summary: 'Edit a dropdown value (rename or set inactive)',
        description: 'There is no delete. Set status to 1 to hide a value from the apps while keeping existing records intact.',
        security: secured,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: json({
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'integer', enum: [0, 1], description: '0 active, 1 inactive' }
        }),
        responses: ok('Updated')
      }
    }
  }
};
