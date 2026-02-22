const CART_KEY = 'ae_cart';
function getStoredCart() { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; } }
function persistCart() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

const cart = getStoredCart();

/* ---- DOM refs ---- */
const gridGeneral = document.getElementById('grid-general');
const gridFivem = document.getElementById('grid-fivem');
const countGeneral = document.getElementById('count-general');
const countFivem = document.getElementById('count-fivem');

const openCartBtn = document.getElementById('open-cart');
const closeCartBtn = document.getElementById('close-cart');
const drawerOverlay = document.getElementById('drawer-overlay');
const drawer = document.getElementById('drawer');
const drawerItems = document.getElementById('drawer-items');
const drawerTotalVal = document.getElementById('drawer-total-val');
const cartCountEl = document.getElementById('cart-count');
const btnCheckout = document.getElementById('btn-checkout');

const checkoutOverlay = document.getElementById('checkout-overlay');
const checkoutContent = document.getElementById('checkout-content');

/* ---- Paddle Checkout ---- */
let paddleClientToken = null;
let paddleInitPromise = null;
let paddleCheckoutPending = null; // { name, email, items, total }

async function ensurePaddle() {
  if (paddleInitPromise) return paddleInitPromise;
  paddleInitPromise = (async () => {
    const configRes = await fetch('/api/config?t=' + Date.now(), { cache: 'no-store' });
    if (!configRes.ok) throw new Error('Could not load payment config');
    const config = await configRes.json();
    paddleClientToken = (config && config.paddleClientToken) ? String(config.paddleClientToken).trim() : null;
    if (!paddleClientToken) {
      throw new Error('Payment not configured. Add PADDLE_CLIENT_TOKEN to the .env file and restart the server.');
    }
    if (typeof window.Paddle === 'undefined') {
      throw new Error('Paddle.js not loaded. Ensure https://cdn.paddle.com/paddle/v2/paddle.js is included.');
    }
    window.Paddle.Initialize({
      token: paddleClientToken,
      checkout: { settings: { displayMode: 'overlay', theme: 'dark', locale: 'en' } },
      eventCallback: handlePaddleEvent,
    });
  })();
  return paddleInitPromise;
}

async function handlePaddleEvent(evt) {
  if (!evt || !evt.name) return;
  if (evt.name === 'checkout.completed') {
    const paymentId = evt.transaction_id || (evt.data && evt.data.transaction_id) || null;
    const pending = paddleCheckoutPending;
    paddleCheckoutPending = null;
    if (!pending) return;
    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: pending.name,
          customer_email: pending.email,
          items: pending.items,
          status: 'paid',
          payment_provider: 'paddle',
          payment_id: paymentId,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'SAVE FAILED');
      showOrderSuccess({
        order_id: orderData.order_id,
        initials: orderData.initials,
        total: orderData.total,
      });
    } catch (e) {
      const errEl = document.getElementById('co-error');
      if (errEl) {
        errEl.textContent = e && e.message ? e.message : 'ORDER SAVE FAILED';
        errEl.classList.remove('hidden');
      }
    }
  }
}

/* ---- Init ---- */
let allProducts = [];
async function init() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('api');
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('bad data');
    allProducts = data;

    const general = data.filter(p => p.category === 'general');
    const fivem = data.filter(p => p.category === 'fivem');

    if(countGeneral) countGeneral.textContent = `[${general.length}]`;
    if(countFivem) countFivem.textContent = `[${fivem.length}]`;

    if(gridGeneral) general.forEach((p, i) => gridGeneral.appendChild(createCard(p, i)));
    if(gridFivem) fivem.forEach((p, i) => gridFivem.appendChild(createCard(p, i)));

    updateCartUI();
    observeCards();
    setupCategoryTabs();
    if (window.location.hash === '#cart') setTimeout(openCart, 100);
  } catch(e) {
    console.error(e);
    const main = document.querySelector('main');
    if(main) main.innerHTML = '<p class="error-msg" style="text-align:center;padding:4rem 0">خطأ: تعذر تحميل المنتجات</p>';
  }
}

