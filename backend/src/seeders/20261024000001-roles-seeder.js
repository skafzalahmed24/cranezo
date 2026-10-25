'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const rolesData = [
      {
        id: 1,
        name: 'Crane Owner',
        code: 'CRANE_OWNER',
        description: 'List your cranes and get more business',
        image: '/public/roles/owner.png',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2,
        name: 'Operator',
        code: 'OPERATOR',
        description: 'Get jobs and start earning.',
        image: '/public/roles/operator.png',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 3,
        name: 'Customer',
        code: 'CUSTOMER',
        description: 'Book cranes for your projects easily.',
        image: '/public/roles/customer.png',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 4,
        name: 'Super Admin',
        code: 'SUPER_ADMIN',
        description: 'Super Admin full platform management',
        image: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    for (const role of rolesData) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM roles WHERE id = ${role.id}`
      );
      if (existing && existing.length > 0) {
        await queryInterface.bulkUpdate(
          'roles',
          {
            name: role.name,
            code: role.code,
            description: role.description,
            image: role.image,
            is_active: role.is_active,
            updated_at: new Date()
          },
          { id: role.id }
        );
      } else {
        await queryInterface.bulkInsert('roles', [role], {});
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Preserve roles to maintain foreign key integrity with admins
  }
};
