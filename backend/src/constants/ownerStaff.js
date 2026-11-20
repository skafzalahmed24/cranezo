// What an owner's employee (sub-admin) may do, and which API paths each permission opens.

const OWNER_PERMISSIONS = [
  { key: 'view_dashboard', label: 'See the dashboard, jobs and earnings' },
  { key: 'handle_requests', label: 'Accept or decline booking requests' },
  { key: 'manage_cranes', label: 'Add and edit cranes' },
  { key: 'manage_operators', label: 'Manage operators and assign jobs' },
  { key: 'view_payments', label: 'See payments, settlements and reports' },
  { key: 'manage_payments', label: 'Record payments to operators and change billing settings' }
];
const PERMISSION_KEYS = OWNER_PERMISSIONS.map((p) => p.key);

// first match wins; a path that matches nothing is not open to staff
const RULES = [
  [/^\/owner\/staff\/me$/, 'self'],
  [/^\/owner\/staff/, 'owner_only'],
  [/^\/owner\/subscription/, 'owner_only'],
  [/^\/owner\/billing\/settings\/save$/, 'manage_payments'],
  [/^\/owner\/operator-payments\/pay$/, 'manage_payments'],
  [/^\/owner\/salary\/pay$/, 'manage_payments'],
  [/^\/owner\/salary/, 'view_payments'],
  [/^\/owner\/(billing|transactions|settlements|operator-payments|report)/, 'view_payments'],
  [/^\/owner\/(requests\/(accept|decline)|crane-requests\/accept)/, 'handle_requests'],
  [/^\/owner\/(cranes|getCranes)/, 'manage_cranes'],
  [/^\/owner\/(operators|requests\/assign-operator|jobs\/commission|job-requests)/, 'manage_operators'],
  [/^\/owner\/(home|jobs|earnings|requests|crane-requests|ratings|complaints)/, 'view_dashboard'],
  [/^\/dropdowns/, 'self'],
  [/^\/upload/, 'manage_cranes'],
  [/^\/places/, 'self']
];

/** The permission a path needs: a key, 'self' (any staff), 'owner_only', or null (not open to staff) */
const permissionForPath = (url) => {
  const path = String(url || '').split('?')[0].replace(/^\/api/, '');
  const hit = RULES.find(([re]) => re.test(path));
  return hit ? hit[1] : null;
};

module.exports = { OWNER_PERMISSIONS, PERMISSION_KEYS, permissionForPath };
