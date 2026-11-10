# Cranezo push notifications

Every notice is saved in the user's notification list (the bell) and sent as a push to the phone.
There are **54 notice types**. How loud they are:

| Kind | How many | What the phone does |
|---|---|---|
| **Ringing** | 3 | Plays the buzzer tone in a loop, like an incoming call, for up to 30 seconds (also when the app is closed) |
| **Urgent** | 9 more | Pops up at the top with the normal notification sound |
| **Normal** | 42 | Quiet notification in the list |

Ringing types: `booking_request`, `crane_request` (owner) and `job_assigned` (operator).
Urgent (no ring): `crane_approved`, `crane_rejected`, `document_rejected`, `request_accepted`, `operator_arrived`,
`completion_requested`, `extension_requested`, `breakdown_reported`, `emergency`.

In the app, while it is open, these also appear as a bottom sheet with "View details" (no ring):
`operator_arrived`, `completion_requested`, `job_started`, `job_completed`, `operator_en_route`, `request_accepted`,
`advance_paid`, `booking_confirmed`, `job_assigned`, `job_accepted`, `extension_requested`, `extension_approved`,
`extension_rejected`, `payment_received`, `payment_reminder`, `payment_extended`.

Tapping a push opens the screen named in `screen` (see `src/constants/notificationMeta.js`).

## Customer

| Type | Title | When | Kind |
|---|---|---|---|
| `request_accepted` | Owner Accepted - Pay Advance | An owner accepted the crane request | Urgent |
| `request_expired` | No Owner Accepted | Nobody accepted in time | Normal |
| `payment_reminder` | Need More Time to Pay? | 2 minutes left to pay the advance | Normal |
| `payment_timeout` | Booking Cancelled | The advance was not paid in time | Normal |
| `booking_confirmed` | Booking Confirmed | Advance paid / owner accepted a booking | Normal |
| `booking_declined` | Request Declined / Crane Unavailable | Owner declined, or another customer got the crane | Normal |
| `booking_expired` | No Response From Owner | The owner did not answer | Normal |
| `operator_en_route` | Operator is On the Way | Operator started the journey | Normal |
| `crane_arriving_soon` | Crane Arriving Soon | About 15 minutes away | Normal |
| `operator_arrived` | Operator Has Arrived | Operator reached the site | Urgent |
| `job_started` | Job Started | Work started | Normal |
| `completion_requested` | Confirm Job Completion | Operator finished; the customer reads out the code | Urgent |
| `job_completed` | Job Completed | Job closed | Normal |
| `extension_approved` | Extra Time Approved | Operator accepted extra time | Normal |
| `extension_rejected` | Extra Time Not Approved | Operator refused extra time | Normal |
| `extension_expired` | Extra Time Request Expired | No answer in 5 minutes | Normal |
| `payment_success` | Payment Successful | Online payment went through | Normal |
| `receipt_ready` | Receipt Generated | Receipt created | Normal |
| `rating_reminder` | Rate Your Experience | After the job | Normal |

## Crane owner

