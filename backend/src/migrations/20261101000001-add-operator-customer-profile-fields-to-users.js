'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const dropdown = (comment) => ({
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'static_dropdowns', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment
    });
    const add = (name, definition) => queryInterface.addColumn('users', name, definition);

    // Operator profile
    await add('operator_license_number', { type: Sequelize.STRING(50), allowNull: true });
    await add('license_expiry_date', { type: Sequelize.DATEONLY, allowNull: true });
    await add('operator_type', dropdown('Static dropdown ID (type 10): Individual Operator / Owner Based'));
    await add('operator_license_front', { type: Sequelize.STRING(255), allowNull: true });
    await add('operator_license_back', { type: Sequelize.STRING(255), allowNull: true });
    await add('aadhar_card_file', { type: Sequelize.STRING(255), allowNull: true });
    await add('pan_card_file', { type: Sequelize.STRING(255), allowNull: true });
    await add('other_document_file', { type: Sequelize.STRING(255), allowNull: true });

    // Customer profile
    await add('customer_type', dropdown('Static dropdown ID (type 11): Individual User / Business User'));
    await add('constitution', dropdown('Static dropdown ID (type 12)'));
    await add('nature_of_business', dropdown('Static dropdown ID (type 13)'));
    await add('state_id', dropdown('Static dropdown ID (type 14) for state'));
    await add('gst_number', { type: Sequelize.STRING(20), allowNull: true });
    await add('aadhar_number', { type: Sequelize.STRING(20), allowNull: true });
    await add('pan_number', { type: Sequelize.STRING(15), allowNull: true });
    await add('directors_details', { type: Sequelize.TEXT, allowNull: true });
    await add('finance_head_details', { type: Sequelize.TEXT, allowNull: true });
    await add('branch_offices_details', { type: Sequelize.TEXT, allowNull: true });

    await queryInterface.addIndex('users', ['operator_license_number']);
  },

  down: async (queryInterface) => {
    const columns = [
      'operator_license_number', 'license_expiry_date', 'operator_type', 'operator_license_front',
      'operator_license_back', 'aadhar_card_file', 'pan_card_file', 'other_document_file',
      'customer_type', 'constitution', 'nature_of_business', 'state_id', 'gst_number',
      'aadhar_number', 'pan_number', 'directors_details', 'finance_head_details', 'branch_offices_details'
    ];
    for (const column of columns) {
      await queryInterface.removeColumn('users', column);
    }
  }
};
