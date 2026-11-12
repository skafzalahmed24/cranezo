// What an admin account may open in the admin panel. The server decides (GET /admin/me); this only hides
// what the account cannot use. The Super Admin has ["*"].

// detail pages belong to the module of their list
const VIEW_MODULE = {
  'user-details': 'users',
  'owner-details': 'owners',
  'operator-details': 'operators',
  'crane-details': 'cranes',
  'crane-matching': 'bookings',
};

// the order the panel opens in: the first one the account may use
const FIRST_CHOICE = [
  'dashboard', 'bookings', 'cranes', 'crane-approvals', 'users', 'owners', 'operators', 'crane-requests', 'payments',
  'settlements', 'complaints', 'reviews', 'reports', 'support', 'announcements', 'notifications', 'banners', 'legal',
  'subscriptions', 'platform-fee', 'pricing-rules', 'app-versions', 'settings',
];

export const canView = (permissions, view) => {
  if (!Array.isArray(permissions)) return false;
  const all = permissions.includes('*');
  if (view === 'admin-access' || view === 'clear-data') return all; // Admins & Roles, Clear Database: Super Admin only
  if (all) return true;
  // a crane can be opened from the list of cranes or from the approvals
  if (view === 'crane-details') return permissions.includes('cranes') || permissions.includes('crane-approvals');
  return permissions.includes(VIEW_MODULE[view] || view);
};

export const firstAllowedView = (permissions) => FIRST_CHOICE.find((view) => canView(permissions, view)) || null;
