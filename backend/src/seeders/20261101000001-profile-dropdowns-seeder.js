'use strict';

// Dropdowns used by the operator and customer profile screens.
// Operator "Years of Experience" reuses type 3 from the business onboarding seeder.
const PROFILE_DROPDOWNS = {
  10: ['Individual Operator', 'Owner Based'],
  11: ['Individual User', 'Business User'],
  12: ['Proprietorship', 'Partnership', 'Private Limited Company', 'Public Limited Company', 'LLP', 'Government / PSU', 'Other'],
  13: ['Construction', 'Infrastructure', 'Real Estate', 'Manufacturing', 'Mining', 'Oil & Gas', 'Power & Energy', 'Logistics & Transport', 'Other'],
  14: [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ]
};

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    // Idempotent: insert only values missing for each type
    for (const [type, names] of Object.entries(PROFILE_DROPDOWNS)) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT dropdown_name FROM static_dropdowns WHERE dropdown_type = ${type};`
      );
      const have = new Set(existing.map((r) => r.dropdown_name));
      const rows = names
        .filter((name) => !have.has(name))
        .map((name) => ({
          dropdown_name: name,
          dropdown_description: name,
          dropdown_type: Number(type),
          dropdown_type_status: 0,
          created_at: now,
          updated_at: now
        }));
      if (rows.length) {
        await queryInterface.bulkInsert('static_dropdowns', rows, {});
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete(
      'static_dropdowns',
      { dropdown_type: { [Sequelize.Op.in]: [10, 11, 12, 13, 14] } },
      {}
    );
  }
};
