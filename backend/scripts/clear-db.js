/* eslint-disable no-console */
/**
 * Clear the database, keep the static data (see src/services/dbClear.service.js for both lists).
 *
 *   npm run db:clear                      shows what would be cleared and kept, changes nothing
 *   npm run db:clear -- --yes             asks you to type the database name, then clears
 *   npm run db:clear -- --yes --files     also deletes the uploaded photos and documents (src/public/uploads)
 *   npm run db:clear -- --yes --confirm=cranzo_db     no question (for scripts): the name must match
 *
 * It runs against the database in this folder's .env (DB_DATABASE), so on the server run it from /var/www/backend.
 */
require('dotenv').config();
const path = require('path');
const readline = require('readline');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (name) => (args.find((a) => a.startsWith(`${name}=`)) || '').slice(name.length + 1);

const ask = (question) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(question, (answer) => { rl.close(); resolve(answer); });
});

const table = (rows) => rows.map((r) => `  ${String(r.table).padEnd(26)} ${String(r.rows).padStart(8)} rows`).join('\n');

(async () => {
  const { dbClearService } = require(path.join(__dirname, '..', 'src', 'services', 'dbClear.service'));
  const { sequelize } = require(path.join(__dirname, '..', 'src', 'config', 'database'));
  try {
    const p = await dbClearService.preview();
    console.log(`\nDatabase: ${p.database}  (${sequelize.config.host}:${sequelize.config.port})\n`);
    console.log('WILL BE CLEARED:');
    console.log(table(p.clear));
    console.log(`\nKEPT (static data and settings):`);
    console.log(table(p.keep));
    if (p.unclassified.length) console.log(`\nLeft alone (not in either list): ${p.unclassified.join(', ')}`);
    console.log(`\n${p.total_rows_to_delete} rows would be deleted.${has('--files') ? ` ${p.uploaded_files} uploaded files would be deleted.` : ` (${p.uploaded_files} uploaded files stay unless you add --files)`}`);

    if (!has('--yes')) {
      console.log('\nNothing was changed. To clear, run:  npm run db:clear -- --yes');
      return;
    }
    const typed = valueOf('--confirm') || await ask(`\nThis cannot be undone. Type the database name (${p.database}) to clear it: `);
    const result = await dbClearService.clear({ confirm: typed, deleteFiles: has('--files') });
    console.log(`\nDone. ${result.rows_deleted} rows deleted from ${result.tables_cleared} tables${has('--files') ? `, ${result.files_deleted} files deleted` : ''}. Static data kept.`);
    console.log('Restart the server so nothing stale stays in memory:  pm2 restart cranezo-backend');
  } catch (error) {
    console.error(`\nFAILED: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
})();
