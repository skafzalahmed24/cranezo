'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const adminId = '00000000-0000-0000-0000-000000000001';
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM admins WHERE id = '${adminId}'`
    );

    if (!existing || existing.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || 'Admin@12345', salt);

      await queryInterface.bulkInsert('admins', [
        {
          id: adminId,
          name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
          email: (process.env.SUPER_ADMIN_EMAIL || 'superadmin@cranzo.com').toLowerCase(),
          password: hashedPassword,
          role_id: 4, // 4 for Super Admin
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ], {});
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('admins', { email: 'superadmin@cranzo.com' }, {});
  }
};
