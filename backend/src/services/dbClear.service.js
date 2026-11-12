/**
 * Clears the database for a fresh start (before going live, or after testing) and keeps the static data.
 *
 * CLEARED (accounts and everything they created):
 *   users, cranes (+ photos, documents), crane requests, bookings (+ extensions, ratings, photos, issues),
 *   job requests, complaints, notifications, payments, settlements, owner subscriptions and billing settings,
 *   support tickets and messages, announcements.
 *   Ids start again from 1 (RESTART IDENTITY).
 *
 * KEPT (static data and settings):
 *   admins and admin access roles (so you can still sign in to the panel), roles, static dropdowns,
 *   FAQs and FAQ categories, legal pages, platform settings (fees, subscription plans, app versions),
 *   price minimums, support settings, banners, and the migration history.
 *
 * Any table that is in neither list is reported and left alone, so a new table is never wiped by surprise.
 * Used by `npm run db:clear` and by the Super Admin page "Clear database".
 */
const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CLEAR_TABLES = [
  'users',
  'cranes', 'crane_photos', 'crane_documents', 'crane_requests',
  'bookings', 'booking_extensions', 'booking_ratings', 'job_photos', 'job_issues', 'job_requests',
  'complaints', 'complaint_updates',
  'notifications', 'announcements',
  'payment_transactions', 'settlements', 'subscription_payments', 'owner_subscriptions', 'owner_billing_settings',
  'support_tickets', 'support_messages'
];

const KEEP_TABLES = [
  'admins', 'admin_access_roles', 'roles', 'static_dropdowns',
  'faq_categories', 'faqs', 'legal_pages',
  'platform_settings', 'price_minimums', 'support_settings', 'banners',
  'SequelizeMeta'
];

// photos and documents people uploaded (src/public/uploads). The other public folders (role and crane-type
// pictures) are static data and are never touched.
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

class ClearError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const quote = (name) => `"${String(name).replace(/"/g, '""')}"`;

const existingTables = async () => {
  // pg_tables, not information_schema: Sequelize rewrites a plain 'SELECT table_name FROM information_schema.tables' into arrays
  const rows = await sequelize.query("SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'", { type: QueryTypes.SELECT });
  return new Set(rows.map((r) => r.name));
};

const countOf = async (table) => {
  const rows = await sequelize.query(`SELECT COUNT(*)::int AS n FROM ${quote(table)}`, { type: QueryTypes.SELECT });
  return rows[0].n;
};

const uploadedFiles = () => {
  try {
    return fs.readdirSync(UPLOADS_DIR, { withFileTypes: true }).filter((e) => e.isFile() && !e.name.startsWith('.')).map((e) => e.name);
  } catch (error) {
    return [];
  }
};

class DbClearService {
  /** The name of the database that would be cleared: the person must type it to confirm */
  databaseName() {
    return sequelize.config.database;
  }

  /** Switch for the web page / API. The command line does not need it (the person is at the server already). */
  apiAllowed() {
    return String(process.env.ALLOW_DB_CLEAR || '').toLowerCase() === 'true';
  }

  /** What would be cleared and kept, with row counts. Changes nothing. */
  async preview() {
    const present = await existingTables();
    const clear = [];
    for (const table of CLEAR_TABLES) if (present.has(table)) clear.push({ table, rows: await countOf(table) });
    const keep = [];
    for (const table of KEEP_TABLES) if (present.has(table)) keep.push({ table, rows: await countOf(table) });
    const known = new Set([...CLEAR_TABLES, ...KEEP_TABLES]);
    const unclassified = [...present].filter((t) => !known.has(t));
    return {
      database: this.databaseName(),
      clear,
      keep,
      unclassified,
      total_rows_to_delete: clear.reduce((sum, t) => sum + t.rows, 0),
      uploaded_files: uploadedFiles().length
    };
  }

  /**
   * Clears every table in CLEAR_TABLES in one transaction (all or nothing).
   * `confirm` must be the database name, typed by the person.
   */
  async clear({ confirm, deleteFiles = false } = {}) {
    if (String(confirm || '').trim() !== this.databaseName()) {
      throw new ClearError(`Type the database name (${this.databaseName()}) to confirm.`);
    }
    const present = await existingTables();
    const tables = CLEAR_TABLES.filter((t) => present.has(t));
    if (!tables.length) throw new ClearError('Nothing to clear.');
    const before = await this.preview();

    // no CASCADE on purpose: if a kept table points at a cleared one, the database refuses and nothing changes
    try {
      await sequelize.transaction(async (transaction) => {
        await sequelize.query(`TRUNCATE TABLE ${tables.map(quote).join(', ')} RESTART IDENTITY`, { transaction });
      });
    } catch (error) {
      throw new ClearError(`The database refused to clear the tables, nothing was changed: ${error.message}`, 409);
    }

    let filesDeleted = 0;
    if (deleteFiles) {
      for (const name of uploadedFiles()) {
        try {
          fs.unlinkSync(path.join(UPLOADS_DIR, name));
          filesDeleted += 1;
        } catch (error) {
          // a locked file is left behind; the rest still go
        }
      }
    }
    return {
      database: before.database,
      cleared: before.clear.filter((t) => t.rows > 0),
      tables_cleared: tables.length,
      rows_deleted: before.total_rows_to_delete,
      files_deleted: filesDeleted
    };
  }
}

module.exports = { dbClearService: new DbClearService(), ClearError, CLEAR_TABLES, KEEP_TABLES };
