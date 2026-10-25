'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const existing = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE user_email = 'vikram@reddycranes.com' OR mobile_number = '9876543210' LIMIT 1;"
    );

    if (existing[0] && existing[0].length > 0) {
      console.log('Sample user already exists, skipping.');
      return;
    }

    const now = new Date();

    await queryInterface.bulkInsert('users', [
      {
        id: '11111111-1111-1111-1111-111111111111',
        language_type: 1, // ID for English
        country_code: '+91',
        mobile_number: '9876543210',
        mobile_otp: '123456',
        is_mobile_verified: 0,
        role_id: 1, // Fleet Owner
        member_id: 'ONR100001',
        profile_image: '/public/roles/owner.png',
        full_name: 'Vikram Reddy',
        company_name: 'Reddy Heavy Crane Logistics Pvt Ltd',
        user_email: 'vikram@reddycranes.com',
        business_address: 'Plot 45, Phase 2, Industrial Development Area, Patancheru',
        city: 'Hyderabad',
        state: 'Telangana',
        country: 'India',
        pincode: '502319',
        years_of_experience: 12, // ID for '5–10 years'
        number_of_business_partners: 16, // ID for '2 Partners'
        business_ownership_type: 22, // ID for 'Private Limited Company'
        company_date_establishment: '2018-06-15',
        business_category: 'Heavy Cranes & Earthmovers',
        owner_type: 4, // ID for 'Individual Business Owner'
        is_active: 0,
        is_deleted: 0,
        device_id: 'DEV-HYD-9981',
        device_unique_id: 'UNIQ-UUID-99812',
        platform_type: 'ANDROID',
        device_details: 'Samsung Galaxy Tab S9 - Android 14 - Cranzo Mobile v1.0.4',
        created_at: now,
        updated_at: now
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', { id: '11111111-1111-1111-1111-111111111111' }, {});
  }
};
