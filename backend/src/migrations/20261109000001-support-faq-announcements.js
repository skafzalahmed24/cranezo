'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // "Your crane is expected to arrive in 15 minutes" is sent once per booking
    await queryInterface.addColumn('bookings', 'arriving_notified_at', { type: Sequelize.DATE, allowNull: true });

    const userRef = (allowNull) => ({
      type: Sequelize.UUID,
      allowNull,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: allowNull ? 'SET NULL' : 'CASCADE'
    });
    const adminRef = {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'admins', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    };

    // ---- phone numbers and texts of the Help & Support screen (one row, edited by the admin) ----
    await queryInterface.createTable('support_settings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      support_phone: { type: Sequelize.STRING(30), allowNull: true },
      emergency_phone: { type: Sequelize.STRING(30), allowNull: true },
      support_email: { type: Sequelize.STRING(150), allowNull: true },
      hours_label: { type: Sequelize.STRING(60), allowNull: false, defaultValue: '24/7' },
      team_message: { type: Sequelize.STRING(255), allowNull: false, defaultValue: '24/7 to assist you with any queries.' },
      chat_welcome: { type: Sequelize.STRING(255), allowNull: false, defaultValue: 'Hi! How can we help you? Our team replies within a few minutes.' },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });

    // ---- FAQs ----
    await queryInterface.createTable('faq_categories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      code: { type: Sequelize.STRING(30), allowNull: false, unique: true, comment: 'booking_help, payment_help, general ...' },
      name: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, comment: '0 active, 1 hidden' },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.createTable('faqs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'faq_categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      question: { type: Sequelize.STRING(255), allowNull: false },
      answer: { type: Sequelize.TEXT, allowNull: false },
      audience: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'all', comment: 'all, customer, operator or owner' },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, comment: '0 active, 1 hidden' },
      helpful_yes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      helpful_no: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('faqs', ['category_id', 'is_active']);

    // ---- support requests and chat ----
    await queryInterface.createTable('support_tickets', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      ticket_code: { type: Sequelize.STRING(20), allowNull: false, unique: true, comment: 'e.g. TKT-482913' },
      user_id: userRef(false),
      role_id: { type: Sequelize.INTEGER, allowNull: true },
      category: { type: Sequelize.STRING(20), allowNull: false, comment: 'booking_help, payment_help, issue, general, chat or emergency' },
      subject: { type: Sequelize.STRING(200), allowNull: false },
      status: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, comment: '0 open, 1 in progress, 2 resolved, 3 closed' },
      priority: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'normal', comment: 'normal, high or urgent' },
      booking_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'bookings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      assigned_admin_id: adminRef,
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      last_message_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('support_tickets', ['user_id', 'status']);
    await queryInterface.addIndex('support_tickets', ['status', 'priority', 'last_message_at']);

    await queryInterface.createTable('support_messages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      ticket_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'support_tickets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sender_type: { type: Sequelize.STRING(10), allowNull: false, comment: 'user, admin or system' },
      sender_id: { type: Sequelize.UUID, allowNull: true },
      body: { type: Sequelize.TEXT, allowNull: false },
      attachments: { type: Sequelize.JSONB, allowNull: true },
      is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'read by the other side' },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('support_messages', ['ticket_id', 'created_at']);

    // ---- admin broadcasts shown in every user's Notifications ----
    await queryInterface.createTable('announcements', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      title: { type: Sequelize.STRING(150), allowNull: false },
      body: { type: Sequelize.TEXT, allowNull: false },
      audience: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'all', comment: 'all, customer, operator or owner' },
      sent_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_by: adminRef,
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('announcements');
    await queryInterface.dropTable('support_messages');
    await queryInterface.dropTable('support_tickets');
    await queryInterface.dropTable('faqs');
    await queryInterface.dropTable('faq_categories');
    await queryInterface.dropTable('support_settings');
    await queryInterface.removeColumn('bookings', 'arriving_notified_at');
  }
};
