/**
 * Admin panel access. Every item of the side menu is a "module"; a staff account gets a set of modules
 * through its access role (Admin > Admins & Roles). The Super Admin always has all of them.
 * The same table decides which API calls a module allows, so hiding a menu item also closes its API.
 */
const MODULES = [
  { key: 'dashboard', label: 'Dashboard', group: 'Main' },
  { key: 'users', label: 'Users (customers)', group: 'Management' },
  { key: 'owners', label: 'Owners', group: 'Management' },
  { key: 'operators', label: 'Operators', group: 'Management' },
  { key: 'cranes', label: 'Cranes', group: 'Management' },
  { key: 'crane-approvals', label: 'Crane Approvals', group: 'Management' },
  { key: 'bookings', label: 'Bookings', group: 'Operations' },
  { key: 'crane-requests', label: 'Crane Requests', group: 'Operations' },
  { key: 'payments', label: 'Payments', group: 'Operations' },
  { key: 'settlements', label: 'Settlements', group: 'Operations' },
  { key: 'complaints', label: 'Complaints', group: 'Operations' },
  { key: 'reviews', label: 'Reviews', group: 'Operations' },
  { key: 'reports', label: 'Reports & Analytics', group: 'Insights' },
  { key: 'notifications', label: 'Notifications', group: 'System' },
  { key: 'banners', label: 'Banners', group: 'System' },
  { key: 'support', label: 'Support', group: 'System' },
  { key: 'announcements', label: 'Announcements', group: 'System' },
  { key: 'legal', label: 'Legal Pages', group: 'System' },
  { key: 'platform-fee', label: 'Platform Fee', group: 'System' },
  { key: 'pricing-rules', label: 'Pricing Rules', group: 'System' },
  { key: 'subscriptions', label: 'Subscriptions', group: 'System' },
  { key: 'app-versions', label: 'App Versions', group: 'System' },
  { key: 'settings', label: 'Settings', group: 'System' }
];
const MODULE_KEYS = MODULES.map((m) => m.key);

// the members APIs say which kind of account they list with role_id (1 owner, 2 operator, 3 customer)
const MEMBER_MODULE = { 1: 'owners', 2: 'operators', 3: 'users', owners: 'owners', operators: 'operators', users: 'users' };

/**
 * Which module(s) an admin API call needs: any ONE of the returned modules is enough.
 * Returns [] when the call is open to every admin (own profile), and null when it is not known:
 * unknown calls are closed to staff (only the Super Admin can use them).
 * [path] is relative to /api/admin.
 */
const modulesForCall = (path, body = {}) => {
  const p = String(path || '').replace(/\/+$/, '') || '/';
  const rules = [
    [/^\/me$/, []],
    [/^\/(dashboard-stats|dashboard|alerts)$/, ['dashboard']],
    [/^\/bookings(\/|$)/, ['bookings']],
    [/^\/reviews$/, ['reviews']],
    [/^\/reports$/, ['reports']],
    [/^\/cranes\/[^/]+\/(approve|reject)$/, ['crane-approvals']],
    [/^\/cranes\/(summary|list|get)$/, ['cranes', 'crane-approvals']],
    [/^\/members\/(list|summary|get)$/, null], // decided by the kind below
    [/^\/members\/[^/]+\/(status|documents)$/, ['users', 'owners', 'operators']],
    [/^\/finance\/settings$/, ['platform-fee']],
    [/^\/finance\/transactions/, ['payments']],
    [/^\/finance\/settlements/, ['settlements']],
    [/^\/crane-requests/, ['crane-requests']],
    [/^\/pricing/, ['pricing-rules']],
    [/^\/subscriptions/, ['subscriptions']],
    [/^\/app-version/, ['app-versions']],
    [/^\/complaints/, ['complaints']],
    [/^\/support/, ['support']],
    [/^\/announcements/, ['announcements']],
    [/^\/banners/, ['banners']],
    [/^\/legal/, ['legal']],
    [/^\/settings/, ['settings']]
  ];
  for (const [re, modules] of rules) {
    if (!re.test(p)) continue;
    if (modules === null) {
      const kind = String((body && (body.role_id || body.kind)) || '').toLowerCase();
      return MEMBER_MODULE[kind] ? [MEMBER_MODULE[kind]] : ['users', 'owners', 'operators'];
    }
    return modules;
  }
  return null;
};

module.exports = { MODULES, MODULE_KEYS, modulesForCall };
