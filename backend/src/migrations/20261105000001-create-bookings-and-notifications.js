'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ---- crane additions: description, live position (for tracking), coordinate index ----
    await queryInterface.addColumn('cranes', 'description', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('cranes', 'current_latitude', { type: Sequelize.DECIMAL(10, 7), allowNull: true });
    await queryInterface.addColumn('cranes', 'current_longitude', { type: Sequelize.DECIMAL(10, 7), allowNull: true });
    await queryInterface.addColumn('cranes', 'location_updated_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addIndex('cranes', ['latitude', 'longitude']);

    // crane type images shown on the Book a Crane screen (admin sets them in Settings)
    await queryInterface.addColumn('static_dropdowns', 'image', { type: Sequelize.STRING(255), allowNull: true });

    // push notification target of the user's phone
    await queryInterface.addColumn('users', 'push_token', { type: Sequelize.STRING(512), allowNull: true });
    await queryInterface.addColumn('users', 'push_platform', { type: Sequelize.STRING(20), allowNull: true });

    // ---- bookings ----
    const money = (allowNull = false) => ({ type: Sequelize.DECIMAL(12, 2), allowNull, defaultValue: allowNull ? null : 0 });
    const userRef = (allowNull) => ({
      type: Sequelize.UUID,
      allowNull,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: allowNull ? 'SET NULL' : 'RESTRICT'
    });
    const dropdownRef = {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'static_dropdowns', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    };

    await queryInterface.createTable('bookings', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      booking_code: { type: Sequelize.STRING(30), allowNull: false, unique: true, comment: 'e.g. CRZ-260905-08421' },
      customer_id: userRef(false),
      crane_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'cranes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      owner_id: userRef(false),
      operator_id: userRef(true),
      crane_type: dropdownRef,
      capacity: dropdownRef,

      site_name: { type: Sequelize.STRING(150), allowNull: true },
      site_address: { type: Sequelize.TEXT, allowNull: false },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      distance_km: { type: Sequelize.DECIMAL(8, 2), allowNull: true, comment: 'crane to site when requested' },

      start_type: { type: Sequelize.STRING(12), allowNull: false, comment: 'now or scheduled' },
      start_at: { type: Sequelize.DATE, allowNull: false },
      end_at: { type: Sequelize.DATE, allowNull: false },
      duration_type: { type: Sequelize.STRING(12), allowNull: false, comment: 'hours, full_day or days' },
      duration_hours: { type: Sequelize.INTEGER, allowNull: false },
      duration_days: { type: Sequelize.INTEGER, allowNull: true },

      hourly_rate: money(),
      crane_rental: money(),
      operator_charges: money(),
      fuel_charges: money(),
      other_charges: money(),
      total_amount: money(),
      advance_percent: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 20 },
      advance_amount: money(),
      remaining_amount: money(),

      payment_method: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'COD' },
      payment_status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending', comment: 'pending, advance_paid, paid, refunded' },
      paid_amount: money(),

      status: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, comment: '0 awaiting owner, 1 confirmed, 2 declined, 3 expired, 4 cancelled, 5 en route, 6 in progress, 7 completed' },
      request_expires_at: { type: Sequelize.DATE, allowNull: true },
      accepted_at: { type: Sequelize.DATE, allowNull: true },
      declined_at: { type: Sequelize.DATE, allowNull: true },
      decline_reason: { type: Sequelize.TEXT, allowNull: true },
      expired_at: { type: Sequelize.DATE, allowNull: true },
      cancelled_at: { type: Sequelize.DATE, allowNull: true },
      cancelled_by: { type: Sequelize.STRING(12), allowNull: true, comment: 'customer, owner or system' },
      cancel_reason: { type: Sequelize.TEXT, allowNull: true },

      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('bookings', ['customer_id']);
    await queryInterface.addIndex('bookings', ['owner_id']);
    await queryInterface.addIndex('bookings', ['operator_id']);
    await queryInterface.addIndex('bookings', ['status']);
    await queryInterface.addIndex('bookings', ['crane_id', 'start_at', 'end_at']);

    // ---- in-app notifications (the "buzzer" feed; push is sent on top of this) ----
    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      user_id: userRef(false),
      type: { type: Sequelize.STRING(40), allowNull: false },
      title: { type: Sequelize.STRING(150), allowNull: false },
      body: { type: Sequelize.TEXT, allowNull: true },
      data: { type: Sequelize.JSONB, allowNull: true },
      is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('notifications', ['user_id', 'is_read', 'created_at']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('bookings');
    await queryInterface.removeColumn('users', 'push_platform');
    await queryInterface.removeColumn('users', 'push_token');
    await queryInterface.removeColumn('static_dropdowns', 'image');
    await queryInterface.removeColumn('cranes', 'location_updated_at');
    await queryInterface.removeColumn('cranes', 'current_longitude');
    await queryInterface.removeColumn('cranes', 'current_latitude');
    await queryInterface.removeColumn('cranes', 'description');
  }
};
