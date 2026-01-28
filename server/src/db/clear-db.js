import { initDatabase, getDatabase, dbRun } from './database.js';

async function clearDatabase() {
  try {
    await initDatabase();
    const db = getDatabase();

    // Order matters due to foreign keys
    const tables = [
      'receipts',
      'expense_splits',
      'expenses',
      'settlements',
      'participants',
      'events',
      'users',
    ];

    for (const table of tables) {
      try {
        await dbRun(db, `DELETE FROM ${table}`);
        console.log(`Cleared table: ${table}`);
      } catch (err) {
        console.warn(`Skipping table ${table}:`, err?.message || String(err));
      }
    }

    console.log('✅ Database cleared successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error clearing database:', err);
    process.exit(1);
  }
}

clearDatabase();