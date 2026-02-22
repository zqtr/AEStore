/* Product detail page – full description, gallery, add to cart */

const CART_KEY = 'ae_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

function setCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function updateCartBadge() {
  const cart = getCart();
  const el = document.getElementById('cart-count');
  if (!el) return;
  const count = cart.length;
  el.textContent = count;
  el.classList.toggle('empty', count === 0);
}

function getProductId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  return id ? parseInt(id, 10) : null;
}

let currentProduct = null;

async function loadProduct() {
  const id = getProductId();
  const loading = document.getElementById('product-loading');
  const errorEl = document.getElementById('product-error');
  const root = document.getElementById('product-content') || document.getElementById('product-root');

  if (!id) {
    if (loading) loading.classList.add('hidden');
    if (errorEl) { errorEl.textContent = 'Invalid product.'; errorEl.classList.remove('hidden'); }
    return;
  }

  try {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) throw new Error(res.status === 404 ? 'Product not found' : 'Failed to load');
    const product = await res.json();
    currentProduct = product;
    if (loading) loading.classList.add('hidden');
    if (errorEl) errorEl.classList.add('hidden');
    if (root) root.classList.remove('hidden');
    renderProduct(product);
  } catch (e) {
    if (loading) loading.classList.add('hidden');
    if (errorEl) { errorEl.textContent = e.message || 'Could not load product.'; errorEl.classList.remove('hidden'); }
  }
}

function isVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const path = url.toLowerCase().split('?')[0];
  return path.endsWith('.mp4') || path.endsWith('.webm') || path.endsWith('.mov') || path.endsWith('.ogg');
}

function getImages(product) {
  const list = product.images && Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  if (product.image_url) list.unshift(product.image_url);
  return list;
}

function setMainMedia(url, isVideo, mainImg, mainVideo, mainPlaceholder) {
  if (mainImg) mainImg.classList.add('hidden');
  if (mainVideo) { mainVideo.classList.add('hidden'); mainVideo.pause(); mainVideo.removeAttribute('src'); }
  if (mainPlaceholder) mainPlaceholder.classList.add('hidden');
  if (!url) return;
  if (isVideo && mainVideo) {
    mainVideo.src = url;
    mainVideo.classList.remove('hidden');
  } else if (mainImg) {
    mainImg.src = url;
    mainImg.alt = '';
    mainImg.classList.remove('hidden');
  }
}

function renderProduct(p) {
  const media = getImages(p);
  const mainImg = document.getElementById('product-main-img');
  const mainVideo = document.getElementById('product-main-video');
  const mainPlaceholder = document.getElementById('product-main-placeholder') || document.getElementById('main-img-placeholder');
  const thumbsWrap = document.getElementById('product-thumbs');

  if (media.length && (mainImg || mainVideo)) {
    const first = media[0];
    const firstIsVideo = isVideoUrl(first);
    setMainMedia(first, firstIsVideo, mainImg, mainVideo, mainPlaceholder);
    if (mainImg) mainImg.alt = p.name_en;
  } else {
    if (mainImg) mainImg.classList.add('hidden');
    if (mainVideo) mainVideo.classList.add('hidden');
    if (mainPlaceholder) {
      mainPlaceholder.textContent = p.emoji || '📦';
      mainPlaceholder.classList.remove('hidden');
    }
  }

  if (!thumbsWrap) return;
  thumbsWrap.innerHTML = '';
  media.forEach((url, i) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'product-thumb' + (i === 0 ? ' active' : '');
    thumb.setAttribute('aria-label', 'View ' + (i + 1));
    const isVideo = isVideoUrl(url);
    if (isVideo) {
      thumb.innerHTML = `<video muted playsinline preload="metadata" src="${url.replace(/"/g, '&quot;')}"></video>`;
    } else {
      thumb.innerHTML = `<img src="${url.replace(/"/g, '&quot;')}" alt="">`;
    }
    thumb.addEventListener('click', () => {
      setMainMedia(url, isVideo, mainImg, mainVideo, mainPlaceholder);
      if (mainImg && !isVideo) mainImg.alt = p.name_en;
      thumbsWrap.querySelectorAll('.product-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
    thumbsWrap.appendChild(thumb);
  });

  const productCat = document.getElementById('product-cat');
  const productTitle = document.getElementById('product-title');
  const productTitleAr = document.getElementById('product-title-ar');
  const productDesc = document.getElementById('product-desc');
  const productPrice = document.getElementById('product-price');
  if (productCat) productCat.textContent = p.category === 'fivem' ? 'فايف ام' : 'عام';
  if (productTitle) productTitle.textContent = p.name_ar || p.name_en;
  if (productTitleAr) productTitleAr.textContent = (p.name_ar && p.name_en) ? p.name_en : '';
  if (productDesc) productDesc.textContent = p.description || 'لا يوجد وصف.';
  if (productPrice) productPrice.textContent = `QAR ${Number(p.price).toFixed(2)}`;

  let varArr = p.variants;
  if (typeof varArr === 'string') try { varArr = JSON.parse(varArr); } catch (_) { varArr = []; }
  if (!Array.isArray(varArr)) varArr = [];
  
  const variantsBlock = document.getElementById('product-variants-block');
  const variantsSelect = document.getElementById('product-variants');
  if (variantsBlock && variantsSelect) {
    if (varArr.length > 0) {
      variantsSelect.innerHTML = varArr.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
      variantsBlock.classList.remove('hidden');
    } else {
      variantsBlock.classList.add('hidden');
    }
  }

  const btnAdd = document.getElementById('btn-add-cart');
  const btnPreview = document.getElementById('btn-preview');

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  if (btnAdd) btnAdd.onclick = () => {
    const cart = getCart();
    
    let variant = null;
    if (varArr.length > 0) {
      variant = variantsSelect.value;
    }
    
    // Check if same product AND same variant are already in cart
    if (cart.some((i) => i.product_id === p.id && i.variant === variant)) {
      window.location.href = '/#cart';
      return;
    }
    cart.push({
      product_id: p.id,
      name: p.name_ar || p.name_en,
      variant: variant,
      emoji: p.emoji,
      price: p.price,
      qty: 1,
      paddle_price_id: p.paddle_price_id || null
    });
    setCart(cart);
    updateCartBadge();
    window.location.href = '/#cart';
  };

  if (btnPreview) btnPreview.onclick = () => {
    if (p.preview_links) {
      const links = p.preview_links.split('\n').filter(Boolean);
      if (links.length) { window.open(links[0], '_blank'); return; }
    }
    if (media.length) window.open(media[0], '_blank');
    else alert('لا توجد معاينة.');
  };

  document.title = `${p.name_ar || p.name_en} — AE STORE`;
}

updateCartBadge();
loadProduct();