/* ---- Create Product Card ---- */
const PLACEHOLDER_IMAGE = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="%231a1a1a" width="400" height="300"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%230b0d17" font-family="monospace" font-size="16">NO SIGNAL</text></svg>');

function normalizeImages(p) {
  if (!p) return;
  if (typeof p.images === 'string') {
    try { p.images = p.images ? JSON.parse(p.images) : []; } catch (_) { p.images = []; }
  }
  if (!Array.isArray(p.images)) p.images = [];
}

function getFirstImage(p) {
  normalizeImages(p);
  if (p.images && p.images[0]) return p.images[0];
  if (p.image_url) return p.image_url;
  return null;
}

function isVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const path = url.toLowerCase().split('?')[0];
  return path.endsWith('.mp4') || path.endsWith('.webm') || path.endsWith('.mov') || path.endsWith('.ogg');
}

function escapeAttr(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function createCard(p, idx) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.animationDelay = `${idx * 0.1}s`;

  const firstMedia = getFirstImage(p);
  const isVideo = firstMedia && isVideoUrl(firstMedia);
  const mediaHtml = firstMedia
    ? (isVideo
        ? `<video class="card-media" src="${escapeAttr(firstMedia)}" muted loop playsinline autoplay preload="metadata" aria-label="${escapeAttr(p.name_en)}"></video>`
        : `<img src="${escapeAttr(firstMedia)}" alt="${escapeAttr(p.name_en)}" loading="lazy">`)
    : `<img src="${PLACEHOLDER_IMAGE}" alt="${escapeAttr(p.name_en)}" loading="lazy">`;

  const catLabel = p.category === 'fivem' ? 'فايف ام' : 'عام';
  const productUrl = `/product?id=${p.id}`;

  card.innerHTML = `
    <div class="card-img">
      <a href="${productUrl}" class="card-img-link" aria-label="معاينة ${escapeAttr(p.name_ar || p.name_en)}">${mediaHtml}</a>
      <span class="card-cat">[${catLabel}]</span>
    </div>
    <div class="card-body">
      <h3><a href="${productUrl}" class="card-title-link">${escapeAttr(p.name_ar || p.name_en)}</a></h3>
      <div class="desc">${escapeAttr(p.description || '')}</div>
      <div class="card-foot">
        <span class="card-price">QAR ${Number(p.price).toFixed(2)}</span>
        <div class="card-actions">
          <button class="btn-sm btn-ghost btn-preview" title="معاينة">معاينة</button>
          <button class="btn-sm btn-add btn-order" data-id="${p.id}">أضف</button>
        </div>
      </div>
    </div>
  `;

  card.querySelector('.btn-preview').addEventListener('click', (e) => { e.preventDefault(); handlePreview(p); });
  card.querySelector('.btn-order').addEventListener('click', (e) => { e.preventDefault(); addToCart(p, e.currentTarget); });

  return card;
}

/* ---- Preview ---- */
function handlePreview(p) {
  if (p.preview_links) {
    const links = p.preview_links.split('\n').filter(Boolean);
    if (links.length) { window.open(links[0], '_blank'); return; }
  }
  if (p.image_url) { window.open(p.image_url, '_blank'); return; }
  alert('لا توجد روابط معاينة');
}

/* ---- Cart Logic ---- */
function addToCart(product, btn) {
  let varArr = product.variants;
  if (typeof varArr === 'string') try { varArr = JSON.parse(varArr); } catch (_) { varArr = []; }
  if (Array.isArray(varArr) && varArr.length > 0) {
    window.location.href = `/product?id=${product.id}`;
    return;
  }

  const exists = cart.find(i => i.product_id === product.id && !i.variant);
  if (exists) { openCart(); return; }
  cart.push({
    product_id: product.id,
    name: product.name_ar || product.name_en,
    variant: null,
    emoji: product.emoji,
    price: product.price,
    qty: 1,
    paddle_price_id: product.paddle_price_id || null
  });
  persistCart();
  btn.innerHTML = `OK`;
  btn.classList.add('added');
  setTimeout(() => {
    btn.classList.remove('added');
    btn.innerHTML = `أضف`;
  }, 1500);
  updateCartUI();
}

