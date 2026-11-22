'use strict';

/**
 * Tips in settlements. The customer pays a tip online, so the platform holds it; all of it belongs to the operator.
 *  - bookings.tip_settled_amount: how much of the tip the platform has already paid out to the owner (for the operator)
 *  - bookings.operator_tip_paid_amount: how much of the tip the owner has already paid to the operator
 *  - settlements.tip_amount: the tip part of a payout (the amount of a platform payout already includes it)
 * A tip that arrives after a job was settled is still paid out later: only what is left unpaid is due.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const money = { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 };
    await queryInterface.addColumn('bookings', 'tip_settled_amount', money);
    await queryInterface.addColumn('bookings', 'operator_tip_paid_amount', money);
    await queryInterface.addColumn('settlements', 'tip_amount', money);
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('settlements', 'tip_amount');
    await queryInterface.removeColumn('bookings', 'operator_tip_paid_amount');
    await queryInterface.removeColumn('bookings', 'tip_settled_amount');
  }
};
