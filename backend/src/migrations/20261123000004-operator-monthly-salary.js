'use strict';

/**
 * Monthly wage: the owner sets a monthly salary on an operator. A job can then be given on "monthly salary"
 * (no per-job commission) and the owner pays the salary once a month. settlements.period_month = the month paid (YYYY-MM).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'monthly_salary', { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('settlements', 'period_month', { type: Sequelize.STRING(7), allowNull: true });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('settlements', 'period_month');
    await queryInterface.removeColumn('users', 'monthly_salary');
  }
};
