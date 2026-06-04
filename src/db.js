// SQLite helper layer for the Co-Flow Electron desktop prototype.
// The database is local to the project folder and is used by the local server.
// Keeping these helpers small makes server.js easier to read and explain.

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve project paths in ES module format.
// These paths point the app to db/schema.sql and db/coflow.db consistently.
const __filename = fileURLToPath(import.meta.url); // Detailed note: this line supports the SQLite helper layer used by the desktop prototype.
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const dbDir = path.join(root, 'db');
const dbPath = path.join(dbDir, 'coflow.db'); // Detailed note: this line supports the SQLite helper layer used by the desktop prototype.
const schemaPath = path.join(dbDir, 'schema.sql');

// Create the database folder if the project was freshly downloaded.
// This prevents the seed script or server from failing on a missing db directory.
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// Open the local SQLite database and enable foreign key checks.
// Foreign keys keep task history, owned elements, and settings linked correctly.
export function openDb() {
  const db = new DatabaseSync(dbPath); // Detailed note: this line supports the SQLite helper layer used by the desktop prototype.
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

// Initialise the database by applying the schema file.
// This is safe for existing tables because the schema uses IF NOT EXISTS.
export function initDb() {
  const db = openDb(); // Detailed note: this line supports the SQLite helper layer used by the desktop prototype.
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  return db;
} // Detailed note: this line supports the SQLite helper layer used by the desktop prototype.

// Delete and recreate the demo database.
// The seed script uses this to return the prototype to a clean presentation state.
export function resetDb() {
  if (fs.existsSync(dbPath)) fs.rmSync(dbPath);
  return initDb();
} // Detailed note: this line supports the SQLite helper layer used by the desktop prototype.

// Convenience wrapper for a single-row query.
// It keeps server route code short and readable.
export function row(db, sql, params = []) {
  return db.prepare(sql).get(...params);
}

// Convenience wrapper for multi-row queries.
// It is used when loading tasks, plants, history, and owned garden elements.
export function all(db, sql, params = []) {
  return db.prepare(sql).all(...params); // Detailed note: this line supports the SQLite helper layer used by the desktop prototype.
}

// Convenience wrapper for INSERT, UPDATE, and DELETE statements.
// Parameter arrays are used to avoid unsafe SQL string interpolation.
export function run(db, sql, params = []) {
  return db.prepare(sql).run(...params);
} // Detailed note: this line supports the SQLite helper layer used by the desktop prototype.
