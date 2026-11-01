'use strict';

// Gives the SAMPLE- cranes (see the sample cranes seeder) a map position and an About text
// so the Book a Crane search can find them. Test data only, skip it on a real production database.
const LOCATIONS = {
  'SAMPLE-TN-09-AB-1001': { lat: 13.0827, lng: 80.2707, about: 'Reliable 50T mobile crane suitable for construction, industrial and infrastructure projects. Comes with an experienced and certified operator for safe and efficient operations.' },
  'SAMPLE-KA-01-CD-2002': { lat: 12.9716, lng: 77.5946, about: 'Rough terrain crane built for uneven sites and heavy lifts. Operator and fuel included.' },
  'SAMPLE-TS-07-EF-3003': { lat: 17.385, lng: 78.4867, about: 'Crawler crane for large infrastructure and power projects.' },
  'SAMPLE-TN-38-GH-4004': { lat: 11.0168, lng: 76.9558, about: 'Truck mounted crane that reaches the site fast and sets up in minutes.' },
  'SAMPLE-MH-12-IJ-5005': { lat: 19.076, lng: 72.8777, about: 'All terrain crane for large-scale and specialised projects.' }
};

module.exports = {
  up: async (queryInterface) => {
    for (const [registration, place] of Object.entries(LOCATIONS)) {
      await queryInterface.sequelize.query(
        'UPDATE cranes SET latitude = :lat, longitude = :lng, description = COALESCE(description, :about), updated_at = NOW() WHERE registration_number = :registration',
        { replacements: { registration, lat: place.lat, lng: place.lng, about: place.about } }
      );
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      "UPDATE cranes SET latitude = NULL, longitude = NULL, description = NULL WHERE registration_number LIKE 'SAMPLE-%'"
    );
  }
};
