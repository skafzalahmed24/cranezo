'use strict';

/**
 * Tips: the customer can tip the operator after the job (paid online with Razorpay, kind "tip").
 * bookings.tip_amount holds the total tip of the job; it goes to the operator in full (no platform fee).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('bookings', 'tip_amount', { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('bookings', 'tip_amount');
  }
};
