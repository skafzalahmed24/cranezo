'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('static_dropdowns', [
      {
        dropdown_name: 'English',
        dropdown_description: 'Continue in English',
        dropdown_type: 1,
        dropdown_type_status: 0,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        dropdown_name: 'తెలుగు',
        dropdown_description: 'తెలుగులో కొనసాగించండి',
        dropdown_type: 1,
        dropdown_type_status: 0,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        dropdown_name: 'हिन्दी',
        dropdown_description: 'हिंदी में जारी रखें',
        dropdown_type: 1,
        dropdown_type_status: 0,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('static_dropdowns', { dropdown_type: 1 }, {});
  }
};
