'use strict';

/** Booking for someone else: the person at the site the operator should call */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const table of ['crane_requests', 'bookings']) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.addColumn(table, 'contact_name', { type: Sequelize.STRING(100), allowNull: true });
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.addColumn(table, 'contact_phone', { type: Sequelize.STRING(20), allowNull: true });
    }
  },

  down: async (queryInterface) => {
    for (const table of ['crane_requests', 'bookings']) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.removeColumn(table, 'contact_phone');
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.removeColumn(table, 'contact_name');
    }
  }
};
