const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

const configuredDbPath = (process.env.SQLITE_DB_PATH || '').trim();
const dbPath = configuredDbPath ? path.resolve(configuredDbPath) : path.join(__dirname, 'data', 'store.db');
const dataDir = path.dirname(dbPath);

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function ensureDatabase() {
  ensureDataDir();
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_initials TEXT,
      items TEXT NOT NULL,
      total REAL NOT NULL,
      payment_provider TEXT,
      payment_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  try { db.exec('ALTER TABLE products ADD COLUMN paddle_price_id TEXT'); } catch (_) {}
  try {
    db.exec('ALTER TABLE products ADD COLUMN preview_links TEXT');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE products ADD COLUMN images TEXT');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE products ADD COLUMN variants TEXT');
  } catch (_) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN payment_provider TEXT'); } catch (_) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN payment_id TEXT'); } catch (_) {}
  const adminCount = db.prepare('SELECT COUNT(*) as c FROM admin').get();
  if (adminCount.c === 0) {
    const hash = bcrypt.hashSync('BOESSAtest', 10);
    db.prepare('INSERT INTO admin (id, username, password_hash) VALUES (1, ?, ?)').run('admin', hash);
  }
  const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get();
  if (productCount.c === 0) {
    const seed = [
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
      { name_ar: 'رمضان · باقة خاصة', name_en: 'Ramadan Special Package', emoji: '🌙', category: 'ramadan', price: 44.99, description: 'Limited Ramadan graphics bundle: overlays, banners, and social templates.', sort_order: 13 },
      { name_ar: 'شعار رمضاني', name_en: 'Ramadan Logo Pack', emoji: '✨', category: 'ramadan', price: 34.99, description: 'Ramadan-themed logos and branding for the holy month.', sort_order: 14 },
      { name_ar: 'ستوري · رمضان', name_en: 'Ramadan Stories Pack', emoji: '📱', category: 'ramadan', price: 24.99, description: 'Instagram and social media story templates for Ramadan.', sort_order: 15 },
    ];
    const insert = db.prepare('INSERT INTO products (name_ar, name_en, emoji, category, price, description, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const p of seed) insert.run(p.name_ar, p.name_en, p.emoji, p.category, p.price, p.description, p.sort_order);
  }
  const ramadanCount = db.prepare("SELECT COUNT(*) as c FROM products WHERE category = 'ramadan'").get();
  if (ramadanCount.c === 0) {
    const ramadanSeed = [
      { name_ar: 'رمضان · باقة خاصة', name_en: 'Ramadan Special Package', emoji: '🌙', category: 'ramadan', price: 44.99, description: 'Limited Ramadan graphics bundle: overlays, banners, and social templates.', sort_order: 13 },
      { name_ar: 'شعار رمضاني', name_en: 'Ramadan Logo Pack', emoji: '✨', category: 'ramadan', price: 34.99, description: 'Ramadan-themed logos and branding for the holy month.', sort_order: 14 },
      { name_ar: 'ستوري · رمضان', name_en: 'Ramadan Stories Pack', emoji: '📱', category: 'ramadan', price: 24.99, description: 'Instagram and social media story templates for Ramadan.', sort_order: 15 },
    ];
    const insertRamadan = db.prepare('INSERT INTO products (name_ar, name_en, emoji, category, price, description, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const p of ramadanSeed) insertRamadan.run(p.name_ar, p.name_en, p.emoji, p.category, p.price, p.description, p.sort_order);
  }
  const fivemPackagesLinks = [
    'https://discord.com/channels/1316107313643261962/1316107314821988389/1413621411037184112',
    'https://discord.com/channels/1316107313643261962/1316107314821988389/1411707497776939029',
    'https://discord.com/channels/1316107313643261962/1316107314821988389/1399551461511397387',
    'https://discord.com/channels/1316107313643261962/1316107314821988389/1397696025417748573',
  ].join('\n');
  try {
    db.prepare("UPDATE products SET preview_links = ? WHERE name_en = 'FiveM Packages'").run(fivemPackagesLinks);
  } catch (_) {}
  db.close();
}

function getDb() {
  try {
    return new Database(dbPath);
  } catch (e) {
    console.error('DB error:', e.message);
    return null;
  }
}

app.use(cookieParser());
app.use(express.json());

// Page routes before static so /product and /admin are never served as static files
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/product', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product.html'));
});
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});
app.get('/refunds', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'refunds.html'));
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PADDLE_CLIENT_TOKEN = (process.env.PADDLE_CLIENT_TOKEN || '').trim() || null;

