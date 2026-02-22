(function () {
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const productsTbody = document.getElementById('products-tbody');
  const btnLogout = document.getElementById('btn-logout');
  const btnChangePassword = document.getElementById('btn-change-password');
  const btnAddProduct = document.getElementById('btn-add-product');
  const modalProduct = document.getElementById('modal-product');
  const modalProductTitle = document.getElementById('modal-product-title');
  const formProduct = document.getElementById('form-product');
  const productId = document.getElementById('product-id');
  const btnCancelProduct = document.getElementById('btn-cancel-product');
  const modalPassword = document.getElementById('modal-password');
  const formPassword = document.getElementById('form-password');
  const passwordError = document.getElementById('password-error');
  const passwordSuccess = document.getElementById('password-success');
  const btnCancelPassword = document.getElementById('btn-cancel-password');

  function show(el) {
    el.classList.remove('hidden');
  }
  function hide(el) {
    el.classList.add('hidden');
  }

  function api(path, options = {}) {
    return fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
  }

  const ordersTbody = document.getElementById('orders-tbody');

  function checkAuth() {
    api('/api/me')
      .then((r) => {
        if (r.ok) {
          hide(loginView);
          show(dashboardView);
          loadProducts();
          loadOrders();
        } else {
          show(loginView);
          hide(dashboardView);
        }
      })
      .catch(() => {
        show(loginView);
        hide(dashboardView);
      });
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hide(loginError);
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          loginError.textContent = data.error;
          show(loginError);
          return;
        }
        checkAuth();
      })
      .catch(() => {
        loginError.textContent = 'Login failed.';
        show(loginError);
      });
  });

  btnLogout.addEventListener('click', () => {
    api('/api/logout', { method: 'POST' }).then(() => {
      show(loginView);
      hide(dashboardView);
    });
  });

  function loadProducts() {
    api('/api/admin/products')
      .then((r) => r.json())
      .then((products) => {
        productsTbody.innerHTML = products
          .map(
            (p) => `
          <tr>
            <td>${escapeHtml(p.emoji || '')}</td>
            <td>${escapeHtml(p.name_en)}</td>
            <td>${escapeHtml(p.name_ar)}</td>
            <td>${escapeHtml(p.category)}</td>
            <td>$${Number(p.price).toFixed(2)}</td>
            <td class="actions">
              <button type="button" class="btn btn-secondary edit-product" data-id="${p.id}">Edit</button>
              <button type="button" class="btn btn-danger delete-product" data-id="${p.id}">Delete</button>
            </td>
          </tr>
        `
          )
          .join('');
        productsTbody.querySelectorAll('.edit-product').forEach((btn) => {
          btn.addEventListener('click', () => openEditProduct(Number(btn.dataset.id), products));
        });
        productsTbody.querySelectorAll('.delete-product').forEach((btn) => {
          btn.addEventListener('click', () => deleteProduct(Number(btn.dataset.id)));
        });
      });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function openEditProduct(id, products) {
    const p = products.find((x) => x.id === id) || {};
    productId.value = id;
    document.getElementById('product-emoji').value = p.emoji || '';
    document.getElementById('product-name-en').value = p.name_en || '';
    document.getElementById('product-name-ar').value = p.name_ar || '';
    document.getElementById('product-category').value = p.category || 'general';
    document.getElementById('product-price').value = p.price ?? '';
    document.getElementById('product-description').value = p.description || '';
    document.getElementById('product-image-url').value = p.image_url || '';
    let imgArr = p.images;
    if (typeof imgArr === 'string') try { imgArr = JSON.parse(imgArr); } catch (_) { imgArr = []; }
    document.getElementById('product-images').value = Array.isArray(imgArr) ? imgArr.join('\n') : '';
    let varArr = p.variants;
    if (typeof varArr === 'string') try { varArr = JSON.parse(varArr); } catch (_) { varArr = []; }
    document.getElementById('product-variants').value = Array.isArray(varArr) ? varArr.join('\n') : '';
    document.getElementById('product-paddle-price-id').value = p.paddle_price_id || '';
    document.getElementById('product-preview-links').value = p.preview_links || '';
    modalProductTitle.textContent = 'Edit product';
    show(modalProduct);
  }

  function openAddProduct() {
    productId.value = '';
    document.getElementById('product-emoji').value = '✨';
    document.getElementById('product-name-en').value = '';
    document.getElementById('product-name-ar').value = '';
    document.getElementById('product-category').value = 'general';
    document.getElementById('product-price').value = '0';
    document.getElementById('product-description').value = '';
    document.getElementById('product-image-url').value = '';
    document.getElementById('product-images').value = '';
    document.getElementById('product-variants').value = '';
    document.getElementById('product-paddle-price-id').value = '';
    document.getElementById('product-preview-links').value = '';
    modalProductTitle.textContent = 'Add product';
    show(modalProduct);
  }

  btnAddProduct.addEventListener('click', openAddProduct);

  formProduct.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = productId.value ? Number(productId.value) : null;
    const imagesRaw = document.getElementById('product-images').value.trim();
    const images = imagesRaw ? imagesRaw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : [];
    const variantsRaw = document.getElementById('product-variants').value.trim();
    const variants = variantsRaw ? variantsRaw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 5) : [];
    const imageUrl = document.getElementById('product-image-url').value.trim() || null;
    const payload = {
      name_ar: document.getElementById('product-name-ar').value,
      name_en: document.getElementById('product-name-en').value,
      emoji: document.getElementById('product-emoji').value || '✨',
      category: document.getElementById('product-category').value,
      price: parseFloat(document.getElementById('product-price').value) || 0,
      description: document.getElementById('product-description').value || null,
      image_url: imageUrl,
      images,
      variants,
      paddle_price_id: document.getElementById('product-paddle-price-id').value.trim() || null,
      preview_links: document.getElementById('product-preview-links').value.trim() || null,
    };
    const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
    const method = id ? 'PUT' : 'POST';
    api(url, { method, body: JSON.stringify(payload) })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          alert(data.error);
          return;
        }
        hide(modalProduct);
        loadProducts();
      })
      .catch(() => alert('Request failed.'));
  });

  btnCancelProduct.addEventListener('click', () => hide(modalProduct));

  function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    api(`/api/admin/products/${id}`, { method: 'DELETE' })
      .then((r) => r.json())
      .then(() => loadProducts())
      .catch(() => alert('Delete failed.'));
  }

  function loadOrders() {
    api('/api/admin/orders')
      .then((r) => r.json())
      .then((orders) => {
        if (!orders.length) {
          ordersTbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:2rem">No orders yet</td></tr>';
          return;
        }
        ordersTbody.innerHTML = orders.map((o) => {
          let items = [];
          try { items = JSON.parse(o.items); } catch (_) {}
          const itemList = items.map((i) => `${i.name}${i.variant ? ` [${i.variant}]` : ''} x${i.qty}`).join(', ');
          return `
            <tr>
              <td>#${o.id}</td>
              <td><span class="initials-badge" style="width:32px;height:32px;font-size:0.7rem;display:inline-flex">${escapeHtml(o.customer_initials || '')}</span></td>
              <td>${escapeHtml(o.customer_name)}</td>
              <td>${escapeHtml(o.customer_email)}</td>
              <td>${escapeHtml(itemList)}</td>
              <td>$${Number(o.total).toFixed(2)}</td>
              <td>${escapeHtml(o.status)}</td>
              <td class="actions">
                <select class="order-status-select" data-id="${o.id}" style="padding:0.3rem 0.5rem;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem">
                  <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                  <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                  <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Completed</option>
                  <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
              </td>
            </tr>`;
        }).join('');
        ordersTbody.querySelectorAll('.order-status-select').forEach((sel) => {
          sel.addEventListener('change', () => {
            api(`/api/admin/orders/${sel.dataset.id}`, { method: 'PUT', body: JSON.stringify({ status: sel.value }) })
              .then((r) => r.json())
              .then(() => loadOrders());
          });
        });
      });
  }

  btnChangePassword.addEventListener('click', () => {
    passwordError.textContent = '';
    passwordSuccess.textContent = '';
    hide(passwordError);
    hide(passwordSuccess);
    formPassword.reset();
    show(modalPassword);
  });

  btnCancelPassword.addEventListener('click', () => hide(modalPassword));

  formPassword.addEventListener('submit', (e) => {
    e.preventDefault();
    hide(passwordError);
    hide(passwordSuccess);
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;
    if (newPass !== confirmPass) {
      passwordError.textContent = 'New password and confirmation do not match.';
      show(passwordError);
      return;
    }
    api('/api/admin/password', {
      method: 'PUT',
      body: JSON.stringify({
        currentPassword: document.getElementById('current-password').value,
        newPassword: newPass,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          passwordError.textContent = data.error;
          show(passwordError);
          return;
        }
        passwordSuccess.textContent = 'Password updated.';
        show(passwordSuccess);
        formPassword.reset();
        setTimeout(() => {
          hide(modalPassword);
        }, 1500);
      })
      .catch(() => {
        passwordError.textContent = 'Request failed.';
        show(passwordError);
      });
  });

  checkAuth();
})();
