'use strict';

/**
 * Starting subscription plan for crane owners. Everything here is editable in the admin panel
 * (Subscriptions > Plans and prices), so this only sets the first values:
 *   - first month free (30 days)
 *   - monthly Rs 999, yearly Rs 9,999 (two months free compared with paying monthly)
 *   - GST 0% (raise it to 18 if Cranezo is GST registered and charges GST on the subscription)
 *   - 5 grace days after the due date, red warning 3 days before it
 * The online payment fee (Razorpay) is not set here: it is the same "online payment fee" % as for bookings.
 *
 * Safe to run again: a plan that an admin has already saved is left alone.
 */
const PLANS = { trial_days: 30, monthly_price: 999, yearly_price: 9999, gst_percent: 0, grace_days: 5, warn_days: 3 };
const KEY = 'subscription_plans';

module.exports = {
  up: async (queryInterface) => {
    const [rows] = await queryInterface.sequelize.query('SELECT updated_by FROM platform_settings WHERE key = :key', { replacements: { key: KEY } });
    if (rows.length && rows[0].updated_by) {
      console.log('[Seeder] subscription_plans was saved by an admin: left as it is.');
      return;
    }
    const value = JSON.stringify(PLANS);
    const description = 'Owner subscription: free trial days, monthly and yearly price, GST %, grace days after the due date, days before the due date when the red warning shows';
    if (rows.length) {
      await queryInterface.sequelize.query('UPDATE platform_settings SET value = :value::jsonb, description = :description, updated_at = NOW() WHERE key = :key', { replacements: { key: KEY, value, description } });
    } else {
      await queryInterface.bulkInsert('platform_settings', [{ key: KEY, value, description, created_at: new Date(), updated_at: new Date() }]);
    }
    console.log('[Seeder] subscription_plans set:', value);
  },

  down: async () => {
    // the plan row belongs to the migration; nothing to undo here
  }
};