// API routes before static so they are never served as files
app.get('/api/config', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({ paddleClientToken: PADDLE_CLIENT_TOKEN });
});

app.use(express.static(path.join(__dirname, 'public')));

const SESSION_COOKIE = 'ae_admin_session';
const SESSION_SECRET =
  (process.env.SESSION_SECRET || '').trim() ||
  `ae-graphics-secret-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function requireAuth(req, res, next) {
  const token = req.cookies[SESSION_COOKIE];
  if (!token || token !== SESSION_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function parseProductImages(row) {
  if (!row) return row;
  let val = row.images;
  if (val == null || val === '') row.images = [];
  else if (typeof val === 'string') {
    try { row.images = JSON.parse(val); } catch (_) { row.images = []; }
  }
  if (!Array.isArray(row.images)) row.images = [];
  return row;
}

app.get('/api/products', (req, res) => {
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not available' });
  const products = db.prepare(`
    SELECT
      id, name_ar, name_en, emoji, category, price, description, image_url, sort_order,
      paddle_price_id, preview_links, images, variants
    FROM products
    ORDER BY sort_order, id
  `).all();
  db.close();
  products.forEach(parseProductImages);
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not available' });
  const product = db.prepare(`
    SELECT
      id, name_ar, name_en, emoji, category, price, description, image_url, sort_order,
      paddle_price_id, preview_links, images, variants
    FROM products
    WHERE id = ?
  `).get(id);
  db.close();
  if (!product) return res.status(404).json({ error: 'Product not found' });
  parseProductImages(product);
  res.json(product);
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not available' });
  const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username);
  db.close();
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  res.cookie(SESSION_COOKIE, SESSION_SECRET, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ success: true });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  const token = req.cookies[SESSION_COOKIE];
  if (!token || token !== SESSION_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ username: 'admin' });
});

app.put('/api/admin/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not available' });
  const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get('admin');
  if (!admin || !bcrypt.compareSync(currentPassword, admin.password_hash)) {
    db.close();
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admin SET password_hash = ? WHERE username = ?').run(hash, 'admin');
  db.close();
  res.json({ success: true });
});

app.get('/api/admin/products', requireAuth, (req, res) => {
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not available' });
  const products = db.prepare(`
    SELECT
      id, name_ar, name_en, emoji, category, price, description, image_url, sort_order,
      paddle_price_id, preview_links, images, variants
    FROM products
    ORDER BY sort_order, id
  `).all();
  db.close();
  res.json(products);
});

app.put('/api/admin/products/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name_ar, name_en, emoji, category, price, description, image_url, sort_order, paddle_price_id, preview_links, images, variants } = req.body || {};
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not available' });
  const imagesJson = images !== undefined ? JSON.stringify(Array.isArray(images) ? images : (typeof images === 'string' ? images.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [])) : undefined;
  const variantsJson = variants !== undefined ? JSON.stringify(Array.isArray(variants) ? variants : (typeof variants === 'string' ? variants.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [])) : undefined;
  db.prepare(`
    UPDATE products SET
      name_ar = COALESCE(?, name_ar),
      name_en = COALESCE(?, name_en),
      emoji = COALESCE(?, emoji),
      category = COALESCE(?, category),
      price = COALESCE(?, price),
      description = COALESCE(?, description),
      sort_order = COALESCE(?, sort_order),
      paddle_price_id = COALESCE(?, paddle_price_id)
    WHERE id = ?
  `).run(name_ar ?? null, name_en ?? null, emoji ?? null, category ?? null, price ?? null, description ?? null, sort_order ?? null, paddle_price_id ?? null, id);
  if (image_url !== undefined) {
    db.prepare('UPDATE products SET image_url = ? WHERE id = ?').run(image_url || null, id);
  }
  if (preview_links !== undefined) {
    db.prepare('UPDATE products SET preview_links = ? WHERE id = ?').run(preview_links || null, id);
  }
  if (imagesJson !== undefined) {
    db.prepare('UPDATE products SET images = ? WHERE id = ?').run(imagesJson, id);
  }
  if (variantsJson !== undefined) {
    db.prepare('UPDATE products SET variants = ? WHERE id = ?').run(variantsJson, id);
  }
  db.close();
  res.json({ success: true });
});

app.post('/api/admin/products', requireAuth, (req, res) => {
  const { name_ar, name_en, emoji, category, price, description, image_url, sort_order, paddle_price_id, preview_links, images, variants } = req.body || {};
  if (!name_ar || !name_en || !emoji || !category) {
    return res.status(400).json({ error: 'name_ar, name_en, emoji, category required' });
  }
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not available' });
  const imagesArr = Array.isArray(images) ? images : (typeof images === 'string' ? images.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : []);
  const imagesJson = JSON.stringify(imagesArr);
  const variantsArr = Array.isArray(variants) ? variants : (typeof variants === 'string' ? variants.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : []).slice(0, 5); // Max 5 variants
  const variantsJson = JSON.stringify(variantsArr);
  const result = db.prepare(`
    INSERT INTO products (name_ar, name_en, emoji, category, price, description, image_url, sort_order, paddle_price_id, preview_links, images, variants)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name_ar, name_en, emoji, category, price ?? 0, description ?? null, image_url ?? null, sort_order ?? 0, paddle_price_id || null, preview_links || null, imagesJson, variantsJson);
  db.close();
  res.json({ id: result.lastInsertRowid, success: true });
});

