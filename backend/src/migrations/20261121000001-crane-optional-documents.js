'use strict';

/**
 * Optional crane documents: Fitness Certificate, Form 38 and Pollution Certificate.
 * They are crane documents (the owner uploads them with the crane) and are not required to submit it.
 * Adds "Form 38" and "Pollution Certificate" to the document types (dropdown type 9); Fitness Certificate already exists.
 * Which ones are optional is decided in services/crane.service.js (OPTIONAL_DOCUMENTS).
 */
const CRANE_DOCUMENT_TYPE = 9;
const NEW = [
  ['Form 38', 'Form 38 (certificate of fitness of the vehicle)'],
  ['Pollution Certificate', 'Pollution Under Control (PUC) certificate']
];

module.exports = {
  up: async (queryInterface) => {
    const q = queryInterface.sequelize;
    for (const [name, description] of NEW) {
      const [found] = await q.query('SELECT id FROM static_dropdowns WHERE dropdown_type = :t AND lower(dropdown_name) = lower(:n)', { replacements: { t: CRANE_DOCUMENT_TYPE, n: name } });
      if (found.length) continue; // eslint-disable-line no-continue
      await queryInterface.bulkInsert('static_dropdowns', [{
        dropdown_name: name, dropdown_description: description, dropdown_type: CRANE_DOCUMENT_TYPE, dropdown_type_status: 0,
        created_at: new Date(), updated_at: new Date()
      }]);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query("DELETE FROM static_dropdowns WHERE dropdown_type = 9 AND dropdown_name IN ('Form 38', 'Pollution Certificate') AND id NOT IN (SELECT DISTINCT document_type FROM crane_documents)");
  }
};
