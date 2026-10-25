'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      language_type: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'static_dropdowns',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Static dropdown ID for language (1: English, 2: Telugu, 3: Hindi)'
      },
      country_code: {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: '+91'
      },
      mobile_number: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      mobile_otp: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      is_mobile_verified: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: '0 for verified, 1 for not verified'
      },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'roles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      member_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true
      },
      profile_image: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      full_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      company_name: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      user_email: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      business_address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      country: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: 'India'
      },
      pincode: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      years_of_experience: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'static_dropdowns',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Static dropdown ID for Years of Experience'
      },
      number_of_business_partners: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'static_dropdowns',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Static dropdown ID for Number of Partners'
      },
      business_ownership_type: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'static_dropdowns',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Static dropdown ID for Business Ownership Type'
      },
      company_date_establishment: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      business_category: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      owner_type: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'static_dropdowns',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Static dropdown ID for Owner Type'
      },
      is_active: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '0 for active, 1 for deactive'
      },
      is_deleted: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '0 for active, 1 for deactive'
      },
      device_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      device_unique_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      platform_type: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      device_details: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('users', ['mobile_number']);
    await queryInterface.addIndex('users', ['user_email']);
    await queryInterface.addIndex('users', ['role_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};
