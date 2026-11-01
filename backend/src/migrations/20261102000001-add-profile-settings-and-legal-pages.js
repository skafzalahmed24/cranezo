'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verification state of uploaded documents / ids: 0 pending, 1 verified, 2 rejected
    const status = (comment) => ({ type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, comment });
    await queryInterface.addColumn('users', 'operator_license_status', status('0 pending, 1 verified, 2 rejected'));
    await queryInterface.addColumn('users', 'aadhar_status', status('0 pending, 1 verified, 2 rejected'));
    await queryInterface.addColumn('users', 'pan_status', status('0 pending, 1 verified, 2 rejected'));
    await queryInterface.addColumn('users', 'other_document_status', status('0 pending, 1 verified, 2 rejected'));

    // { booking_confirmations: true, offers_promotions: false, ... }; missing keys use the app defaults
    await queryInterface.addColumn('users', 'notification_preferences', {
      type: Sequelize.JSONB,
      allowNull: true
    });

    // Terms & Conditions and Privacy Policy shown in the apps
    await queryInterface.createTable('legal_pages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      page_type: { type: Sequelize.STRING(30), allowNull: false, unique: true, comment: 'terms or privacy' },
      title: { type: Sequelize.STRING(150), allowNull: false },
      intro: { type: Sequelize.TEXT, allowNull: true },
      last_updated: { type: Sequelize.DATEONLY, allowNull: false },
      sections: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      is_active: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, comment: '0 active, 1 inactive' },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('legal_pages');
    for (const column of ['notification_preferences', 'other_document_status', 'pan_status', 'aadhar_status', 'operator_license_status']) {
      await queryInterface.removeColumn('users', column);
    }
  }
};
