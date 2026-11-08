'use strict';

/**
 * Admin panel access roles: a role is a named set of side-menu modules (Finance, Support Agent, ...).
 * A staff login (an admins row) points at one access role; the Super Admin has everything and needs none.
 * Staff accounts use the roles row "ADMIN" (id 5); it is not shown in the app's role list.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') };
    await queryInterface.createTable('admin_access_roles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      description: { type: Sequelize.STRING(200), allowNull: true },
      permissions: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: now,
      updated_at: now
    });
    await queryInterface.addColumn('admins', 'access_role_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'admin_access_roles', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('admins', 'created_by', { type: Sequelize.UUID, allowNull: true });

    // the account role that staff logins use (the Super Admin keeps SUPER_ADMIN, id 4)
    const [existing] = await queryInterface.sequelize.query('SELECT id FROM roles WHERE id = 5');
    if (!existing.length) {
      await queryInterface.bulkInsert('roles', [{
        id: 5, name: 'Admin Staff', code: 'ADMIN', description: 'Admin panel staff with limited access',
        image: null, is_active: true, created_at: new Date(), updated_at: new Date()
      }]);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('admins', 'created_by');
    await queryInterface.removeColumn('admins', 'access_role_id');
    await queryInterface.dropTable('admin_access_roles');
    await queryInterface.sequelize.query("DELETE FROM roles WHERE id = 5 AND code = 'ADMIN'");
  }
};
