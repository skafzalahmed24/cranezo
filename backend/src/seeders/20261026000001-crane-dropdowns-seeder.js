'use strict';

const CRANE_DROPDOWNS = {
  6: ['Mobile Crane', 'Rough Terrain Crane', 'Crawler Crane', 'Truck Mounted Crane', 'All Terrain Crane', 'Tower Crane', 'Pick & Carry Crane'],
  7: ['10 Ton', '20 Ton', '30 Ton', '50 Ton', '80 Ton', '100 Ton', '150 Ton', '200 Ton', '300 Ton'],
  8: ['Diesel', 'Petrol', 'Electric', 'Hybrid', 'CNG'],
  9: ['RC Copy', 'Insurance', 'Fitness Certificate']
};

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    // Idempotent: insert only values missing for each type
    for (const [type, names] of Object.entries(CRANE_DROPDOWNS)) {
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
      { dropdown_type: { [Sequelize.Op.in]: [6, 7, 8, 9] } },
      {}
    );
  }
};
