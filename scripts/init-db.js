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

const initialPassword = (process.env.ADMIN_INITIAL_PASSWORD || '').trim();
if (initialPassword) {
  const hash = bcrypt.hashSync(initialPassword, 10);
  db.prepare(`
    INSERT OR REPLACE INTO admin (id, username, password_hash) 
    VALUES (1, 'admin', ?)
  `).run(hash);
  console.log('Admin user set. Username: admin');
} else {
  console.warn('Set ADMIN_INITIAL_PASSWORD to create or reset the admin user.');
}

const products = [
  { name_ar: 'شعار متحرك احترافي', name_en: 'Professional Animated Logo', emoji: '🎨', category: 'general', price: 120, description: 'شعار متحرك احترافي.', sort_order: 1 },
  { name_ar: 'شعار الاحرف احترافي', name_en: 'Professional Letter Logo', emoji: '🔠', category: 'general', price: 100, description: 'شعار الاحرف احترافي.', sort_order: 2 },
  { name_ar: 'بكج كميونتي', name_en: 'Community Package', emoji: '💼', category: 'general', price: 165, description: 'بكج كميونتي.', sort_order: 3 },
  { name_ar: 'بكج ستريمر', name_en: 'Streamer Package', emoji: '📽️', category: 'general', price: 135, description: 'بكج ستريمر.', sort_order: 4 },
  { name_ar: 'تصميم باقات', name_en: 'Design Packages', emoji: '✨', category: 'general', price: 50, description: 'تصميم باقات حسب الطلب.', sort_order: 5 },
  { name_ar: 'انذار فايف ام احترافي', name_en: 'Professional FiveM Alert', emoji: '⚠️', category: 'fivem', price: 100, description: 'انذار فايف ام احترافي.', sort_order: 6 },
  { name_ar: 'بكج فايف ام برونز', name_en: 'FiveM Package Bronze', emoji: '💼', category: 'fivem', price: 200, description: 'بكج فايف ام برونز.', sort_order: 7 },
  { name_ar: 'بكج فايف ام سلفر', name_en: 'FiveM Package Silver', emoji: '💼', category: 'fivem', price: 300, description: 'بكج فايف ام سلفر.', sort_order: 8 },
  { name_ar: 'بكج فايف ام قولد', name_en: 'FiveM Package Gold', emoji: '💼', category: 'fivem', price: 500, description: 'بكج فايف ام قولد.', sort_order: 9 },
  { name_ar: 'اعلان فايف ام ثابت', name_en: 'FiveM Ad Static', emoji: '📰', category: 'fivem', price: 10, description: 'اعلان ثابت — السعر للصورة.', sort_order: 10 },
  { name_ar: 'اعلان فايف ام متحرك', name_en: 'FiveM Ad Animated', emoji: '📰', category: 'fivem', price: 20, description: 'اعلان متحرك.', sort_order: 11 },
  { name_ar: 'ايقونات قراجات', name_en: 'Garage Icons', emoji: '🚗', category: 'fivem', price: 13, description: 'القراج الواحد ١٣ ريال.', sort_order: 12 },
  { name_ar: 'تسجيل دخول ثابت', name_en: 'Login Static', emoji: '🦸', category: 'fivem', price: 15, description: 'تسجيل دخول ثابت.', sort_order: 13 },
  { name_ar: 'تسجيل دخول متحرك', name_en: 'Login Animated', emoji: '🦸', category: 'fivem', price: 30, description: 'تسجيل دخول متحرك.', sort_order: 14 },
  { name_ar: 'لودينق سكرين', name_en: 'Loading Screen', emoji: '🎬', category: 'fivem', price: 120, description: 'لودينق سكرين.', sort_order: 15 },
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

db.close();
