'use strict';

/**
 * Operators in an owner's team:
 *  - how the owner pays them: salary_type = monthly | daily | per_job, with a monthly salary, a daily wage and a daily allowance (batta)
 *  - operator_invites: an owner asks a registered operator to join the team; the operator accepts or declines
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'salary_type', { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'monthly' });
    await queryInterface.addColumn('users', 'daily_wage', { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('users', 'batta', { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 });

    await queryInterface.createTable('operator_invites', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      owner_id: { type: Sequelize.UUID, allowNull: false },
      operator_id: { type: Sequelize.UUID, allowNull: false },
      salary_type: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'monthly' },
      monthly_salary: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      daily_wage: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      batta: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      message: { type: Sequelize.STRING(300), allowNull: true },
      // 0 waiting, 1 accepted, 2 declined, 3 cancelled by the owner, 4 expired (the operator joined someone else)
      status: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      responded_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('operator_invites', ['operator_id', 'status']);
    await queryInterface.addIndex('operator_invites', ['owner_id', 'status']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('operator_invites');
    await queryInterface.removeColumn('users', 'batta');
    await queryInterface.removeColumn('users', 'daily_wage');
    await queryInterface.removeColumn('users', 'salary_type');
  }
};
