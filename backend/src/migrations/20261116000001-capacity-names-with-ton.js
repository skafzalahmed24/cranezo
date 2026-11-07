'use strict';

/**
 * Crane capacities were stored as bare numbers ("8", "16", "50"), so crane titles and labels read
 * "16 Mobile Crane" / "16 Capacity". This adds the unit: "16" becomes "16 Ton".
 * Only plain numbers change; names that already have text, and a number whose "N Ton" already exists, are left alone.
 * Cranes and bookings point at the capacity by id, so nothing else needs to change.
 * A data fix: there is no automatic reverse (the unit is simply part of the name now).
 */
const CRANE_CAPACITY = 7;

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `UPDATE static_dropdowns AS d
          SET dropdown_name = d.dropdown_name || ' Ton',
              dropdown_description = CASE WHEN d.dropdown_description = d.dropdown_name
                                          THEN d.dropdown_name || ' Ton' ELSE d.dropdown_description END,
              updated_at = NOW()
        WHERE d.dropdown_type = :type
          AND d.dropdown_name ~ '^[0-9]+(\\.[0-9]+)?$'
          AND NOT EXISTS (
            SELECT 1 FROM static_dropdowns o
             WHERE o.dropdown_type = :type AND LOWER(o.dropdown_name) = LOWER(d.dropdown_name || ' Ton')
          )`,
      { replacements: { type: CRANE_CAPACITY } }
    );
  },

  down: async () => {
    // intentionally empty: see the note above
  }
};
