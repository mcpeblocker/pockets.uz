import { dbRun } from './database.js';

export async function initSchema(db) {
  // Create users table
  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      name TEXT,
      email_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      reset_token TEXT,
      reset_token_expires INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create events table
  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
      email_note TEXT,
      currency TEXT NOT NULL DEFAULT 'USD',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create indexes for events
  await dbRun(db, `CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug)`);
  await dbRun(db, `CREATE INDEX IF NOT EXISTS idx_events_owner_id ON events(owner_id)`);

  // Create participants table
  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT,
      payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await dbRun(db, `CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id)`);
  await dbRun(db, `CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id)`);

  // Create expenses table
  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      currency TEXT NOT NULL DEFAULT 'USD',
      paid_by_participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      expense_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await dbRun(db, `CREATE INDEX IF NOT EXISTS idx_expenses_event_id ON expenses(event_id)`);
  await dbRun(db, `CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by_participant_id)`);

  // Create expense_splits table
  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS expense_splits (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      amount REAL,
      percentage REAL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await dbRun(db, `CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id)`);
  await dbRun(db, `CREATE INDEX IF NOT EXISTS idx_expense_splits_participant_id ON expense_splits(participant_id)`);

  // Create receipts table (for expense photos)
  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      file_name TEXT,
      file_size INTEGER,
      mime_type TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await dbRun(db, `CREATE INDEX IF NOT EXISTS idx_receipts_expense_id ON receipts(expense_id)`);

  // Create settlements table
  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      from_participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      to_participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      from_name TEXT NOT NULL,
      to_name TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await dbRun(db, `CREATE INDEX IF NOT EXISTS idx_settlements_event_id ON settlements(event_id)`);

  console.log('✅ Database schema created');
}
