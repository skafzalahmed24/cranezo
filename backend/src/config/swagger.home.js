// Swagger docs for the customer Home screen, home banners, and the admin banner manager.

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
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };

const bannerFields = {
  image: { type: 'string', example: '/public/uploads/banner-1.png', description: 'Upload with POST /api/upload first and send the returned file_url. Required on create.' },
  title: { type: 'string', example: 'BOOK A CRANE', description: 'Optional text drawn over the image. Leave empty when the image already contains the text.' },
  subtitle: { type: 'string', example: 'Certified cranes for your construction needs.' },
  button_text: { type: 'string', example: 'Book a Crane' },
  audience: { type: 'string', enum: ['all', 'customer', 'operator', 'owner'], default: 'all' },
  action_type: { type: 'string', enum: ['none', 'book_crane', 'screen', 'url'], default: 'none', description: 'What a tap does: none, open the Book a Crane flow, open an app screen, or open a link' },
  action_value: { type: 'string', example: 'my_jobs', description: 'For screen: my_jobs, track, support, notifications, profile or earnings. For url: an https link.' },
  sort_order: { type: 'integer', example: 1, description: 'Lowest first. New banners go to the end.' },
  is_active: { type: 'boolean', description: 'false hides the banner (there is no delete)' },
  starts_at: { type: 'string', format: 'date-time', description: 'Optional. Not shown before this time.' },
  ends_at: { type: 'string', format: 'date-time', description: 'Optional. Not shown after this time.' }
};

module.exports = {
  tags: [
    { name: 'Home', description: 'App home screens: customer Home and banners' },
    { name: 'Admin Banners', description: 'Admin: manage the banners shown on the app home screen' }
  ],
  paths: {
    '/api/home/customer': {
      post: {
        tags: ['Home'],
        summary: 'Customer Home screen',
        description: 'greeting_name and member_id (shown as "Rahul #100001"), unread_notifications (bell), banners (carousel, see /api/home/banners), quick_access (Track My Crane, My Jobs, Need Help? each with title, subtitle, icon, screen to open and a badge count) and recent_bookings (the last 3 bookings with the same card fields as My Jobs: booking_code, crane title, location, start_at, amount, tab_label). "View All" opens My Jobs.',
        security: secured,
        responses: ok('Home')
      }
    },
    '/api/home/banners': {
      post: {
        tags: ['Home'],
        summary: 'Banners for my role',
        description: 'Active banners that are inside their schedule and meant for the caller (audience all or the caller\'s role), in display order. Each has image, optional title, subtitle and button_text (draw them over the image when present), and action { type, value }: none, book_crane (open Book a Crane), screen (open the app screen named in value) or url (open the https link). Images are paths, show them as https://cranezo.com + path.',
        security: secured,
        requestBody: json({ placement: { type: 'string', default: 'home' } }),
        responses: ok('Banners')
      }
    },
    '/api/admin/banners/list': {
      post: {
        tags: ['Admin Banners'],
        summary: 'All banners (including hidden and scheduled)',
        description: 'is_live tells whether the apps show it right now (active and inside its schedule).',
        security: secured,
        requestBody: json({ audience: { type: 'string' }, min: { type: 'integer', default: 0 }, max: { type: 'integer', default: 10 } }),
        responses: ok('Banners with pagination')
      }
    },
    '/api/admin/banners': {
      post: {
        tags: ['Admin Banners'],
        summary: 'Add a banner',
        security: secured,
        requestBody: { required: true, ...json(bannerFields, ['image']) },
        responses: { ...ok('Banner'), 201: { description: 'Added' } }
      }
    },
    '/api/admin/banners/{id}': {
      put: {
        tags: ['Admin Banners'],
        summary: 'Edit, reorder, schedule or hide a banner',
        description: 'Send only what changes. There is no delete, set is_active to false to hide a banner.',
        security: secured,
        parameters: [idParam],
        requestBody: json(bannerFields),
        responses: ok('Banner')
      }
    }
  }
};
