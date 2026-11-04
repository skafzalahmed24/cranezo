'use strict';

/**
 * Rapido-style booking: the customer sends one request (type, capacity, place, time, offer price),
 * every nearby owner with a matching free crane is notified, and the first owner to accept gets it.
 * The customer then pays the owner's advance within a time limit, or the booking is cancelled.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') };
    const money = (extra = {}) => ({ type: Sequelize.DECIMAL(12, 2), allowNull: true, ...extra });

    await queryInterface.createTable('crane_requests', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      request_code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      customer_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      crane_type: { type: Sequelize.INTEGER, allowNull: false },
      capacity: { type: Sequelize.INTEGER, allowNull: false },
      site_name: { type: Sequelize.STRING(150), allowNull: true },
      site_address: { type: Sequelize.TEXT, allowNull: false },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      start_type: { type: Sequelize.STRING(12), allowNull: false },
      start_at: { type: Sequelize.DATE, allowNull: false },
      end_at: { type: Sequelize.DATE, allowNull: false },
      duration_type: { type: Sequelize.STRING(12), allowNull: false },
      duration_hours: { type: Sequelize.INTEGER, allowNull: false },
      duration_days: { type: Sequelize.INTEGER, allowNull: true },
      special_requirements: { type: Sequelize.TEXT, allowNull: true },
      // crane hire the customer offers for the whole job (distance charge, owner charges and GST come on top)
      offer_amount: money({ allowNull: false }),
      first_offer_amount: money({ allowNull: false }),
      min_offer_amount: money({ allowNull: false }),
      estimate_min: money(),
      estimate_max: money(),
      auto_raise: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      auto_raise_max: money(),
      raise_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      last_raised_at: { type: Sequelize.DATE, allowNull: true },
      status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'searching', comment: 'searching | accepted | confirmed | expired | cancelled | payment_expired | not_found' },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      matched_cranes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      booking_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'bookings', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      accepted_at: { type: Sequelize.DATE, allowNull: true },
      closed_at: { type: Sequelize.DATE, allowNull: true },
      // "no crane found": sent to the admin team
      not_found_note: { type: Sequelize.TEXT, allowNull: true },
      admin_status: { type: Sequelize.STRING(12), allowNull: true, comment: 'new | contacted | closed' },
      admin_note: { type: Sequelize.TEXT, allowNull: true },
      created_at: now,
      updated_at: now
    });
    await queryInterface.addIndex('crane_requests', ['status', 'expires_at']);
    await queryInterface.addIndex('crane_requests', ['customer_id', 'created_at']);
    await queryInterface.addIndex('crane_requests', ['crane_type', 'capacity', 'status']);

    // admin minimum crane hire per hour for each crane type + capacity
    await queryInterface.createTable('price_minimums', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      crane_type: { type: Sequelize.INTEGER, allowNull: false },
      capacity: { type: Sequelize.INTEGER, allowNull: false },
      min_hourly_rate: money({ allowNull: false }),
      created_at: now,
      updated_at: now
    });
    await queryInterface.addIndex('price_minimums', ['crane_type', 'capacity'], { unique: true });

    // owner: own advance % and ₹ per km after the free distance
    await queryInterface.addColumn('owner_billing_settings', 'advance_percent', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 20 });
    await queryInterface.addColumn('owner_billing_settings', 'per_km_rate', money({ allowNull: false, defaultValue: 0 }));

    // booking made from a request
    await queryInterface.addColumn('bookings', 'crane_request_id', { type: Sequelize.UUID, allowNull: true });
    await queryInterface.addColumn('bookings', 'distance_charge', money({ allowNull: false, defaultValue: 0 }));
    await queryInterface.addColumn('bookings', 'payment_due_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('bookings', 'advance_paid_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('bookings', 'platform_collected_amount', money({ allowNull: false, defaultValue: 0, comment: 'money held by the platform for this job (online payments)' }));
    // earlier online payments were fully held by the platform
    await queryInterface.sequelize.query(`
      UPDATE bookings SET platform_collected_amount = COALESCE(paid_amount, 0)
      WHERE payment_status = 'paid' AND payment_collected_by = 'platform'
    `);

    await queryInterface.bulkInsert('platform_settings', [{
      key: 'booking_rules',
      value: JSON.stringify({
        search_radius_km: 20,
        free_km: 7,
        min_per_km_rate: 50,
        request_minutes: 15,
        raise_after_minutes: 2,
        raise_step_percent: 10,
        raise_min_step: 100,
        payment_window_minutes: 10
      }),
      description: 'Booking requests: search radius, free distance, minimum ₹/km, request time, price raise and payment time limit',
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('platform_settings', { key: 'booking_rules' });
    for (const c of ['platform_collected_amount', 'advance_paid_at', 'payment_due_at', 'distance_charge', 'crane_request_id']) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.removeColumn('bookings', c);
    }
    await queryInterface.removeColumn('owner_billing_settings', 'per_km_rate');
    await queryInterface.removeColumn('owner_billing_settings', 'advance_percent');
    await queryInterface.dropTable('price_minimums');
    await queryInterface.dropTable('crane_requests');
  }
};
