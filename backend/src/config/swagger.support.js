// Swagger docs for Help & Support (customer, operator, owner), the Notifications screen extras,
// and the admin side (requests, FAQs, settings, announcements). All APIs are POST with a JSON payload
// except the admin updates, which are PUT with the id in the URL.

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
const rangeProps = {
  min: { type: 'integer', default: 0, example: 0 },
  max: { type: 'integer', default: 10, example: 10 }
};
const ticketId = { ticket_id: { type: 'string', format: 'uuid' } };
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };

module.exports = {
  tags: [
    { name: 'Help & Support', description: 'Customer, operator and owner: help home, FAQs, support requests, chat, emergency' },
    { name: 'Admin Support', description: 'Admin: support requests and replies, FAQs, support settings (phone numbers), announcements' }
  ],
  paths: {
    // ---------------------------------------------------------------- app users
    '/api/support/home': {
      post: {
        tags: ['Help & Support'],
        summary: 'Help & Support screen',
        description: 'Everything on the screen: the Emergency Assistance card (phone, available false when the admin has not set a number), the tiles for this role (customer and owner: Call Support, Chat with Support, Booking Help, Payment Help, Report an Issue, FAQs; operator: Call Support, Chat with Support, Report an Issue, FAQs; each with title, subtitle, icon and action), call_support phone and hours, My Support Requests (open_count, unread_replies) and the "Our Support Team is Available" text.',
        security: secured,
        responses: ok('Help & Support')
      }
    },
    '/api/support/faq/categories': {
      post: {
        tags: ['Help & Support'],
        summary: 'FAQ categories for my role',
        description: 'Booking Help and Payment Help open their category (category_code booking_help / payment_help). Only categories that have FAQs for this role are returned.',
        security: secured,
        responses: ok('Categories')
      }
    },
    '/api/support/faq/list': {
      post: {
        tags: ['Help & Support'],
        summary: 'FAQs / "Search for help"',
        description: 'FAQs meant for my role (all + my role). category_code limits to one category (Booking Help, Payment Help ...). search matches question and answer. Paged with min / max.',
        security: secured,
        requestBody: json({ category_code: { type: 'string', example: 'booking_help' }, search: { type: 'string', example: 'cancel' }, ...rangeProps }),
        responses: ok('FAQs with pagination')
      }
    },
    '/api/support/faq/feedback': {
      post: {
        tags: ['Help & Support'],
        summary: 'Was this helpful?',
        security: secured,
        requestBody: { required: true, ...json({ faq_id: { type: 'integer' }, helpful: { type: 'boolean' } }, ['faq_id', 'helpful']) },
        responses: ok('{ faq_id, recorded }')
      }
    },
    '/api/support/tickets/create': {
      post: {
        tags: ['Help & Support'],
        summary: 'Report an Issue / Booking Help / Payment Help request',
        description: 'category: issue (Report an Issue), booking_help, payment_help or general. description is required (at least 5 characters). subject is optional (made from the description). booking_id (optional) must be a booking you are part of. photos are upload urls (up to 5). Returns the request with its first message. The user can follow it under My Support Requests.',
        security: secured,
        requestBody: {
          required: true,
          ...json({
            category: { type: 'string', enum: ['issue', 'booking_help', 'payment_help', 'general'], example: 'issue' },
            subject: { type: 'string' },
            description: { type: 'string', example: 'The app closes when I tap Complete Payment.' },
            booking_id: { type: 'string', format: 'uuid' },
            photos: { type: 'array', items: { type: 'string' }, example: ['/public/uploads/shot.png'] }
          }, ['category', 'description'])
        },
        responses: { ...ok('Support request with messages'), 201: { description: 'Created' } }
      }
    },
    '/api/support/tickets/list': {
      post: {
        tags: ['Help & Support'],
        summary: 'My Support Requests',
        description: 'status: open (open + in progress), closed (resolved + closed) or 0 to 3. Each item has ticket_code, category_label, subject, status_label (Open, In Progress, Resolved, Closed), unread_replies (new messages from the support team) and the last message. Includes chat conversations.',
        security: secured,
        requestBody: json({ status: { type: 'string', example: 'open' }, ...rangeProps }),
        responses: ok('Requests with pagination')
      }
    },
    '/api/support/tickets/get': {
      post: {
        tags: ['Help & Support'],
        summary: 'One request with its messages (also the chat thread)',
        description: 'Messages oldest first with sender_label (You, Cranezo Support, Cranezo). Opening it marks the support replies as read. can_reply is false once closed. Poll every 5 seconds while a chat is open.',
        security: secured,
        requestBody: { required: true, ...json(ticketId, ['ticket_id']) },
        responses: { ...ok('Request'), 404: { description: 'Not found' } }
      }
    },
    '/api/support/tickets/reply': {
      post: {
        tags: ['Help & Support'],
        summary: 'Send a message',
        description: 'Works for requests and for the chat. A resolved request that gets a message opens again. 409 when closed.',
        security: secured,
        requestBody: { required: true, ...json({ ...ticketId, message: { type: 'string' }, attachments: { type: 'array', items: { type: 'string' } } }, ['ticket_id', 'message']) },
        responses: { ...ok('The sent message'), 201: { description: 'Sent' } }
      }
    },
    '/api/support/tickets/close': {
      post: {
        tags: ['Help & Support'],
        summary: 'Close my request',
        security: secured,
        requestBody: { required: true, ...json(ticketId, ['ticket_id']) },
        responses: ok('Closed request')
      }
    },
    '/api/support/chat': {
      post: {
        tags: ['Help & Support'],
        summary: 'Chat with Support',
        description: 'Opens the running chat or starts a new one (with the welcome message). Same object as /api/support/tickets/get; send messages with /api/support/tickets/reply and poll /get for the answers.',
        security: secured,
        responses: ok('Chat thread')
      }
    },
    '/api/support/emergency': {
      post: {
        tags: ['Help & Support'],
        summary: 'Emergency Assistance',
        description: 'Creates an urgent request that the support team sees first and returns emergency_phone for the Call Now button. Optional booking_id, latitude, longitude and description. An operator pressing Get Help Now during a job also creates one automatically.',
        security: secured,
        requestBody: json({ booking_id: { type: 'string', format: 'uuid' }, latitude: { type: 'number' }, longitude: { type: 'number' }, description: { type: 'string' } }),
        responses: { ...ok('{ ticket, emergency_phone, message }'), 201: { description: 'Sent' } }
      }
    },
    '/api/notifications/summary': {
      post: {
        tags: ['Notifications'],
        summary: 'Notifications screen header',
        description: '{ unread, today_unread }: the "2 unread" under TODAY. Items from /api/notifications/list now also carry category, icon, target { screen, booking_id, ticket_id } and group (today / earlier).',
        security: secured,
        responses: ok('Counts')
      }
    },

    // ---------------------------------------------------------------- admin
    '/api/admin/support/tickets/summary': {
      post: { tags: ['Admin Support'], summary: 'Support counts', description: '{ open, in_progress, resolved, closed, needs_attention, emergency_open, unread_from_users }.', security: secured, responses: ok('Counts') }
    },
    '/api/admin/support/tickets/list': {
      post: {
        tags: ['Admin Support'],
        summary: 'Support requests from customers, operators and owners',
        description: 'Open requests first, emergencies and urgent ones on top, then newest activity. Filters: status (open, closed or 0 to 3), category (booking_help, payment_help, issue, general, chat, emergency), priority (normal, high, urgent), role_id (1 owner, 2 operator, 3 customer), search (code, subject, user name, mobile, member id).',
        security: secured,
        requestBody: json({ status: { type: 'string' }, category: { type: 'string' }, priority: { type: 'string' }, role_id: { type: 'integer' }, search: { type: 'string' }, ...rangeProps }),
        responses: ok('Requests with pagination')
      }
    },
    '/api/admin/support/tickets/get': {
      post: {
        tags: ['Admin Support'],
        summary: 'Request with the conversation',
        description: 'User details (name, role, contact), the linked booking, the emergency position and all messages. Opening it marks the customer messages as read.',
        security: secured,
        requestBody: { required: true, ...json(ticketId, ['ticket_id']) },
        responses: ok('Request')
      }
    },
    '/api/admin/support/tickets/reply': {
      post: {
        tags: ['Admin Support'],
        summary: 'Reply to the user',
        description: 'An open request becomes In Progress and is assigned to the replying admin. The user gets a "Support replied to you" notification.',
        security: secured,
        requestBody: { required: true, ...json({ ...ticketId, message: { type: 'string' }, attachments: { type: 'array', items: { type: 'string' } } }, ['ticket_id', 'message']) },
        responses: ok('The sent message')
      }
    },
    '/api/admin/support/tickets/{id}': {
      put: {
        tags: ['Admin Support'],
        summary: 'Change status, priority or assignee',
        description: 'status: 0 open, 1 in progress, 2 resolved, 3 closed (resolved and closed notify the user). priority: normal, high, urgent. assign_to_me: true.',
        security: secured,
        parameters: [idParam],
        requestBody: json({ status: { type: 'integer', enum: [0, 1, 2, 3] }, priority: { type: 'string', enum: ['normal', 'high', 'urgent'] }, assign_to_me: { type: 'boolean' } }),
        responses: ok('Updated request')
      }
    },
    '/api/admin/support/faq-categories/list': {
      post: { tags: ['Admin Support'], summary: 'FAQ categories (with counts)', security: secured, responses: ok('Categories') }
    },
    '/api/admin/support/faq-categories': {
      post: {
        tags: ['Admin Support'],
        summary: 'Add an FAQ category',
        security: secured,
        requestBody: { required: true, ...json({ code: { type: 'string', example: 'safety' }, name: { type: 'string' }, description: { type: 'string' }, sort_order: { type: 'integer' } }, ['code', 'name']) },
        responses: { ...ok('Category'), 201: { description: 'Added' }, 409: { description: 'Code already exists' } }
      }
    },
    '/api/admin/support/faq-categories/{id}': {
      put: {
        tags: ['Admin Support'],
        summary: 'Edit or hide a category',
        description: 'There is no delete. is_active false hides it (and its FAQs) from the apps.',
        security: secured,
        parameters: [idParam],
        requestBody: json({ name: { type: 'string' }, description: { type: 'string' }, sort_order: { type: 'integer' }, is_active: { type: 'boolean' } }),
        responses: ok('Category')
      }
    },
    '/api/admin/support/faqs/list': {
      post: {
        tags: ['Admin Support'],
        summary: 'FAQs (including hidden ones)',
        security: secured,
        requestBody: json({ category_id: { type: 'integer' }, audience: { type: 'string', enum: ['all', 'customer', 'operator', 'owner'] }, search: { type: 'string' }, ...rangeProps }),
        responses: ok('FAQs with pagination')
      }
    },
    '/api/admin/support/faqs': {
      post: {
        tags: ['Admin Support'],
        summary: 'Add an FAQ',
        description: 'audience: all, customer, operator or owner decides who sees it in the app.',
        security: secured,
        requestBody: { required: true, ...json({ category_id: { type: 'integer' }, question: { type: 'string' }, answer: { type: 'string' }, audience: { type: 'string', enum: ['all', 'customer', 'operator', 'owner'], default: 'all' }, sort_order: { type: 'integer' } }, ['category_id', 'question', 'answer']) },
        responses: { ...ok('FAQ'), 201: { description: 'Added' } }
      }
    },
    '/api/admin/support/faqs/{id}': {
      put: {
        tags: ['Admin Support'],
        summary: 'Edit or hide an FAQ',
        description: 'There is no delete. is_active false hides it from the apps.',
        security: secured,
        parameters: [idParam],
        requestBody: json({ category_id: { type: 'integer' }, question: { type: 'string' }, answer: { type: 'string' }, audience: { type: 'string' }, sort_order: { type: 'integer' }, is_active: { type: 'boolean' } }),
        responses: ok('FAQ')
      }
    },
    '/api/admin/support/settings/get': {
      post: { tags: ['Admin Support'], summary: 'Support phone numbers and texts', security: secured, responses: ok('Settings') }
    },
    '/api/admin/support/settings': {
      put: {
        tags: ['Admin Support'],
        summary: 'Save support phone numbers and texts',
        description: 'support_phone (Call Support), emergency_phone (Emergency Assistance, Call Now), support_email, hours_label, team_message ("Our Support Team is Available"), chat_welcome. The apps show Call Now only when emergency_phone is set.',
        security: secured,
        requestBody: json({ support_phone: { type: 'string', example: '+91 80000 11111' }, emergency_phone: { type: 'string', example: '+91 80000 99999' }, support_email: { type: 'string' }, hours_label: { type: 'string', example: '24/7' }, team_message: { type: 'string' }, chat_welcome: { type: 'string' } }),
        responses: ok('Saved settings')
      }
    },
    '/api/admin/announcements/list': {
      post: { tags: ['Admin Support'], summary: 'Announcements sent so far', security: secured, requestBody: json(rangeProps), responses: ok('Announcements with pagination') }
    },
    '/api/admin/announcements/send': {
      post: {
        tags: ['Admin Support'],
        summary: 'Send an announcement (e.g. "New Feature")',
        description: 'Appears in the Notifications of every active user of the audience (all, customer, operator or owner) and is pushed to phones that did not mute Important Announcements. Cannot be recalled.',
        security: secured,
        requestBody: { required: true, ...json({ title: { type: 'string', example: 'New Feature' }, body: { type: 'string', example: 'You can now save your favourite cranes for faster booking.' }, audience: { type: 'string', enum: ['all', 'customer', 'operator', 'owner'], default: 'all' } }, ['title', 'body']) },
        responses: { ...ok('Announcement with sent_count'), 201: { description: 'Sent' } }
      }
    }
  }
};
