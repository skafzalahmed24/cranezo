'use strict';

/**
 * The product is called Cranezo. Text that was saved with the old spelling (Terms, Privacy, Help & Support)
 * is corrected in the database. Only the brand word changes; everything else in the text stays as it is.
 * A data fix: there is no automatic reverse.
 */
const fix = (column) => `REPLACE(REPLACE(REPLACE(${column}, 'Cranzo', 'Cranezo'), 'CRANZO', 'CRANEZO'), 'cranzo.com', 'cranezo.com')`;

module.exports = {
  up: async (queryInterface) => {
    const q = queryInterface.sequelize;
    await q.query(`UPDATE legal_pages SET title = ${fix('title')}, intro = ${fix('intro')}, sections = ${fix('sections::text')}::jsonb WHERE title ~ 'ranzo|RANZO' OR intro ~ 'ranzo|RANZO' OR sections::text ~ 'ranzo|RANZO'`);
    await q.query(`UPDATE faqs SET question = ${fix('question')}, answer = ${fix('answer')} WHERE question ~ 'ranzo|RANZO' OR answer ~ 'ranzo|RANZO'`);
    await q.query(`UPDATE faq_categories SET name = ${fix('name')}, description = ${fix('description')} WHERE name ~ 'ranzo|RANZO' OR description ~ 'ranzo|RANZO'`);
  },

  down: async () => {
    // the old spelling is not brought back
  }
};
