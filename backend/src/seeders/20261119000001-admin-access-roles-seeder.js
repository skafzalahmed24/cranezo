'use strict';

/**
 * Starter access roles for the admin panel (Admins & Roles). Edit them, or make new ones, in the admin panel.
 * Safe to run again: a role that already exists (same name) is left as it is.
 */
const ROLES = [
  ['Operations Manager', 'Users, cranes, bookings and complaints', ['dashboard', 'users', 'owners', 'operators', 'cranes', 'crane-approvals', 'bookings', 'crane-requests', 'complaints', 'reviews', 'reports']],
  ['Finance', 'Payments, settlements and subscriptions', ['dashboard', 'payments', 'settlements', 'subscriptions', 'reports']],
  ['Support Agent', 'Help requests, complaints and announcements', ['dashboard', 'support', 'complaints', 'announcements', 'notifications', 'reviews']],
  ['Content Manager', 'Banners, announcements and legal pages', ['banners', 'announcements', 'legal', 'notifications']]
];

module.exports = {
  up: async (queryInterface) => {
    for (const [name, description, permissions] of ROLES) {
      const [found] = await queryInterface.sequelize.query('SELECT id FROM admin_access_roles WHERE lower(name) = lower(:name)', { replacements: { name } });
      if (found.length) continue; // eslint-disable-line no-continue
      await queryInterface.bulkInsert('admin_access_roles', [{
        name, description, permissions: JSON.stringify(permissions), is_active: true, created_at: new Date(), updated_at: new Date()
      }]);
    }
  },
  down: async () => {}
};