function updateCartUI() {
  const count = cart.length;
  if(cartCountEl) {
    cartCountEl.textContent = count;
    cartCountEl.classList.toggle('empty', count === 0);
  }
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  if(drawerTotalVal) drawerTotalVal.textContent = `QAR ${total.toFixed(2)}`;
  if(btnCheckout) btnCheckout.disabled = count === 0;
}

function renderDrawerItems() {
  if (!drawerItems) return;
  if (cart.length === 0) {
    drawerItems.innerHTML = '<div class="drawer-empty">السلة فارغة</div>';
    return;
  }
  drawerItems.innerHTML = cart.map((i, index) => `
    <div class="drawer-item">
      <div class="drawer-item-emoji">${i.emoji}</div>
      <div class="drawer-item-info">
        <h4>${escapeAttr(i.name)}</h4>
        ${i.variant ? `<div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.25rem;">[ ${escapeAttr(i.variant)} ]</div>` : ''}
        <div class="di-price">QAR ${Number(i.price).toFixed(2)}</div>
      </div>
      <button class="drawer-item-remove" data-index="${index}">[X]</button>
    </div>
  `).join('');
  drawerItems.querySelectorAll('.drawer-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      cart.splice(Number(btn.dataset.index), 1);
      persistCart();
      updateCartUI();
      renderDrawerItems();
    });
  });
}

/* ---- Drawer open / close ---- */
function openCart() {
  renderDrawerItems();
  if(drawer) drawer.classList.add('open');
  if(drawerOverlay) drawerOverlay.classList.add('open');
}
function closeCart() {
  if(drawer) drawer.classList.remove('open');
  if(drawerOverlay) drawerOverlay.classList.remove('open');
}
if(openCartBtn) openCartBtn.addEventListener('click', openCart);
if(closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
if(drawerOverlay) drawerOverlay.addEventListener('click', closeCart);

/* ---- Checkout ---- */
if(btnCheckout) btnCheckout.addEventListener('click', () => {
  closeCart();
  showCheckoutForm();
});

const allItemsHavePaddlePrice = () => cart.every(i => i && i.paddle_price_id);

function showCheckoutForm() {
  if(!checkoutContent || !checkoutOverlay) return;
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const isReady = allItemsHavePaddlePrice();

  checkoutContent.innerHTML = `
    <h2>إتمام الطلب</h2>
    <div class="order-summary">
      ${cart.map(i => `<div class="os-item"><span>${escapeAttr(i.name)}${i.variant ? ` [${escapeAttr(i.variant)}]` : ''}</span><span>QAR ${Number(i.price).toFixed(2)}</span></div>`).join('')}
      <div class="os-total"><span>المجموع</span><span>QAR ${total.toFixed(2)}</span></div>
    </div>
    <form id="checkout-form">
      <div class="form-row">
        <div class="form-group">
          <label>الاسم</label>
          <input type="text" id="co-name" required placeholder="الاسم">
        </div>
        <div class="form-group">
          <label>البريد الإلكتروني</label>
          <input type="email" id="co-email" required placeholder="البريد">
        </div>
      </div>
      <div id="co-error" class="error-msg hidden"></div>
      <button type="button" class="btn-submit" id="btn-pay-paddle" ${isReady ? '' : 'disabled'}>الدفع</button>
      <button type="button" class="btn-close-modal" id="btn-cancel-co">[ إلغاء ]</button>
    </form>
  `;
  checkoutOverlay.classList.remove('hidden');

  document.getElementById('btn-cancel-co').addEventListener('click', () => {
    checkoutOverlay.classList.add('hidden');
  });
  const payBtn = document.getElementById('btn-pay-paddle');
  if (payBtn) payBtn.addEventListener('click', () => handlePaddleCheckout());
}

async function handlePaddleCheckout() {
  const nameEl = document.getElementById('co-name');
  const emailEl = document.getElementById('co-email');
  const errEl = document.getElementById('co-error');
  const payBtn = document.getElementById('btn-pay-paddle');

  const name = nameEl ? nameEl.value.trim() : '';
  const email = emailEl ? emailEl.value.trim() : '';

  if (!name || !email) {
    if (errEl) { errEl.textContent = 'أدخل الاسم والبريد الإلكتروني'; errEl.classList.remove('hidden'); }
    return;
  }
  if (!allItemsHavePaddlePrice()) {
    if (errEl) { errEl.textContent = ''; errEl.classList.remove('hidden'); }
    return;
  }
  if (payBtn) payBtn.disabled = true;
  if (errEl) errEl.classList.add('hidden');

  try {
    await ensurePaddle();
    const items = cart.map((i) => ({
      product_id: i.product_id,
      qty: i.qty || 1,
      variant: i.variant || null,
    }));
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    paddleCheckoutPending = { name, email, items, total };

    const itemsList = cart.map((i) => ({
      priceId: i.paddle_price_id,
      quantity: i.qty || 1,
    }));

    window.Paddle.Checkout.open({
      items: itemsList,
      customer: { email },
      customData: {
        customer_name: name,
        customer_email: email,
      },
      settings: { displayMode: 'overlay', theme: 'dark', locale: 'ar' },
    });
  } catch (err) {
    if (payBtn) payBtn.disabled = false;
    let msg = err && err.message ? err.message : 'فشلت العملية';
    if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
  }
}

function showOrderSuccess(order) {
  cart.length = 0;
  persistCart();
  updateCartUI();

  document.querySelectorAll('.btn-add').forEach(btn => {
    btn.classList.remove('added');
    btn.innerHTML = `أضف`;
  });

  checkoutContent.innerHTML = `
    <div style="text-align:center;padding:1.5rem 0">
      <h2 style="margin-bottom:0.5rem;color:var(--success);">تم الطلب بنجاح</h2>
      <p class="subtitle">رقم الطلب: ${order.order_id}</p>
      <p style="color:var(--white);font-size:1.2rem;margin-bottom:1.5rem">المجموع: <strong>QAR ${Number(order.total).toFixed(2)}</strong></p>
      <button class="btn-submit" id="btn-close-success" style="margin-bottom:0.5rem">متابعة</button>
    </div>
  `;
  document.getElementById('btn-close-success').addEventListener('click', () => {
    checkoutOverlay.classList.add('hidden');
  });
}

/* Close modal on overlay click */
if(checkoutOverlay) {
  checkoutOverlay.addEventListener('click', (e) => {
    if (e.target === checkoutOverlay) checkoutOverlay.classList.add('hidden');
  });
}

/* ---- Intersection Observer (reveal cards) ---- */
function observeCards() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px 50px 0px' });
  document.querySelectorAll('.card').forEach(c => obs.observe(c));
}

/* ---- Category tabs ---- */
function setupCategoryTabs() {
  const tabs = document.querySelectorAll('.cat-tab');
  const sections = { general: document.getElementById('general'), fivem: document.getElementById('fivem') };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const cat = tab.dataset.cat;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (cat === 'all') {
        if(sections.general) sections.general.classList.remove('hidden');
        if(sections.fivem) sections.fivem.classList.remove('hidden');
      } else if (cat === 'general') {
        if(sections.general) sections.general.classList.remove('hidden');
        if(sections.fivem) sections.fivem.classList.add('hidden');
      } else {
        if(sections.general) sections.general.classList.add('hidden');
        if(sections.fivem) sections.fivem.classList.remove('hidden');
      }
    });
  });
}

/* ---- Boot ---- */
init();
