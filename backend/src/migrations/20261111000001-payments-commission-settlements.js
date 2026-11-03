'use strict';

/**
 * Payments, commission, settlements, operator job requests and complaints.
 *
 * Money model (see services/billing.js):
 *   subtotal      = crane hire + approved extra time
 *   charges       = owner's additional charges (fixed or % of subtotal)
 *   gst           = owner's GST % of (subtotal + charges)
 *   total         = subtotal + charges + gst            -> what the customer pays
 *   platform fee  = Super Admin's % of (subtotal + charges), never of GST
 *   owner receives total - platform fee, and pays the operator commission out of it
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') };
    const money = (extra = {}) => ({ type: Sequelize.DECIMAL(12, 2), allowNull: true, ...extra });
    const userRef = (allowNull = true, onDelete = 'SET NULL') => ({
      type: Sequelize.UUID, allowNull, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete
    });
    const bookingRef = (allowNull = true, onDelete = 'SET NULL') => ({
      type: Sequelize.UUID, allowNull, references: { model: 'bookings', key: 'id' }, onUpdate: 'CASCADE', onDelete
    });

    // ---------------------------------------------------------------- Super Admin settings
    await queryInterface.createTable('platform_settings', {
      key: { type: Sequelize.STRING(60), primaryKey: true, allowNull: false },
      value: { type: Sequelize.JSONB, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      updated_by: { type: Sequelize.STRING(60), allowNull: true },
      created_at: now,
      updated_at: now
    });
    await queryInterface.bulkInsert('platform_settings', [{
      key: 'platform_fee_percent',
      value: JSON.stringify(5),
      description: 'Platform fee taken from every completed job, as a % of the amount before GST',
      created_at: new Date(),
      updated_at: new Date()
    }]);

    // ---------------------------------------------------------------- owner GST, charges, default commission
    await queryInterface.createTable('owner_billing_settings', {
      owner_id: { ...userRef(false, 'CASCADE'), primaryKey: true },
      gst_percent: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      gst_number: { type: Sequelize.STRING(20), allowNull: true },
      charges: { type: Sequelize.JSONB, allowNull: false, defaultValue: [], comment: '[{ name, type: fixed|percent, value }]' },
      default_commission_type: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'percent', comment: 'percent | per_km | fixed' },
      default_commission_value: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      created_at: now,
      updated_at: now
    });

    // ---------------------------------------------------------------- ledger
    await queryInterface.createTable('payment_transactions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      transaction_code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      booking_id: bookingRef(false, 'CASCADE'),
      customer_id: userRef(),
      owner_id: userRef(),
      amount: money({ allowNull: false }),
      method: { type: Sequelize.STRING(20), allowNull: false },
      status: { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'initiated', comment: 'initiated | success | failed | refunded' },
      collected_by: { type: Sequelize.STRING(10), allowNull: false, comment: 'owner (cash on site) | platform (gateway)' },
      gateway: { type: Sequelize.STRING(30), allowNull: true },
      gateway_order_id: { type: Sequelize.STRING(80), allowNull: true },
      gateway_payment_id: { type: Sequelize.STRING(80), allowNull: true },
      failure_reason: { type: Sequelize.TEXT, allowNull: true },
      meta: { type: Sequelize.JSONB, allowNull: true },
      created_at: now,
      updated_at: now
    });
    await queryInterface.addIndex('payment_transactions', ['booking_id']);
    await queryInterface.addIndex('payment_transactions', ['owner_id', 'created_at']);
    await queryInterface.addIndex('payment_transactions', ['customer_id', 'created_at']);

    await queryInterface.createTable('settlements', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      settlement_code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      kind: { type: Sequelize.STRING(20), allowNull: false, comment: 'platform_owner | owner_operator' },
      direction: { type: Sequelize.STRING(24), allowNull: false, comment: 'owner_to_platform | platform_to_owner | owner_to_operator' },
      owner_id: userRef(false, 'CASCADE'),
      operator_id: userRef(),
      amount: money({ allowNull: false }),
      jobs_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      method: { type: Sequelize.STRING(20), allowNull: true, comment: 'cash | bank_transfer | upi | other' },
      reference: { type: Sequelize.STRING(80), allowNull: true },
      note: { type: Sequelize.TEXT, allowNull: true },
      settled_at: { type: Sequelize.DATE, allowNull: false },
      created_by_type: { type: Sequelize.STRING(10), allowNull: false, comment: 'admin | owner' },
      created_by: { type: Sequelize.STRING(60), allowNull: true },
      created_at: now,
      updated_at: now
    });
    await queryInterface.addIndex('settlements', ['kind', 'owner_id', 'settled_at']);
    await queryInterface.addIndex('settlements', ['operator_id', 'settled_at']);

    // ---------------------------------------------------------------- booking bill and commission columns
    const add = (column, spec) => queryInterface.addColumn('bookings', column, spec);
    await queryInterface.changeColumn('bookings', 'platform_fee_percent', { type: Sequelize.DECIMAL(5, 2), allowNull: true });
    await add('charges', { type: Sequelize.JSONB, allowNull: true, comment: 'owner charges copied when the booking was made' });
    await add('charges_amount', money({ allowNull: false, defaultValue: 0 }));
    await add('gst_percent', { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 });
    await add('gst_amount', money({ allowNull: false, defaultValue: 0 }));
    await add('subtotal_amount', money());
    await add('owner_share_amount', money({ comment: 'what the owner keeps: total - platform fee - operator commission - gst' }));
    await add('operator_commission_type', { type: Sequelize.STRING(10), allowNull: true });
    await add('operator_commission_value', money());
    await add('operator_commission_amount', money());
    await add('operator_settlement_status', { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'pending' });
    await add('operator_settled_at', { type: Sequelize.DATE, allowNull: true });
    await add('operator_settlement_id', { type: Sequelize.UUID, allowNull: true, references: { model: 'settlements', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' });
    await add('settlement_id', { type: Sequelize.UUID, allowNull: true, references: { model: 'settlements', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' });
    await add('payment_collected_by', { type: Sequelize.STRING(10), allowNull: true });

    // ---------------------------------------------------------------- operators asking for open jobs
    await queryInterface.createTable('job_requests', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      booking_id: bookingRef(false, 'CASCADE'),
      operator_id: userRef(false, 'CASCADE'),
      owner_id: userRef(false, 'CASCADE'),
      message: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, comment: '0 pending, 1 accepted, 2 rejected, 3 withdrawn, 4 closed' },
      reject_reason: { type: Sequelize.TEXT, allowNull: true },
      responded_at: { type: Sequelize.DATE, allowNull: true },
      created_at: now,
      updated_at: now
    });
    await queryInterface.addIndex('job_requests', ['booking_id', 'operator_id'], { unique: true });
    await queryInterface.addIndex('job_requests', ['owner_id', 'status']);

    // ---------------------------------------------------------------- complaints and payment disputes
    await queryInterface.createTable('complaints', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      complaint_code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      booking_id: bookingRef(),
      customer_id: userRef(false, 'CASCADE'),
      owner_id: userRef(),
      category: { type: Sequelize.STRING(30), allowNull: false },
      subject: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      attachments: { type: Sequelize.JSONB, allowNull: true },
      status: { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'open', comment: 'open | in_review | resolved | rejected' },
      resolution_note: { type: Sequelize.TEXT, allowNull: true },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      resolved_by_type: { type: Sequelize.STRING(10), allowNull: true },
      created_at: now,
      updated_at: now
    });
    await queryInterface.addIndex('complaints', ['customer_id', 'created_at']);
    await queryInterface.addIndex('complaints', ['owner_id', 'status']);
    await queryInterface.addIndex('complaints', ['status', 'created_at']);

    await queryInterface.createTable('complaint_updates', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      complaint_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'complaints', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      author_type: { type: Sequelize.STRING(10), allowNull: false, comment: 'customer | owner | admin' },
      author_id: { type: Sequelize.STRING(60), allowNull: true },
      author_name: { type: Sequelize.STRING(150), allowNull: true },
      message: { type: Sequelize.TEXT, allowNull: true },
      status_from: { type: Sequelize.STRING(12), allowNull: true },
      status_to: { type: Sequelize.STRING(12), allowNull: true },
      created_at: now,
      updated_at: now
    });
    await queryInterface.addIndex('complaint_updates', ['complaint_id', 'id']);

    // existing paid bookings get a ledger row so the history is complete
    await queryInterface.sequelize.query(`
      INSERT INTO payment_transactions (id, transaction_code, booking_id, customer_id, owner_id, amount, method, status, collected_by, created_at, updated_at)
      SELECT gen_random_uuid(), COALESCE(payment_reference, 'pay_' || substr(id::text, 1, 8)), id, customer_id, owner_id,
             COALESCE(paid_amount, final_amount, total_amount), payment_method, 'success',
             CASE WHEN payment_method = 'COD' THEN 'owner' ELSE 'platform' END, COALESCE(paid_at, updated_at), COALESCE(paid_at, updated_at)
      FROM bookings WHERE payment_status = 'paid'
      ON CONFLICT (transaction_code) DO NOTHING
    `);
    await queryInterface.sequelize.query(`
      UPDATE bookings SET payment_collected_by = CASE WHEN payment_method = 'COD' THEN 'owner' ELSE 'platform' END
      WHERE payment_status = 'paid'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('complaint_updates');
    await queryInterface.dropTable('complaints');
    await queryInterface.dropTable('job_requests');
    for (const column of [
      'payment_collected_by', 'settlement_id', 'operator_settlement_id', 'operator_settled_at', 'operator_settlement_status',
      'operator_commission_amount', 'operator_commission_value', 'operator_commission_type', 'owner_share_amount',
      'subtotal_amount', 'gst_amount', 'gst_percent', 'charges_amount', 'charges'
    ]) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.removeColumn('bookings', column);
    }
    await queryInterface.changeColumn('bookings', 'platform_fee_percent', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.dropTable('settlements');
    await queryInterface.dropTable('payment_transactions');
    await queryInterface.dropTable('owner_billing_settings');
    await queryInterface.dropTable('platform_settings');
  }
};
