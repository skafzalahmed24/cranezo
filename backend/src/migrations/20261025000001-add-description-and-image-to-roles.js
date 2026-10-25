'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add description column to roles
    await queryInterface.addColumn('roles', 'description', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Add image column to roles
    await queryInterface.addColumn('roles', 'image', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Populate existing roles with descriptions and images
    await queryInterface.bulkUpdate(
      'roles',
      {
        description: 'List your cranes and get more business',
        image: '/public/roles/owner.png',
        updated_at: new Date()
      },
      { code: 'CRANE_OWNER' }
    );

    await queryInterface.bulkUpdate(
      'roles',
      {
        description: 'Get jobs and start earning.',
        image: '/public/roles/operator.png',
        updated_at: new Date()
      },
      { code: 'OPERATOR' }
    );

    await queryInterface.bulkUpdate(
      'roles',
      {
        description: 'Book cranes for your projects easily.',
        image: '/public/roles/customer.png',
        updated_at: new Date()
      },
      { code: 'CUSTOMER' }
    );

    await queryInterface.bulkUpdate(
      'roles',
      {
        description: 'Super Admin full platform management',
        image: null,
        updated_at: new Date()
      },
      { code: 'SUPER_ADMIN' }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('roles', 'image');
    await queryInterface.removeColumn('roles', 'description');
  }
};
