// Swagger docs for the My Profile APIs (customer, operator, owner), app content and logout.
// Merged into the main spec in swagger.js. All APIs are POST with a JSON payload; the user comes from the Bearer token.

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

const statusNote = 'status: 0 pending, 1 verified, 2 rejected (null when nothing is uploaded).';

module.exports = {
  tags: [
    { name: 'My Profile', description: 'Signed-in customer / operator / owner: profile, personal information, language, appearance, notification settings' },
    { name: 'App Content', description: 'Terms & Conditions and Privacy Policy (public)' },
    { name: 'Operator', description: 'Operator app: cranes assigned to the signed-in operator' },
    { name: 'Admin Legal Pages', description: 'Admin: edit the Terms & Conditions and Privacy Policy shown in the apps' }
  ],
  paths: {
    '/api/profile/me': {
      post: {
        tags: ['My Profile'],
        summary: 'My Profile (header + role specific sections)',
        description: [
          'No body needed. Returns the common header (name, member id, mobile, mobile verified badge, photo, language) plus one role block:',
          '',
          '- **Customer (role 3)** -> `customer`: customer_type, is_business, `individual` (aadhar / PAN with verification status, city, state) and `business` (company, constitution, GST, nature of business, directors, finance head, branch offices).',
          '- **Operator (role 2)** -> `operator`: license number and expiry, experience, operator type, owner, `assigned_crane` (photo, title like "50 Ton Mobile Crane", model, code, fuel) and `documents` (Operator License, Aadhar Card, PAN Card, Other Documents, each with status).',
          '- **Crane Owner (role 1)** -> `owner`: basic info only for now.',
          '',
          `Document / id verification ${statusNote} \`mobile_can_change\` is always false.`
        ].join('\n'),
        security: secured,
        responses: ok('Profile')
      }
    },
    '/api/profile/update': {
      post: {
        tags: ['My Profile'],
        summary: 'Save Changes (Personal Information)',
        description: [
          'Send only the fields that changed. Mobile number cannot be changed (400).',
          '',
          '- **Everyone:** full_name, profile_image (url from POST /api/upload), user_email.',
          '- **Customer:** customer_type, aadhar_number, pan_number, city, state_id, company_name, business_address, constitution, company_date_establishment, gst_number, nature_of_business, directors_details, finance_head_details, branch_offices_details (same rules as updateProfile). Changing Aadhar or PAN resets its status to Pending.',
          '- **Operator:** operator_license_number, license_expiry_date, years_of_experience, operator_type, owner_id, operator_license_front, operator_license_back, aadhar_card_file, pan_card_file, other_document_file. A replaced document goes back to Pending.',
          '- **Owner:** full_name, profile_image, user_email only for now.',
          '',
          'Returns the updated profile (same shape as /api/profile/me).'
        ].join('\n'),
        security: secured,
        requestBody: json({
          full_name: { type: 'string', example: 'Rahul' },
          profile_image: { type: 'string', example: '/public/uploads/rahul.png' },
          user_email: { type: 'string', example: 'rahul@example.com' },
          customer_type: { type: 'integer', description: 'Customer. Dropdown type 11' },
          aadhar_number: { type: 'string', example: '1234 5678 9101', description: 'Customer (individual)' },
          pan_number: { type: 'string', example: 'PAN0012458', description: 'Customer (individual)' },
          city: { type: 'string', example: 'Kakinada' },
          state_id: { type: 'integer', description: 'Customer. Dropdown type 14' },
          company_name: { type: 'string', description: 'Customer (business)' },
          business_address: { type: 'string', description: 'Customer (business)' },
          constitution: { type: 'integer', description: 'Customer (business). Dropdown type 12' },
          company_date_establishment: { type: 'string', format: 'date', description: 'Customer (business)' },
          gst_number: { type: 'string', description: 'Customer (business)' },
          nature_of_business: { type: 'integer', description: 'Customer (business). Dropdown type 13' },
          directors_details: { type: 'string', description: 'Customer (business)' },
          finance_head_details: { type: 'string', description: 'Customer (business)' },
          branch_offices_details: { type: 'string', description: 'Customer (business)' },
          operator_license_number: { type: 'string', description: 'Operator' },
          license_expiry_date: { type: 'string', format: 'date', description: 'Operator' },
          years_of_experience: { type: 'integer', description: 'Operator. Dropdown type 3' },
          operator_type: { type: 'integer', description: 'Operator. Dropdown type 10' },
          owner_id: { type: 'string', description: 'Operator, Owner Based. Owner member id' },
          operator_license_front: { type: 'string', description: 'Operator. Upload url' },
          operator_license_back: { type: 'string', description: 'Operator. Upload url' },
          aadhar_card_file: { type: 'string', description: 'Operator. Upload url' },
          pan_card_file: { type: 'string', description: 'Operator. Upload url' },
          other_document_file: { type: 'string', description: 'Operator. Upload url' }
        }),
        responses: ok('Updated profile')
      }
    },
    '/api/profile/languages': {
      post: {
        tags: ['My Profile'],
        summary: 'Language screen: list languages with the current one marked',
        description: 'Returns [{ id, name, description, selected }]. name is the native name (English, తెలుగు, हिन्दी).',
        security: secured,
        responses: ok('Languages')
      }
    },
    '/api/profile/language/save': {
      post: {
        tags: ['My Profile'],
        summary: 'Save Language',
        security: secured,
        requestBody: { ...json({ language_id: { type: 'integer', example: 2, description: 'id from /api/profile/languages' } }, ['language_id']) },
        responses: ok('Updated language list')
      }
    },
    '/api/profile/appearance': {
      post: {
        tags: ['My Profile'],
        summary: 'Appearance screen: Light / Dark / System options with the current one marked',
        description: 'Returns [{ id, name, description, selected }] with ids system, light, dark. New users default to system (follow the phone). The current value is also returned as appearance in /api/profile/me. The app applies the theme; the server only stores the choice.',
        security: secured,
        responses: ok('Appearance options')
      }
    },
    '/api/profile/appearance/save': {
      post: {
        tags: ['My Profile'],
        summary: 'Save Appearance',
        security: secured,
        requestBody: { ...json({ appearance: { type: 'string', enum: ['system', 'light', 'dark'], example: 'dark' } }, ['appearance']) },
        responses: ok('Updated appearance options')
      }
    },
    '/api/profile/notifications': {
      post: {
        tags: ['My Profile'],
        summary: 'Notification Settings: groups and toggles',
        description: 'Returns [{ group, items: [{ key, title, subtitle, enabled }] }] in screen order. Defaults apply until the user saves.',
        security: secured,
        responses: ok('Notification settings')
      }
    },
    '/api/profile/notifications/save': {
      post: {
        tags: ['My Profile'],
        summary: 'Save Preferences',
        description: 'Send only the toggles to change (true or false). Keys: booking_confirmations, job_updates, payment_alerts, invoice_receipts, offers_promotions, product_updates, important_announcements, support_messages.',
        security: secured,
        requestBody: {
          ...json({
            preferences: {
              type: 'object',
              example: { offers_promotions: true, job_updates: false },
              additionalProperties: { type: 'boolean' }
            }
          }, ['preferences'])
        },
        responses: ok('Updated notification settings')
      }
    },
    '/api/content/legal': {
      post: {
        tags: ['App Content'],
        summary: 'Terms & Conditions or Privacy Policy',
        description: 'Public, no token needed. Returns title, intro, last_updated and numbered sections [{ number, title, subtitle, body }] for the accordion / list screens.',
        requestBody: {
          ...json({ type: { type: 'string', enum: ['terms', 'privacy'], example: 'terms' } }, ['type'])
        },
        responses: { 200: { description: 'Content' }, 400: { description: 'Invalid type' }, 404: { description: 'Not found' } }
      }
    },
    '/api/admin/legal/list': {
      post: {
        tags: ['Admin Legal Pages'],
        summary: 'List legal pages (terms and privacy)',
        security: secured,
        responses: ok('Both pages with title, last_updated and sections')
      }
    },
    '/api/admin/legal/get': {
      post: {
        tags: ['Admin Legal Pages'],
        summary: 'One legal page with all sections',
        security: secured,
        requestBody: { ...json({ type: { type: 'string', enum: ['terms', 'privacy'], example: 'terms' } }, ['type']) },
        responses: { ...ok('Legal page'), 404: { description: 'Not found' } }
      }
    },
    '/api/admin/legal/{type}': {
      put: {
        tags: ['Admin Legal Pages'],
        summary: 'Edit a legal page',
        description: 'type in the URL is terms or privacy. Send any of title, intro, last_updated, sections. sections REPLACES the whole list, so send every section to keep, in display order (add, edit, remove or reorder by changing the list). Each section needs title and body; subtitle is optional (used by the Privacy accordion). last_updated defaults to today when content changes. The apps pick the change up the next time they open the screen.',
        security: secured,
        parameters: [{ name: 'type', in: 'path', required: true, schema: { type: 'string', enum: ['terms', 'privacy'] } }],
        requestBody: {
          ...json({
            title: { type: 'string', example: 'Privacy Policy' },
            intro: { type: 'string' },
            last_updated: { type: 'string', format: 'date', example: '2026-11-04' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', example: 'Information We Collect' },
                  subtitle: { type: 'string', example: 'Types of information we collect from you' },
                  body: { type: 'string' }
                }
              }
            }
          })
        },
        responses: ok('Updated page')
      }
    },
    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout',
        description: 'Detaches this device (clears device ids so notifications stop). Tokens are stateless, so the app must also delete its stored access and refresh tokens.',
        security: secured,
        responses: ok('Logged out')
      }
    },
    '/api/operator/getAssignedCranes': {
      post: {
        tags: ['Operator'],
        summary: 'Cranes assigned to me (Operator)',
        description: 'No body: list of assigned cranes. With crane_id: that crane\'s full details (404 if it is not assigned to you). Same crane object as the owner APIs.',
        security: secured,
        requestBody: json({ crane_id: { type: 'string', format: 'uuid' } }),
        responses: { ...ok('Assigned cranes or one crane'), 404: { description: 'Crane not found' } }
      }
    }
  }
};
