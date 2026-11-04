// Operator job flow: configuration, checklist, and the stage of a job.

const JOB_CONFIG = {
  // the operator can start the journey this long before the booked start time
  START_JOURNEY_LEAD_HOURS: 4,
  // customer OTP for "Confirm Completion"
  OTP_VALID_MINUTES: 60,
  OTP_MAX_ATTEMPTS: 5,
  MAX_PHOTOS: 10,
  // India Standard Time, used for "today" on the operator Home and Earnings screens
  IST_OFFSET_MINUTES: 330
};

// Safety Checklist screen. Shown in this order; the app renders whatever the API returns.
const CHECKLIST_ITEMS = [
  { key: 'crane_positioned_safely', title: 'Crane positioned safely', description: 'Crane is placed on stable ground' },
  { key: 'ground_checked', title: 'Ground checked', description: 'Check for underground utilities and stability' },
  { key: 'equipment_checked', title: 'Equipment checked', description: 'Inspect crane and rigging equipment' },
  { key: 'safety_equipment_available', title: 'Safety equipment available', description: 'PPE and safety gear are available on site' },
  { key: 'site_conditions_acceptable', title: 'Site conditions acceptable', description: 'Confirm the site is safe to proceed' },
  { key: 'overhead_clearance_checked', title: 'Overhead clearance checked', description: 'No power lines or obstructions overhead' }
];
const CHECKLIST_KEYS = CHECKLIST_ITEMS.map((i) => i.key);

const STAGE_LABELS = {
  awaiting_owner: 'Awaiting owner',
  awaiting_payment: 'Waiting for advance payment',
  awaiting_operator: 'Assigned',
  accepted: 'Accepted',
  en_route: 'On the way',
  arrived: 'At the job site',
  working: 'Job in progress',
  summary: 'Job finished',
  awaiting_confirmation: 'Waiting for customer confirmation',
  completed: 'Completed',
  closed: 'Closed'
};

/** Where a booking is in its life, from the timestamps on it */
const jobStage = (b) => {
  if (b.status === 7) return 'completed';
  if ([2, 3, 4].includes(b.status)) return 'closed';
  if (b.status === 0) return 'awaiting_owner';
  if (b.status === 8) return 'awaiting_payment';
  if (b.completionRequestedAt && b.workEndedAt) return 'awaiting_confirmation';
  if (b.workEndedAt) return 'summary';
  if (b.workStartedAt) return 'working';
  if (b.arrivedAt) return 'arrived';
  if (b.enRouteAt) return 'en_route';
  if (!b.operatorId || b.operatorStatus !== 1) return 'awaiting_operator';
  return 'accepted';
};

/** What the operator app should show next, so it never has to guess the screen */
const nextAction = (b, sitePhotoCount) => {
  switch (jobStage(b)) {
    case 'awaiting_operator': return b.operatorId ? 'accept_job' : 'waiting_for_owner_to_assign';
    case 'accepted': return 'start_journey';
    case 'en_route': return 'mark_arrived';
    case 'arrived':
      if (!sitePhotoCount) return 'take_site_photos';
      if (!b.checklistCompletedAt) return 'complete_checklist';
      if (!b.arrivalConfirmedAt) return 'wait_for_customer_confirmation';
      return 'start_job';
    case 'working': return 'monitor_job';
    case 'summary': return 'request_customer_confirmation';
    case 'awaiting_confirmation': return 'enter_customer_otp';
    case 'completed': return 'done';
    default: return null;
  }
};

const iso = (d) => (d ? new Date(d).toISOString() : null);

/** Seconds spent waiting, including a waiting period that is still open */
const waitingSecondsNow = (b, now = new Date()) =>
  b.waitingSeconds + (b.waitingSince ? Math.max(0, Math.floor((now - new Date(b.waitingSince)) / 1000)) : 0);

/** Worked seconds: from start to now (or to the end) minus waiting */
const workingSecondsNow = (b, now = new Date()) => {
  if (b.workingSeconds !== null && b.workingSeconds !== undefined && b.workEndedAt) return b.workingSeconds;
  if (!b.workStartedAt) return 0;
  const end = b.workEndedAt ? new Date(b.workEndedAt) : now;
  return Math.max(0, Math.floor((end - new Date(b.workStartedAt)) / 1000) - waitingSecondsNow(b, now));
};

const timers = (b, now = new Date()) => ({
  server_now: iso(now),
  work_started_at: iso(b.workStartedAt),
  work_ended_at: iso(b.workEndedAt),
  working_seconds: workingSecondsNow(b, now),
  waiting_seconds: waitingSecondsNow(b, now),
  is_waiting: !!b.waitingSince,
  waiting_since: iso(b.waitingSince)
});

const progressSteps = (b) => [
  { key: 'on_route', label: 'On Route', at: iso(b.enRouteAt), state: b.enRouteAt ? 'done' : 'pending' },
  { key: 'arrival', label: 'Arrival', at: iso(b.arrivedAt), state: b.arrivedAt ? 'done' : 'pending' },
  { key: 'working', label: 'Working', at: iso(b.workStartedAt), state: b.workEndedAt ? 'done' : (b.workStartedAt ? 'ongoing' : 'pending') },
  { key: 'completed', label: 'Completed', at: iso(b.completedAt), state: b.completedAt ? 'done' : 'pending' }
];

/** The part of a booking the customer app needs to follow the operator's work */
const customerJobBlock = (b) => {
  const stage = jobStage(b);
  return {
    stage,
    stage_label: STAGE_LABELS[stage],
    operator_status: b.operatorStatus,
    en_route_at: iso(b.enRouteAt),
    arrived_at: iso(b.arrivedAt),
    can_confirm_arrival: !!b.arrivedAt && !b.arrivalConfirmedAt && b.status !== 7,
    arrival_confirmed_at: iso(b.arrivalConfirmedAt),
    work_started_at: iso(b.workStartedAt),
    work_ended_at: iso(b.workEndedAt),
    // shown to the customer so they can read it out to the operator
    completion_otp: stage === 'awaiting_confirmation' && b.completionOtp ? b.completionOtp : null,
    completion_otp_expires_at: stage === 'awaiting_confirmation' ? iso(b.completionOtpExpiresAt) : null,
    completed_at: iso(b.completedAt),
    final_amount: b.finalAmount !== null && b.finalAmount !== undefined ? Number(b.finalAmount) : null
  };
};

module.exports = {
  JOB_CONFIG,
  CHECKLIST_ITEMS,
  CHECKLIST_KEYS,
  STAGE_LABELS,
  jobStage,
  nextAction,
  timers,
  progressSteps,
  waitingSecondsNow,
  workingSecondsNow,
  customerJobBlock
};
