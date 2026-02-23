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
  const initialPassword = (process.env.ADMIN_INITIAL_PASSWORD || '').trim();
  if (adminCount.c === 0) {
    if (initialPassword) {
      const hash = bcrypt.hashSync(initialPassword, 10);
      db.prepare('INSERT INTO admin (id, username, password_hash) VALUES (1, ?, ?)').run('admin', hash);
      console.log('Admin user created. Change the password in the dashboard and remove ADMIN_INITIAL_PASSWORD from env.');
    } else {
      console.warn('No admin user and ADMIN_INITIAL_PASSWORD not set. Set ADMIN_INITIAL_PASSWORD and restart to create the first admin.');
    }
  } else if (initialPassword) {
    const hash = bcrypt.hashSync(initialPassword, 10);
    db.prepare('UPDATE admin SET password_hash = ? WHERE username = ?').run(hash, 'admin');
    console.log('Admin password reset from ADMIN_INITIAL_PASSWORD. Remove it from env after logging in.');
  }
  const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get();
  if (productCount.c === 0) {
    const seed = [
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
    const insert = db.prepare('INSERT INTO products (name_ar, name_en, emoji, category, price, description, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const p of seed) insert.run(p.name_ar, p.name_en, p.emoji, p.category, p.price, p.description, p.sort_order);
  }
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
const PADDLE_API_KEY = (process.env.PADDLE_API_KEY || '').trim() || null;

function getPaddleApiBase() {
  if (!PADDLE_API_KEY) return null;
  return PADDLE_API_KEY.startsWith('test_') ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
}

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
  const existing = db.prepare('SELECT id, paddle_price_id FROM products WHERE id = ?').get(id);
  if (!existing) {
    db.close();
    return res.status(404).json({ error: 'Product not found' });
  }
  const currentPaddleId = typeof existing.paddle_price_id === 'string' ? existing.paddle_price_id.trim() : '';
  let nextPaddleId = null; // COALESCE(null, paddle_price_id) keeps existing value
  if (paddle_price_id !== undefined) {
    const requestedPaddleId = typeof paddle_price_id === 'string' ? paddle_price_id.trim() : '';
    // Guard against accidental wipe from empty/null payloads.
    if (requestedPaddleId) {
      if (!requestedPaddleId.startsWith('pri_')) {
        db.close();
        return res.status(400).json({ error: 'Invalid Paddle price ID format' });
      }
      // Write-once behavior: once set, Paddle ID cannot be changed in normal edits.
      if (currentPaddleId && requestedPaddleId !== currentPaddleId) {
        db.close();
        return res.status(400).json({ error: 'Paddle price ID is locked and cannot be changed from admin edits' });
      }
      nextPaddleId = requestedPaddleId;
    }
  }
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
  `).run(name_ar ?? null, name_en ?? null, emoji ?? null, category ?? null, price ?? null, description ?? null, sort_order ?? null, nextPaddleId, id);
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
  const normalizedPaddleId = typeof paddle_price_id === 'string' ? paddle_price_id.trim() : '';
  if (normalizedPaddleId && !normalizedPaddleId.startsWith('pri_')) {
    return res.status(400).json({ error: 'Invalid Paddle price ID format' });
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
  `).run(name_ar, name_en, emoji, category, price ?? 0, description ?? null, image_url ?? null, sort_order ?? 0, normalizedPaddleId || null, preview_links || null, imagesJson, variantsJson);
  db.close();
  res.json({ id: result.lastInsertRowid, success: true });
});

app.post('/api/orders', (req, res) => {
  const { customer_name, customer_email, items } = req.body || {};
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
  // Public checkout orders are always created as pending.
  // Paid status must never be trusted from client-side input.
  const safeStatus = 'pending';
  const safeProvider = null;
  const safePaymentId = null;
  const result = db.prepare(`INSERT INTO orders (customer_name, customer_email, customer_initials, items, total, payment_provider, payment_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(customer_name, customer_email, initials, JSON.stringify(orderItems), total, safeProvider, safePaymentId, safeStatus);
  db.close();
  res.json({ success: true, order_id: result.lastInsertRowid, initials, total });
});

app.post('/api/orders/confirm-paddle', async (req, res) => {
  const { order_id, transaction_id } = req.body || {};
  const orderId = parseInt(order_id, 10);
  const transactionId = typeof transaction_id === 'string' ? transaction_id.trim() : '';
  if (!orderId || !transactionId) {
    return res.status(400).json({ error: 'order_id and transaction_id are required' });
  }

  const paddleApiBase = getPaddleApiBase();
  if (!paddleApiBase) {
    return res.status(503).json({ error: 'PADDLE_API_KEY is required to confirm paid orders securely' });
  }

  let txData = null;
  try {
    const txRes = await fetch(`${paddleApiBase}/transactions/${encodeURIComponent(transactionId)}`, {
      headers: {
        Authorization: `Bearer ${PADDLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!txRes.ok) {
      const msg = await txRes.text();
      return res.status(502).json({ error: `Paddle verification failed (${txRes.status}): ${msg}` });
    }
    const txJson = await txRes.json();
    txData = txJson && txJson.data ? txJson.data : null;
  } catch (err) {
    return res.status(502).json({ error: `Paddle verification error: ${err && err.message ? err.message : 'unknown'}` });
  }

  const txStatus = txData && typeof txData.status === 'string' ? txData.status : '';
  if (!txData || txData.id !== transactionId || txStatus !== 'completed') {
    return res.status(400).json({ error: 'Transaction is not completed or could not be validated' });
  }

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not available' });

  const order = db.prepare('SELECT id, status FROM orders WHERE id = ?').get(orderId);
  if (!order) {
    db.close();
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.status === 'paid') {
    db.close();
    return res.json({ success: true, order_id: orderId, status: 'paid' });
  }

  db.prepare(`
    UPDATE orders
    SET status = 'paid',
        payment_provider = 'paddle',
        payment_id = ?
    WHERE id = ?
  `).run(transactionId, orderId);
  db.close();
  res.json({ success: true, order_id: orderId, status: 'paid' });
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
  console.log(PADDLE_API_KEY ? 'Paddle API: configured' : 'Paddle API: not configured (add PADDLE_API_KEY for secure paid-order verification)');
});
