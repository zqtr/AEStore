/**
 * Set the admin user password in the database.
 * Usage: node scripts/set-admin-password.js "YourPassword"
 * Or:    set ADMIN_INITIAL_PASSWORD=YourPassword && node scripts/set-admin-password.js
 * Use this when the password has special characters (e.g. %) that break in env vars.
 */
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const password = process.argv[2] || (process.env.ADMIN_INITIAL_PASSWORD || '').trim();
if (!password) {
  console.error('Usage: node scripts/set-admin-password.js "YourPassword"');
  process.exit(1);
}

const configuredDbPath = (process.env.SQLITE_DB_PATH || '').trim();
const dbPath = configuredDbPath
  ? path.resolve(configuredDbPath)
  : path.join(__dirname, '..', 'data', 'store.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dbPath)) {
  console.error('Database not found at', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);
const hash = bcrypt.hashSync(password, 10);

try {
  const result = db.prepare('UPDATE admin SET password_hash = ? WHERE username = ?').run(hash, 'admin');
  if (result.changes === 0) {
    db.prepare('INSERT INTO admin (id, username, password_hash) VALUES (1, ?, ?)').run('admin', hash);
    console.log('Admin user created with the given password.');
  } else {
    console.log('Admin password updated. Username: admin');
  }
} finally {
  db.close();
}
