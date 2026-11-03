'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // approved extra time is added to the booking
    await queryInterface.addColumn('bookings', 'extra_minutes', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('bookings', 'extra_amount', { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 });
    // final payment (Cash on Delivery for now)
    await queryInterface.addColumn('bookings', 'payment_reference', { type: Sequelize.STRING(40), allowNull: true });
    await queryInterface.addColumn('bookings', 'paid_at', { type: Sequelize.DATE, allowNull: true });

    // star rating shown on cranes, operators and providers (average of booking_ratings)
    await queryInterface.addColumn('cranes', 'rating_average', { type: Sequelize.DECIMAL(3, 2), allowNull: true });
    await queryInterface.addColumn('cranes', 'rating_count', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('users', 'rating_average', { type: Sequelize.DECIMAL(3, 2), allowNull: true });
    await queryInterface.addColumn('users', 'rating_count', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });

    // Request Extra Time (the customer asks, the operator answers)
    await queryInterface.createTable('booking_extensions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      extension_code: { type: Sequelize.STRING(30), allowNull: false, comment: 'e.g. EXT-08421-1HR' },
      booking_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      requested_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      minutes: { type: Sequelize.INTEGER, allowNull: false },
      hourly_rate: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, comment: '0 pending, 1 approved, 2 rejected, 3 cancelled, 4 expired' },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      responded_at: { type: Sequelize.DATE, allowNull: true },
      reject_reason: { type: Sequelize.TEXT, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('booking_extensions', ['booking_id', 'status']);

    // Rate Your Experience: one rating per completed booking
    await queryInterface.createTable('booking_ratings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      booking_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'bookings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      customer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      crane_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'cranes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      operator_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      rating: { type: Sequelize.INTEGER, allowNull: false, comment: '1 to 5' },
      comment: { type: Sequelize.TEXT, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('booking_ratings', ['crane_id']);
    await queryInterface.addIndex('booking_ratings', ['operator_id']);
    await queryInterface.addIndex('booking_ratings', ['owner_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('booking_ratings');
    await queryInterface.dropTable('booking_extensions');
    await queryInterface.removeColumn('users', 'rating_count');
    await queryInterface.removeColumn('users', 'rating_average');
    await queryInterface.removeColumn('cranes', 'rating_count');
    await queryInterface.removeColumn('cranes', 'rating_average');
    await queryInterface.removeColumn('bookings', 'paid_at');
    await queryInterface.removeColumn('bookings', 'payment_reference');
    await queryInterface.removeColumn('bookings', 'extra_amount');
    await queryInterface.removeColumn('bookings', 'extra_minutes');
  }
};
