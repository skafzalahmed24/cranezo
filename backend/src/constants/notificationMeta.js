// How each notification type looks and where tapping it goes.
// `icon` is a key the app maps to an icon; `category` groups types; `screen` is the app screen to open.
const META = {
  subscription_due: { category: 'payment', icon: 'payment', screen: 'subscription' },
  subscription_paid: { category: 'payment', icon: 'payment', screen: 'subscription' },
  booking_request: { category: 'booking', icon: 'booking', screen: 'owner_request' },
  crane_request: { category: 'booking', icon: 'booking', screen: 'owner_crane_requests' },
  request_accepted: { category: 'booking', icon: 'booking', screen: 'crane_request' },
  request_expired: { category: 'booking', icon: 'booking', screen: 'crane_request' },
  advance_paid: { category: 'payment', icon: 'payment', screen: 'owner_job' },
  payment_timeout: { category: 'booking', icon: 'booking', screen: 'booking' },
  // 2 minutes left to pay: opens the pay-advance screen (with '+5 minutes'); owner is told when the customer takes it
  payment_reminder: { category: 'payment', icon: 'payment', screen: 'crane_request' },
  payment_extended: { category: 'booking', icon: 'booking', screen: 'owner_job' },
  assign_operator: { category: 'job', icon: 'job', screen: 'owner_job' },
  booking_confirmed: { category: 'booking', icon: 'booking', screen: 'booking' },
  booking_declined: { category: 'booking', icon: 'booking', screen: 'booking' },
  booking_expired: { category: 'booking', icon: 'booking', screen: 'booking' },
  booking_cancelled: { category: 'booking', icon: 'booking', screen: 'booking' },
  operator_en_route: { category: 'crane', icon: 'crane', screen: 'track' },
  crane_arriving_soon: { category: 'crane', icon: 'crane', screen: 'track' },
  operator_arrived: { category: 'crane', icon: 'crane', screen: 'booking' },
  job_started: { category: 'job', icon: 'clock', screen: 'booking' },
  completion_requested: { category: 'job', icon: 'clock', screen: 'booking' },
  job_completed: { category: 'job', icon: 'check', screen: 'booking' },
  job_assigned: { category: 'job', icon: 'job', screen: 'operator_job' },
  job_accepted: { category: 'job', icon: 'job', screen: 'owner_job' },
  operator_declined: { category: 'job', icon: 'job', screen: 'owner_job' },
  arrival_confirmed: { category: 'job', icon: 'job', screen: 'operator_job' },
  extension_requested: { category: 'job', icon: 'time', screen: 'booking' },
  extension_approved: { category: 'job', icon: 'time', screen: 'booking' },
  extension_rejected: { category: 'job', icon: 'time', screen: 'booking' },
  extension_expired: { category: 'job', icon: 'time', screen: 'booking' },
  breakdown_reported: { category: 'job', icon: 'alert', screen: 'owner_job' },
  issue_reported: { category: 'job', icon: 'alert', screen: 'owner_job' },
  emergency: { category: 'job', icon: 'alert', screen: 'owner_job' },
  payment_success: { category: 'payment', icon: 'payment', screen: 'booking' },
  payment_received: { category: 'payment', icon: 'payment', screen: 'booking' },
  receipt_ready: { category: 'payment', icon: 'receipt', screen: 'receipt' },
  rating_reminder: { category: 'rating', icon: 'star', screen: 'rate' },
  rating_received: { category: 'rating', icon: 'star', screen: 'booking' },
  announcement: { category: 'announcement', icon: 'bell', screen: 'announcement' },
  support_reply: { category: 'support', icon: 'support', screen: 'support_ticket' },
  support_resolved: { category: 'support', icon: 'support', screen: 'support_ticket' },
  // complaints, operator job requests, commission and settlements
  complaint_new: { category: 'support', icon: 'alert', screen: 'complaint' },
  complaint_update: { category: 'support', icon: 'support', screen: 'complaint' },
  operator_job_request: { category: 'job', icon: 'job', screen: 'owner_job_requests' },
  job_request_rejected: { category: 'job', icon: 'job', screen: 'operator_job_requests' },
  job_request_closed: { category: 'job', icon: 'job', screen: 'operator_job_requests' },
  commission_updated: { category: 'payment', icon: 'payment', screen: 'operator_job' },
  commission_paid: { category: 'payment', icon: 'payment', screen: 'operator_payments' },
  settlement_recorded: { category: 'payment', icon: 'payment', screen: 'owner_settlements' }
};

const DEFAULT_META = { category: 'general', icon: 'bell', screen: null };

const metaFor = (type) => META[type] || DEFAULT_META;

module.exports = { metaFor, META };
