'use strict';

/**
 * Pictures for the crane types (Book a Crane, step 1). The PNGs ship with the backend in
 * src/public/crane-types. Only types without a picture get one, so an image the admin set stays.
 */
const IMAGES = {
  'Mobile Crane': '/public/crane-types/mobile-crane.png',
  'Rough Terrain Crane': '/public/crane-types/rough-terrain-crane.png',
  'Crawler Crane': '/public/crane-types/crawler-crane.png',
  'Truck Mounted Crane': '/public/crane-types/truck-mounted-crane.png',
  'All Terrain Crane': '/public/crane-types/all-terrain-crane.png',
  'Tower Crane': '/public/crane-types/tower-crane.png',
  'Pick & Carry Crane': '/public/crane-types/pick-and-carry-crane.png'
};
const CRANE_TYPE = 6;

module.exports = {
  up: async (queryInterface) => {
    for (const [name, image] of Object.entries(IMAGES)) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.sequelize.query(
        `UPDATE static_dropdowns SET image = :image, updated_at = NOW()
         WHERE dropdown_type = :type AND LOWER(dropdown_name) = LOWER(:name) AND (image IS NULL OR image = '')`,
        { replacements: { image, type: CRANE_TYPE, name } }
      );
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `UPDATE static_dropdowns SET image = NULL WHERE dropdown_type = :type AND image LIKE '/public/crane-types/%'`,
      { replacements: { type: CRANE_TYPE } }
    );
  }
};
