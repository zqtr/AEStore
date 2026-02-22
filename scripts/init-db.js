const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const configuredDbPath = (process.env.SQLITE_DB_PATH || '').trim();
const dbPath = configuredDbPath
  ? path.resolve(configuredDbPath)
  : path.join(__dirname, '..', 'data', 'store.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    emoji TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    paddle_price_id TEXT
  );
`);
try {
  db.exec('ALTER TABLE products ADD COLUMN paddle_price_id TEXT');
} catch (_) {}

const hash = bcrypt.hashSync('BOESSAtest', 10);
db.prepare(`
  INSERT OR REPLACE INTO admin (id, username, password_hash) 
  VALUES (1, 'admin', ?)
`).run(hash);

const products = [
  { name_ar: 'بكجات · كميونتي', name_en: 'Community Packages', emoji: '💼', category: 'general', price: 49.99, description: 'Packages for community platforms and branding.', sort_order: 1 },
  { name_ar: 'بكج · ستريمر', name_en: 'Streamer Package', emoji: '📽️', category: 'general', price: 59.99, description: 'Overlays, alerts, and channel art for streamers.', sort_order: 2 },
  { name_ar: 'شعار متحرك', name_en: 'Animated Logo', emoji: '🎨', category: 'general', price: 79.99, description: 'Custom animated logo design.', sort_order: 3 },
  { name_ar: 'شعارات · احرف', name_en: 'Logos · Letters', emoji: '🔠', category: 'general', price: 39.99, description: 'Typography and letter-based logo designs.', sort_order: 4 },
  { name_ar: 'تصميم باقات', name_en: 'Design Packages', emoji: '✨', category: 'general', price: 69.99, description: 'Premium design bundles and custom packages.', sort_order: 5 },
  { name_ar: 'بكجات · فايف . ام', name_en: 'FiveM Packages', emoji: '💼', category: 'fivem', price: 54.99, description: 'General FiveM asset bundles.', sort_order: 6 },
  { name_ar: 'انذارات · فايف · ام', name_en: 'FiveM Alerts', emoji: '⚠️', category: 'fivem', price: 34.99, description: 'In-game alerts and notification graphics.', sort_order: 7 },
  { name_ar: 'اعلانات · فايف . ام', name_en: 'FiveM Advertisements', emoji: '📰', category: 'fivem', price: 44.99, description: 'Ad and promotional graphics for FiveM.', sort_order: 8 },
  { name_ar: 'ايقونات · قراجات', name_en: 'Icons · Garages', emoji: '🚗', category: 'fivem', price: 29.99, description: 'Garage and vehicle icons for FiveM.', sort_order: 9 },
  { name_ar: 'تسجيل دخول', name_en: 'Login', emoji: '🦸', category: 'fivem', price: 49.99, description: 'Login screen and auth UI graphics.', sort_order: 10 },
  { name_ar: 'لودينق . سكرين', name_en: 'Loading Screen', emoji: '🎬', category: 'fivem', price: 64.99, description: 'Loading screen designs for FiveM.', sort_order: 11 },
  { name_ar: 'تصميم · روك · ستار', name_en: 'Design · Rockstar', emoji: '📽️', category: 'fivem', price: 74.99, description: 'Rockstar-themed design assets for FiveM.', sort_order: 12 },
];

const insert = db.prepare(`
  INSERT INTO products (name_ar, name_en, emoji, category, price, description, sort_order)
  VALUES (@name_ar, @name_en, @emoji, @category, @price, @description, @sort_order)
`);

const count = db.prepare('SELECT COUNT(*) as c FROM products').get();
if (count.c === 0) {
  for (const p of products) insert.run(p);
  console.log('Seeded', products.length, 'products.');
}

console.log('Admin: admin / BOESSAtest');
db.close();
