'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // operator Go Online / Offline switch on the Home screen
    await queryInterface.addColumn('users', 'is_online', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn('users', 'online_updated_at', { type: Sequelize.DATE, allowNull: true });

    const add = (name, definition) => queryInterface.addColumn('bookings', name, definition);

    // what the customer wrote for the operator (Special Requirements on the job request)
    await add('special_requirements', { type: Sequelize.TEXT, allowNull: true });

    // operator answer to "New Job Request": 0 awaiting operator, 1 accepted, 2 declined
    await add('operator_status', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    await add('operator_responded_at', { type: Sequelize.DATE, allowNull: true });
    await add('operator_decline_reason', { type: Sequelize.TEXT, allowNull: true });

    // journey and arrival
    await add('en_route_at', { type: Sequelize.DATE, allowNull: true });
    await add('arrived_at', { type: Sequelize.DATE, allowNull: true });
    await add('arrival_confirmed_at', { type: Sequelize.DATE, allowNull: true });
    await add('arrival_confirmed_by', { type: Sequelize.STRING(10), allowNull: true, comment: 'customer or operator' });

    // safety checklist: { crane_positioned_safely: true, ... }
    await add('checklist', { type: Sequelize.JSONB, allowNull: true });
    await add('checklist_completed_at', { type: Sequelize.DATE, allowNull: true });

    // work timer
    await add('work_started_at', { type: Sequelize.DATE, allowNull: true });
    await add('work_ended_at', { type: Sequelize.DATE, allowNull: true });
    await add('waiting_seconds', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    await add('waiting_since', { type: Sequelize.DATE, allowNull: true, comment: 'set while a waiting period is open' });
    await add('working_seconds', { type: Sequelize.INTEGER, allowNull: true, comment: 'worked time excluding waiting, set when the job is finished' });
    await add('job_notes', { type: Sequelize.TEXT, allowNull: true });

    // completion with the customer OTP
    await add('completion_otp', { type: Sequelize.STRING(6), allowNull: true });
    await add('completion_otp_expires_at', { type: Sequelize.DATE, allowNull: true });
    await add('completion_otp_attempts', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    await add('completion_requested_at', { type: Sequelize.DATE, allowNull: true });
    await add('completed_at', { type: Sequelize.DATE, allowNull: true });

    // money after the job
    await add('final_amount', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    await add('settlement_status', { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'pending', comment: 'pending or settled' });
    await add('settled_at', { type: Sequelize.DATE, allowNull: true });

    await queryInterface.addIndex('bookings', ['operator_id', 'status']);

    // site photos (on arrival) and final photos (when the job ends), with the place they were taken
    await queryInterface.createTable('job_photos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      booking_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      uploaded_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      kind: { type: Sequelize.STRING(10), allowNull: false, comment: 'site or final' },
      photo_url: { type: Sequelize.STRING(255), allowNull: false },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      captured_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('job_photos', ['booking_id', 'kind']);

    // Report Crane Breakdown, Report Issue and the Emergency button
    await queryInterface.createTable('job_issues', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      booking_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      reported_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      kind: { type: Sequelize.STRING(12), allowNull: false, comment: 'breakdown, issue or emergency' },
      breakdown_type: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'static_dropdowns', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Static dropdown ID (type 15)'
      },
      description: { type: Sequelize.TEXT, allowNull: true },
      photos: { type: Sequelize.JSONB, allowNull: true },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      status: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'open', comment: 'open or resolved' },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('job_issues', ['booking_id']);
    await queryInterface.addIndex('job_issues', ['status', 'kind']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('job_issues');
    await queryInterface.dropTable('job_photos');
    const columns = [
      'settled_at', 'settlement_status', 'final_amount', 'completed_at', 'completion_requested_at',
      'completion_otp_attempts', 'completion_otp_expires_at', 'completion_otp', 'job_notes', 'working_seconds',
      'waiting_since', 'waiting_seconds', 'work_ended_at', 'work_started_at', 'checklist_completed_at', 'checklist',
      'arrival_confirmed_by', 'arrival_confirmed_at', 'arrived_at', 'en_route_at', 'operator_decline_reason',
      'operator_responded_at', 'operator_status', 'special_requirements'
    ];
    for (const column of columns) {
      await queryInterface.removeColumn('bookings', column);
    }
    await queryInterface.removeColumn('users', 'online_updated_at');
    await queryInterface.removeColumn('users', 'is_online');
  }
};