| Type | Title | When | Kind |
|---|---|---|---|
| `booking_request` | New Crane Request | A customer requested the owner's crane | **Rings** |
| `crane_request` | New Crane Request Near You | A new customer request near the owner's cranes (one per request) | **Rings** |
| `crane_request_raised` | Price Raised for a Crane Request | The customer raised the offer of a request the owner already got | Normal sound, does not ring |
| `booking_cancelled` | Booking Cancelled | The customer cancelled | Normal |
| `advance_paid` | Advance Paid - Booking Confirmed | The customer paid the advance | Normal |
| `assign_operator` | Assign an Operator | A paid booking needs an operator | Normal |
| `payment_extended` | Customer Needs 5 More Minutes | The customer took 5 more minutes to pay | Normal |
| `payment_timeout` | Customer Did Not Pay | The advance was not paid | Normal |
| `job_accepted` | Operator Accepted the Job | Operator accepted | Normal |
| `operator_declined` | Operator Declined the Job | Operator declined; assign another | Normal |
| `operator_offline` | Your Operator is Offline | Assigned operator is offline and the job starts within 3 hours (sent once) | Normal |
| `operator_job_request` | Operator Wants a Job | An operator asked for a job | Normal |
| `breakdown_reported` | Crane Breakdown Reported | Operator reported a breakdown | Urgent |
| `issue_reported` | Issue Reported | Operator reported an issue | Normal |
| `emergency` | EMERGENCY: Operator Needs Help | Operator pressed Get Help Now | Urgent |
| `extension_requested` | Extra Time Request | Customer asked for extra time | Urgent |
| `payment_received` | Payment Received | The customer paid online | Normal |
| `job_completed` | Job Completed | Job closed | Normal |
| `rating_received` | New Rating Received | The customer rated the job | Normal |
| `complaint_new` | New Customer Complaint | A customer complained | Normal |
| `complaint_update` | Complaint Updated | A complaint changed | Normal |
| `settlement_recorded` | Settlement Recorded | Admin recorded a settlement | Normal |
| `subscription_paid` | Subscription Active | Subscription payment received | Normal |
| `subscription_due` | Subscription Due Soon / Overdue | Due date within 3 days, or overdue (once a day) | Normal |
| `crane_approved` | Crane Approved | Admin approved the crane | Urgent |
| `crane_rejected` | Crane Not Approved | Admin rejected the crane (with the reason) | Urgent |

## Operator

| Type | Title | When | Kind |
|---|---|---|---|
| `job_assigned` | New Job Request / Job Request Accepted | The owner assigned a job, or accepted the operator's request | **Rings** |
| `arrival_confirmed` | Arrival Confirmed | The customer confirmed the arrival | Normal |
| `extension_requested` | Extra Time Request | Customer asked for extra time | Urgent |
| `payment_received` | Payment Received | The customer paid online | Normal |
| `job_request_rejected` | Job Request Not Accepted | The owner did not pick this operator | Normal |
| `job_request_closed` | Job Taken | Another operator got the job | Normal |
| `commission_updated` | Your Earnings Updated | The owner changed the commission | Normal |
| `commission_paid` | Payment Received | The owner recorded paying the commission | Normal |
| `job_completed` | Job Completed | Job closed | Normal |
| `rating_received` | New Rating Received | The customer rated the job | Normal |
| `document_verified` | Document Approved | Admin approved a document | Normal |
| `document_rejected` | Document Rejected | Admin rejected a document | Urgent |
| `operator_verified` | You Are Verified | All documents are approved: jobs can be accepted | Normal |

## Everyone

| Type | Title | When | Kind |
|---|---|---|---|
| `support_reply` | Support replied to you | The team answered a help request | Normal |
| `support_resolved` | Request resolved | A help request was closed | Normal |
| `complaint_update` | Complaint Updated | A complaint changed | Normal |
| `announcement` | (admin's title) | Admin sent an announcement to a group | Normal |
| `account_status` | Account Active / Deactivated | Admin switched the account on or off | Normal |

## Where the code is
- Types and screens: `src/constants/notificationMeta.js`, `src/constants/booking.js`
- Which ring / which are urgent: `src/services/notification.service.js` (`BUZZER_TYPES`, `URGENT_TYPES`)
- The phone side (channels, ringing, tap targets): `Cranezo/app/.../push/PushNotifications.kt`, `BuzzerPlayer.kt`, `InAppAlerts.kt`

## What happens when a push is tapped
- **App open:** the notice is shown by the app, and tapping it opens the screen directly.
- **App in the background or closed:** the push carries a click action (`com.cranezo.OPEN_PUSH`). Android starts the app's
  invisible `PushRouterActivity`, which opens Home and then the push's own screen. (Before this, a tap in the background
  only brought the app to the front, on whatever screen it was.)
- **Bell list and in-app sheet:** the same routing (`PushNotifications.targetIntent`).
- Two notices have no screen on purpose: `operator_verified` and `account_status`. A new request (`booking_request`) opens
  the request popup on Home.
