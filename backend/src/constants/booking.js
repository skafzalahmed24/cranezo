// bookings.status
const BOOKING_STATUS = {
  AWAITING_OWNER: 0,
  CONFIRMED: 1,
  DECLINED: 2,
  EXPIRED: 3,
  CANCELLED: 4,
  EN_ROUTE: 5,
  IN_PROGRESS: 6,
  COMPLETED: 7
};

const BOOKING_STATUS_LABELS = {
  0: 'Awaiting Owner',
  1: 'Confirmed',
  2: 'Declined',
  3: 'Expired',
  4: 'Cancelled',
  5: 'En Route',
  6: 'In Progress',
  7: 'Completed'
};

// Statuses that keep a crane busy for the booked window
const BUSY_STATUSES = [
  BOOKING_STATUS.AWAITING_OWNER,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.EN_ROUTE,
  BOOKING_STATUS.IN_PROGRESS
];

// Only requests that are accepted (or further along) block other customers for certain.
// Pending requests are not blocking, so two customers can ask for the same crane; the owner picks.
const BLOCKING_STATUSES = [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS];

const BOOKING_CONFIG = {
  // owners and cranes farther than this from the job site are never shown or notified
  MATCH_RADIUS_KM: 20,
  // average speed used for the ETA estimate (heavy vehicle)
  AVG_SPEED_KMPH: 20,
  // design: "Hours - Minimum 4 hours"
  MIN_HOURS: 4,
  MAX_HOURS: 12,
  FULL_DAY_HOURS: 8,
  MAX_DAYS: 30,
  // how far ahead a customer can schedule
  MAX_SCHEDULE_DAYS: 90,
  MIN_SCHEDULE_LEAD_MINUTES: 30,
  // how long an owner has to answer before the request expires
  REQUEST_TTL_NOW_MINUTES: 10,
  REQUEST_TTL_SCHEDULED_MINUTES: 120,
  ADVANCE_PERCENT: 20,
  // Cranzo's share of every completed job; the owner receives the rest
  PLATFORM_FEE_PERCENT: 5,
  // a completed job is settled to the owner this many days after completion
  SETTLEMENT_DAYS: 3,
  // Request Extra Time: choices in minutes, and how long the operator has to answer
  EXTRA_TIME_OPTIONS: [30, 60, 120, 240],
  EXTRA_TIME_STEP_MINUTES: 30,
  EXTRA_TIME_MAX_MINUTES: 240,
  EXTRA_TIME_RESPONSE_MINUTES: 5,
  // "Overtime approaching" shows when this little booked time is left
  OVERTIME_WARNING_MINUTES: 15
};

// Only COD is live for now; the others are listed so the app can show them as "coming soon"
const PAYMENT_METHODS = [
  { id: 'COD', name: 'Cash on Delivery', description: 'Pay when the crane arrives', enabled: true },
  { id: 'UPI', name: 'UPI', description: 'Pay instantly using UPI apps', enabled: false },
  { id: 'CARD', name: 'Credit / Debit Card', description: 'Visa, MasterCard, RuPay, etc.', enabled: false },
  { id: 'NETBANKING', name: 'Net Banking', description: 'All major banks supported', enabled: false }
];

const NOTIFICATION_TYPES = {
  BOOKING_REQUEST: 'booking_request',
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_DECLINED: 'booking_declined',
  BOOKING_EXPIRED: 'booking_expired',
  BOOKING_CANCELLED: 'booking_cancelled',
  // operator job flow
  JOB_ASSIGNED: 'job_assigned',
  JOB_ACCEPTED: 'job_accepted',
  OPERATOR_DECLINED: 'operator_declined',
  OPERATOR_EN_ROUTE: 'operator_en_route',
  OPERATOR_ARRIVED: 'operator_arrived',
  JOB_STARTED: 'job_started',
  COMPLETION_REQUESTED: 'completion_requested',
  JOB_COMPLETED: 'job_completed',
  BREAKDOWN_REPORTED: 'breakdown_reported',
  ISSUE_REPORTED: 'issue_reported',
  EMERGENCY: 'emergency',
  EXTENSION_REQUESTED: 'extension_requested',
  EXTENSION_APPROVED: 'extension_approved',
  EXTENSION_REJECTED: 'extension_rejected',
  EXTENSION_EXPIRED: 'extension_expired',
  PAYMENT_RECEIVED: 'payment_received',
  RATING_RECEIVED: 'rating_received'
};

const EXTENSION_STATUS = { PENDING: 0, APPROVED: 1, REJECTED: 2, CANCELLED: 3, EXPIRED: 4 };
const EXTENSION_STATUS_LABELS = { 0: 'Under Review', 1: 'Approved', 2: 'Rejected', 3: 'Cancelled', 4: 'Expired' };

module.exports = {
  BOOKING_STATUS,
  BOOKING_STATUS_LABELS,
  BUSY_STATUSES,
  BLOCKING_STATUSES,
  BOOKING_CONFIG,
  EXTENSION_STATUS,
  EXTENSION_STATUS_LABELS,
  PAYMENT_METHODS,
  NOTIFICATION_TYPES
};
