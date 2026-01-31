import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { initSchema } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '../../data/pockets.db');

let db = null;

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase() {
  try {
    // Ensure directory for DB file exists
    const dir = dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create database connection (better-sqlite3 is synchronous)
    db = new Database(DB_PATH);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    console.log('✅ Database connected:', DB_PATH);
    
    // Initialize schema
    await initSchema(db);
    console.log('✅ Database schema initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
}

// Database methods using better-sqlite3 (synchronous but wrapped for async compatibility)
export const dbRun = (db, sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    const info = stmt.run(...params);
    return Promise.resolve({ lastID: info.lastInsertRowid, changes: info.changes });
  } catch (err) {
    return Promise.reject(err);
  }
};

export const dbGet = (db, sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    const row = stmt.get(...params);
    return Promise.resolve(row);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const dbAll = (db, sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return Promise.resolve(rows || []);
  } catch (err) {
    return Promise.reject(err);
  }
};
