'use strict';

// "Breakdown Type" dropdown (type 15) on the operator Report Crane Breakdown screen. Editable in Admin > Settings.
const BREAKDOWN_TYPES = [
  'Engine failure',
  'Hydraulic system failure',
  'Boom or arm problem',
  'Outrigger problem',
  'Tyre or wheel problem',
  'Electrical problem',
  'Other'
];

module.exports = {
  up: async (queryInterface) => {
    const [existing] = await queryInterface.sequelize.query(
      'SELECT dropdown_name FROM static_dropdowns WHERE dropdown_type = 15;'
    );
    const have = new Set(existing.map((r) => r.dropdown_name));
    const now = new Date();
    const rows = BREAKDOWN_TYPES
      .filter((name) => !have.has(name))
      .map((name) => ({
        dropdown_name: name,
        dropdown_description: name,
        dropdown_type: 15,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      }));
    if (rows.length) await queryInterface.bulkInsert('static_dropdowns', rows, {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('static_dropdowns', { dropdown_type: 15 }, {});
  }
};
