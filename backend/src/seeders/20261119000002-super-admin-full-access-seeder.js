'use strict';
const bcrypt = require('bcryptjs');

/**
 * The default Super Admin login superadmin@cranezo.com with every admin panel page enabled.
 *   - the account role is SUPER_ADMIN (id 4), which always opens every page and every setting
 *   - it is also given the access role "Full Access" (all pages ticked), so the Admins & Roles page shows it
 * The password is SUPER_ADMIN_PASSWORD from .env (default Admin@12345): change it after the first sign-in.
 * Safe to run again: an existing account keeps its password; its role and access are put back to full.
 */
const EMAIL = 'superadmin@cranezo.com';
const ALL_MODULES = [
  'dashboard', 'users', 'owners', 'operators', 'cranes', 'crane-approvals', 'bookings', 'crane-requests', 'payments',
  'settlements', 'complaints', 'reviews', 'reports', 'notifications', 'banners', 'support', 'announcements', 'legal',
  'platform-fee', 'pricing-rules', 'subscriptions', 'app-versions', 'settings'
];

module.exports = {
  up: async (queryInterface) => {
    const q = queryInterface.sequelize;
    // the access role with every page ticked
    let [roles] = await q.query("SELECT id FROM admin_access_roles WHERE lower(name) = 'full access'");
    if (!roles.length) {
      await queryInterface.bulkInsert('admin_access_roles', [{
        name: 'Full Access', description: 'Every page of the admin panel', permissions: JSON.stringify(ALL_MODULES),
        is_active: true, created_at: new Date(), updated_at: new Date()
      }]);
      [roles] = await q.query("SELECT id FROM admin_access_roles WHERE lower(name) = 'full access'");
    } else {
      await q.query('UPDATE admin_access_roles SET permissions = :p::jsonb, is_active = true, updated_at = NOW() WHERE id = :id', { replacements: { p: JSON.stringify(ALL_MODULES), id: roles[0].id } });
    }
    const roleId = roles[0].id;

    const [found] = await q.query('SELECT id FROM admins WHERE lower(email) = :email', { replacements: { email: EMAIL } });
    if (found.length) {
      await q.query('UPDATE admins SET role_id = 4, access_role_id = :roleId, is_active = true, updated_at = NOW() WHERE id = :id', { replacements: { roleId, id: found[0].id } });
      console.log(`[Seeder] ${EMAIL} already exists: set to Super Admin with Full Access (password unchanged).`);
      return;
    }
    const hash = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || 'Admin@12345', await bcrypt.genSalt(10));
    await queryInterface.bulkInsert('admins', [{
      id: require("crypto").randomUUID(), name: 'Super Admin', email: EMAIL, password: hash,
      role_id: 4, access_role_id: roleId, is_active: true, created_at: new Date(), updated_at: new Date()
    }]);
    console.log(`[Seeder] ${EMAIL} created as Super Admin with Full Access.`);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('admins', { email: EMAIL });
  }
};
