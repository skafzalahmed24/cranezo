'use strict';

/**
 * Crane owner subscriptions.
 *   owner_subscriptions  one row per owner: the plan, when it started and when it is due
 *   subscription_payments  every Razorpay payment for a subscription (the amount includes the online payment fee)
 * Prices, trial days and grace days are Super Admin settings (platform_settings, key subscription_plans).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') };
    const money = (extra = {}) => ({ type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0, ...extra });
    const owner = (extra = {}) => ({
      type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE', ...extra
    });

    await queryInterface.createTable('owner_subscriptions', {
      owner_id: owner({ primaryKey: true }),
      // trial, monthly or yearly: the plan of the period that is running now
      plan: { type: Sequelize.STRING(10), allowNull: false },
      started_at: { type: Sequelize.DATE, allowNull: false },
      period_start: { type: Sequelize.DATE, allowNull: false },
      due_at: { type: Sequelize.DATE, allowNull: false },
      last_paid_at: { type: Sequelize.DATE, allowNull: true },
      reminded_at: { type: Sequelize.DATE, allowNull: true },
      created_at: now,
      updated_at: now
    });
    await queryInterface.addIndex('owner_subscriptions', ['due_at']);

    await queryInterface.createTable('subscription_payments', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true, allowNull: false },
      payment_code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      owner_id: owner(),
      plan: { type: Sequelize.STRING(10), allowNull: false },
      base_amount: money(),
      gst_amount: money(),
      gateway_fee: money(),
      total_amount: money(),
      status: { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'initiated' },
      gateway_order_id: { type: Sequelize.STRING(80), allowNull: true },
      gateway_payment_id: { type: Sequelize.STRING(80), allowNull: true },
      period_start: { type: Sequelize.DATE, allowNull: true },
      period_end: { type: Sequelize.DATE, allowNull: true },
      failure_reason: { type: Sequelize.TEXT, allowNull: true },
      created_at: now,
      updated_at: now
    });
    await queryInterface.addIndex('subscription_payments', ['owner_id']);
    await queryInterface.addIndex('subscription_payments', ['gateway_order_id']);

    await queryInterface.bulkInsert('platform_settings', [{
      key: 'subscription_plans',
      value: JSON.stringify({ trial_days: 30, monthly_price: 999, yearly_price: 9999, gst_percent: 0, grace_days: 5, warn_days: 3 }),
      description: 'Owner subscription: free trial days, monthly and yearly price, GST %, grace days after the due date, days before the due date when the red warning shows',
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('subscription_payments');
    await queryInterface.dropTable('owner_subscriptions');
    await queryInterface.bulkDelete('platform_settings', { key: 'subscription_plans' });
  }
};
