'use strict';

/**
 * - gateway_fee_percent: online payment fee (Razorpay, ~2%) the customer pays on top, fixed per booking
 * - payment_reminder_at: "need more time to pay?" reminder sent 2 minutes before the advance is due
 * - payment_extended_at: the one 5-minute extension the customer can take
 * - crane_requests.cancel_reason: why the customer cancelled a request (one of 4 reasons)
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('bookings', 'gateway_fee_percent', { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('bookings', 'payment_reminder_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('bookings', 'payment_extended_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('crane_requests', 'cancel_reason', { type: Sequelize.STRING(200), allowNull: true });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('crane_requests', 'cancel_reason');
    await queryInterface.removeColumn('bookings', 'payment_extended_at');
    await queryInterface.removeColumn('bookings', 'payment_reminder_at');
    await queryInterface.removeColumn('bookings', 'gateway_fee_percent');
  }
};
