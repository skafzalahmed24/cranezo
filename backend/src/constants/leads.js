// The two "Join Cranezo" forms. The choices are the same as on the website; the server checks every answer against them.

const OWNER_EQUIPMENT = [
  ['hydra', 'Hydra Crane (12T / 14T / 15T)'],
  ['mobile_telescopic', 'Mobile / Telescopic Crane (20T - 50T+)'],
  ['crawler_lattice', 'Crawler / Lattice Boom Crane'],
  ['forklift_boom', 'Forklift / Boom Lift'],
  ['flatbed_lowbed', 'Flatbed / Low-Bed Trailer'],
  ['other', 'Other']
];
const OWNER_OPERATORS = [
  ['with_operator', 'Yes, machine with operator'],
  ['dry_lease', 'Machine only (dry lease)'],
  ['both', 'Both options available']
];
const OWNER_DOCS = [
  ['rc_book', 'RC Book'],
  ['insurance', 'Crane Insurance Copy'],
  ['owner_id', 'Owner ID Proof']
];
const OPERATOR_ROLES = [
  ['hydra_operator', 'Hydra Crane Operator'],
  ['mobile_telescopic_operator', 'Mobile / Telescopic Crane Operator'],
  ['forklift_trailer_operator', 'Forklift / Trailer Operator'],
  ['rigger_helper', 'Rigger / Signalman / Helper']
];
const OPERATOR_LICENSE = [
  ['hmv', 'Valid HMV (Heavy Motor Vehicle) Driving License'],
  ['lmv', 'LMV License only'],
  ['rigger_certified', 'Certified Rigger / Safety Trained (No HMV license)'],
  ['trainee', 'Trainee / Helper']
];
const OPERATOR_DOCS = [
  ['driving_license', 'Driving License'],
  ['aadhaar_id', 'Aadhaar / ID Proof'],
  ['operator_certificate', 'Operator Certificate']
];
const STATUSES = ['new', 'contacted', 'joined', 'rejected'];

const keys = (list) => list.map(([k]) => k);

module.exports = { OWNER_EQUIPMENT, OWNER_OPERATORS, OWNER_DOCS, OPERATOR_ROLES, OPERATOR_LICENSE, OPERATOR_DOCS, STATUSES, keys };