app.post('/api/orders', (req, res) => {
  const { customer_name, customer_email, items, status, payment_provider, payment_id } = req.body || {};
  if (!customer_name || !customer_email || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customer_name, customer_email, and items[] required' });
  }
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not available' });
  const productIds = items.map((i) => i.product_id);
  const products = db.prepare(
    `SELECT id, name_en, price FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`
  ).all(...productIds);
  const orderItems = items.map((i) => {
    const p = products.find((x) => x.id === i.product_id);
    if (!p) return null;
    return { product_id: p.id, name: p.name_en, variant: i.variant || null, price: p.price, qty: i.qty || 1 };
  }).filter(Boolean);
  if (orderItems.length === 0) {
    db.close();
    return res.status(400).json({ error: 'No valid products in order' });
  }
  const total = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
  const initials = customer_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const safeStatus = status && typeof status === 'string' ? status : 'pending';
  const safeProvider = payment_provider && typeof payment_provider === 'string' ? payment_provider : null;
  const safePaymentId = payment_id && typeof payment_id === 'string' ? payment_id : null;
  const result = db.prepare(`INSERT INTO orders (customer_name, customer_email, customer_initials, items, total, payment_provider, payment_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(customer_name, customer_email, initials, JSON.stringify(orderItems), total, safeProvider, safePaymentId, safeStatus);
  db.close();
  res.json({ success: true, order_id: result.lastInsertRowid, initials, total });
});

app.get('/api/admin/orders', requireAuth, (req, res) => {
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not available' });
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  db.close();
  res.json(orders);
});

app.put('/api/admin/orders/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status required' });
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not available' });
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  db.close();
  res.json({ success: true });
});

app.delete('/api/admin/products/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not available' });
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  db.close();
  res.json({ success: true });
});

ensureDatabase();

const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`AE Graphics Store running at http://${HOST}:${PORT}`);
  console.log(PADDLE_CLIENT_TOKEN ? 'Paddle: configured' : 'Paddle: not configured (add PADDLE_CLIENT_TOKEN to .env and restart)');
});
