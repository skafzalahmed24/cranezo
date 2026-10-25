'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const existing = await queryInterface.sequelize.query(
      'SELECT id, dropdown_name, dropdown_type FROM static_dropdowns WHERE dropdown_type IN (2, 3, 4, 5);'
    );

    if (existing[0] && existing[0].length > 0) {
      console.log('Business onboarding dropdowns already seeded, skipping duplicate insert.');
      return;
    }

    const now = new Date();

    const items = [
      // 2: Owner Type
      {
        dropdown_name: 'Individual Business Owner',
        dropdown_description: 'Individual Business Owner',
        dropdown_type: 2,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: 'Co-Founder',
        dropdown_description: 'Co-Founder',
        dropdown_type: 2,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: 'Managing Partner',
        dropdown_description: 'Managing Partner',
        dropdown_type: 2,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: 'Director',
        dropdown_description: 'Director',
        dropdown_type: 2,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: 'Other',
        dropdown_description: 'Other owner type',
        dropdown_type: 2,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },

      // 3: Years of Business Experience
      {
        dropdown_name: 'Less than 1 year',
        dropdown_description: 'Less than 1 year',
        dropdown_type: 3,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: '1–3 years',
        dropdown_description: '1 to 3 years',
        dropdown_type: 3,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: '3–5 years',
        dropdown_description: '3 to 5 years',
        dropdown_type: 3,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: '5–10 years',
        dropdown_description: '5 to 10 years',
        dropdown_type: 3,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: 'More than 10 years',
        dropdown_description: 'More than 10 years',
        dropdown_type: 3,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },

      // 4: Number of Business Partners
      {
        dropdown_name: 'No partners (Sole Owner)',
        dropdown_description: 'No partners (Sole Owner)',
        dropdown_type: 4,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: '1 Partner',
        dropdown_description: '1 Partner',
        dropdown_type: 4,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: '2 Partners',
        dropdown_description: '2 Partners',
        dropdown_type: 4,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: '3 Partners',
        dropdown_description: '3 Partners',
        dropdown_type: 4,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: '4 or More Partners',
        dropdown_description: '4 or More Partners',
        dropdown_type: 4,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },

      // 5: Business Ownership Type
      {
        dropdown_name: 'Sole Proprietorship',
        dropdown_description: 'Sole Proprietorship',
        dropdown_type: 5,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: 'Partnership Firm',
        dropdown_description: 'Partnership Firm',
        dropdown_type: 5,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: 'LLP',
        dropdown_description: 'Limited Liability Partnership',
        dropdown_type: 5,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: 'Private Limited Company',
        dropdown_description: 'Private Limited Company',
        dropdown_type: 5,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: 'Public Limited Company',
        dropdown_description: 'Public Limited Company',
        dropdown_type: 5,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      },
      {
        dropdown_name: 'Other',
        dropdown_description: 'Other business ownership type',
        dropdown_type: 5,
        dropdown_type_status: 0,
        created_at: now,
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('static_dropdowns', items, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete(
      'static_dropdowns',
      {
        dropdown_type: {
          [Sequelize.Op.in]: [2, 3, 4, 5]
        }
      },
      {}
    );
  }
};
