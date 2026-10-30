'use strict';


module.exports = {
  up: async (queryInterface, Sequelize) => {
    const ref = (comment, allowNull = true) => ({
      type: Sequelize.INTEGER,
      allowNull,
      references: { model: 'static_dropdowns', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: allowNull ? 'SET NULL' : 'RESTRICT',
      comment
    });

    await queryInterface.createTable('cranes', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      crane_code: { type: Sequelize.STRING(20), allowNull: false, unique: true, comment: 'Display id e.g. CRN001' },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      crane_type: ref('Static dropdown ID (type 6) - Crane Type', false),
      capacity: ref('Static dropdown ID (type 7) - Capacity', false),
      fuel_type: ref('Static dropdown ID (type 8) - Fuel Type'),
      model_name: { type: Sequelize.STRING(150), allowNull: true },
      registration_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      location: { type: Sequelize.STRING(255), allowNull: false },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      hourly_rate: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      minimum_hours: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 4 },
      operator_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      availability_status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '0 available, 1 not available'
      },
      approval_status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '0 under review, 1 verified, 2 rejected'
      },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      submitted_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      reviewed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'admins', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      is_active: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, comment: '0 active, 1 deactive' },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addIndex('cranes', ['owner_id']);
    await queryInterface.addIndex('cranes', ['approval_status']);
    await queryInterface.addIndex('cranes', ['crane_type']);
    await queryInterface.addIndex('cranes', ['operator_id']);

    await queryInterface.createTable('crane_photos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      crane_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'cranes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      photo_url: { type: Sequelize.STRING(255), allowNull: false },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('crane_photos', ['crane_id']);

    await queryInterface.createTable('crane_documents', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      crane_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'cranes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      document_type: ref('Static dropdown ID (type 9) - Document Type', false),
      file_url: { type: Sequelize.STRING(255), allowNull: false },
      expiry_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('crane_documents', ['crane_id']);
    await queryInterface.addIndex('crane_documents', ['crane_id', 'document_type'], { unique: true });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('crane_documents');
    await queryInterface.dropTable('crane_photos');
    await queryInterface.dropTable('cranes');
  }
};
