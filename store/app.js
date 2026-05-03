/* ============================================
   STUDIO DAILY — Store Front (Full eCommerce)
   ============================================ */

const CONFIG = {
  baseUrl: 'https://wutian849-afk.github.io/studiodaily',
  owner: 'wutian849-afk',
  repo: 'studiodaily',
  branch: 'main'
};

// ─── STATE ─────────────────────────────────
let state = {
  products: [],
  settings: {
    storeName: 'STUDIO DAILY',
    paypalEmail: 'jingm1658@gmail.com',
    currency: 'USD',
    theme: {},
    shipping: {
      freeThreshold: 50,
      freeLabel: 'Free (5-8 business days)',
      methods: [
        { name: 'Standard Shipping', price: 5.99 },
        { name: 'Priority Shipping', price: 12.99 },
        { name: 'Express Shipping', price: 24.99 }
      ]
    },
    coupons: []
  },
  currentCategory: 'all',
  selectedProduct: null,
  selectedSize: '',
  selectedColor: '',
  modalQty: 1,
  cart: [],
  selectedShipping: 0,
  appliedCoupon: null,
  checkoutData: null
};

// ─── INIT ──────────────────────────────────
async function init() {
  try {
    const base = CONFIG.baseUrl;
    const [pRes, sRes] = await Promise.all([
      fetch(`${base}/data/products.json`),
      fetch(`${base}/data/settings.json`)
    ]);

    if (pRes.ok) {
      const pData = await pRes.json();
      state.products = pData.products || [];
    }
    if (sRes.ok) {
      const sData = await sRes.json();
      Object.assign(state.settings, sData);
    }

    applyTheme();
    renderNav();
    renderFilters();
    renderProducts();
    renderCart();

    // Load cart from localStorage
    const saved = localStorage.getItem('sd_cart');
    if (saved) {
      try { state.cart = JSON.parse(saved); renderCart(); } catch(e) {}
    }

  } catch (e) {
    console.error('Failed to load:', e);
    document.getElementById('productGrid').innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-light)"><p>Unable to load products. Please check back later.</p></div>';
  }
}

// ─── THEME ─────────────────────────────────
function applyTheme() {
  const t = state.settings.theme || {};
  const root = document.documentElement;
  if (t.primary) root.style.setProperty('--primary', t.primary);
  if (t.background) root.style.setProperty('--bg', t.background);
  if (t.text) root.style.setProperty('--text', t.text);
  if (t.secondary) root.style.setProperty('--secondary', t.secondary);
  if (t.accent) root.style.setProperty('--accent', t.accent);

  if (state.settings.storeName) {
    document.title = `${state.settings.storeName} — Women's Clothing`;
    document.querySelectorAll('#storeLogo').forEach(el => el.textContent = state.settings.storeName);
  }
}

// ─── NAV ───────────────────────────────────
function renderNav() {
  const cats = [...new Set(state.products.map(p => p.category).filter(Boolean))];
  document.getElementById('headerNav').innerHTML = `
    <a onclick="filterProducts('all')" class="${state.currentCategory === 'all' ? 'active' : ''}">All</a>
    ${cats.map(c => `<a onclick="filterProducts('${c}')" class="${state.currentCategory === c ? 'active' : ''}">${c}</a>`).join('')}
  `;
}

function renderFilters() {
  const cats = [...new Set(state.products.map(p => p.category).filter(Boolean))];
  document.getElementById('filterBar').innerHTML = `
    <button class="filter-btn ${state.currentCategory === 'all' ? 'active' : ''}" onclick="filterProducts('all')">All</button>
    ${cats.map(c => `<button class="filter-btn ${state.currentCategory === c ? 'active' : ''}" onclick="filterProducts('${c}')">${c}</button>`).join('')}
  `;
}

// ─── PRODUCTS ──────────────────────────────
function renderProducts(category) {
  const cat = category || state.currentCategory;
  const filtered = cat === 'all'
    ? state.products : state.products.filter(p => p.category === cat);

  const grid = document.getElementById('productGrid');
  if (!filtered.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-light)"><p>No products found.</p></div>';
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const colorStr = (p.colors || []).slice(0, 3).join(' / ');
    return `
      <div class="product-card" onclick="openProductModal('${p.id}')">
        <div class="image-wrap">
          <img src="${p.image || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=800&fit=crop'}"
               alt="${p.name}" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=800&fit=crop'">
        </div>
        <div class="info">
          <div class="category">${p.category || ''}</div>
          <h3>${p.name}</h3>
          <div class="price">$${(p.price || 0).toFixed(2)}</div>
          ${colorStr ? `<div class="colors">${colorStr}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

function filterProducts(category) {
  state.currentCategory = category;
  renderNav();
  renderFilters();
  renderProducts(category);
  document.getElementById('productSection').scrollIntoView({ behavior: 'smooth' });
}

function showHome() {
  document.getElementById('checkoutPage').classList.remove('show');
  document.getElementById('thankyouPage').classList.remove('show');
  document.getElementById('heroSection').style.display = 'block';
  document.getElementById('productSection').style.display = 'block';
  document.getElementById('header').style.display = 'block';
}

// ─── PRODUCT MODAL ─────────────────────────
function openProductModal(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;

  state.selectedProduct = p;
  state.selectedSize = '';
  state.selectedColor = '';
  state.modalQty = 1;

  document.getElementById('modalImage').src = p.image || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=800&fit=crop';
  document.getElementById('modalImage').alt = p.name;
  document.getElementById('modalName').textContent = p.name;
  document.getElementById('modalCategory').textContent = p.category || '';
  document.getElementById('modalPrice').textContent = `$${(p.price || 0).toFixed(2)}`;
  document.getElementById('modalDesc').textContent = p.description || '';
  document.getElementById('modalQty').textContent = '1';

  // Sizes
  const sizeHtml = (p.sizes || []).map(s =>
    `<button class="size-btn" onclick="selectSize(this, '${s}')">${s}</button>`
  ).join('');
  document.getElementById('sizeOptions').innerHTML = sizeHtml || '<p style="font-size:12px;color:var(--text-light)">One size</p>';

  // Colors with swatches
  const colorMap = {
    'Black':'#2C2C2C','White':'#FFFFFF','Navy':'#1B2A4A','Cream':'#F5F0E8',
    'Charcoal':'#4A4A4A','Sand':'#D4C5B5','Ivory':'#FFFFF0','Olive':'#6B7D5A',
    'Blush':'#E8C4C4','Taupe':'#8B7D6B','Camel':'#C19A6B','Burgundy':'#6E2C3D',
    'Heather Grey':'#B8B8B8','Sage':'#8A9A7A','Dusty Rose':'#C4A09A','Lavender':'#B8A0C4',
    'Mint':'#A8D4B8','Indigo':'#2C3E6B','Light Wash':'#8BA8C4','Khaki':'#B5A88A','Stone':'#A89888'
  };
  const colorHtml = (p.colors || []).map(c =>
    `<button class="color-btn" onclick="selectColor(this, '${c}')">
      <span class="swatch" style="background:${colorMap[c] || '#ccc'}"></span>${c}
    </button>`
  ).join('');
  document.getElementById('colorOptions').innerHTML = colorHtml || '<p style="font-size:12px;color:var(--text-light)">Standard</p>';

  updateAddToCartBtn();
  document.getElementById('productModal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('show');
  document.body.style.overflow = '';
}

function selectSize(el, size) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedSize = size;
  updateAddToCartBtn();
}

function selectColor(el, color) {
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedColor = color;
  updateAddToCartBtn();
}

function changeQty(delta) {
  state.modalQty = Math.max(1, Math.min(10, state.modalQty + delta));
  document.getElementById('modalQty').textContent = state.modalQty;
}

function updateAddToCartBtn() {
  const p = state.selectedProduct;
  if (!p) return;
  const needsSize = (p.sizes || []).length > 0 && !state.selectedSize;
  const needsColor = (p.colors || []).length > 0 && !state.selectedColor;
  const btn = document.getElementById('addToCartBtn');
  btn.disabled = needsSize || needsColor;
  btn.textContent = btn.disabled ? 'Select Size & Color' : 'Add to Cart';
}

function addToCart() {
  const p = state.selectedProduct;
  if (!p) return;

  const needsSize = (p.sizes || []).length > 0 && !state.selectedSize;
  const needsColor = (p.colors || []).length > 0 && !state.selectedColor;
  if (needsSize || needsColor) return;

  const existing = state.cart.findIndex(item =>
    item.id === p.id && item.size === state.selectedSize && item.color === state.selectedColor
  );

  if (existing > -1) {
    state.cart[existing].qty += state.modalQty;
  } else {
    state.cart.push({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.image,
      size: state.selectedSize,
      color: state.selectedColor,
      qty: state.modalQty
    });
  }

  saveCart();
  renderCart();
  closeProductModal();
  openCart();
}

// ─── CART ──────────────────────────────────
function renderCart() {
  const items = state.cart;
  const container = document.getElementById('cartItems');

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const freeThreshold = state.settings.shipping?.freeThreshold || 50;
  const freeEligible = total >= freeThreshold;

  document.getElementById('cartCount').textContent = items.reduce((s, i) => s + i.qty, 0);

  if (!items.length) {
    container.innerHTML = '<div class="cart-empty"><p style="font-size:16px;margin-bottom:4px">Your cart is empty</p><p style="font-size:13px">Browse our collection and add items.</p></div>';
    document.getElementById('cartSubtotal').textContent = '$0.00';
    document.getElementById('cartTotal').textContent = '$0.00';
    document.getElementById('freeShippingMsg').textContent = '';
    document.getElementById('checkoutBtn').disabled = true;
    return;
  }

  container.innerHTML = items.map((item, i) => `
    <div class="cart-item">
      <img src="${item.image || 'https://via.placeholder.com/60x80'}" alt="${item.name}">
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-meta">${item.size || 'OS'} · ${item.color || 'Standard'}</div>
        <div class="item-price">$${(item.price || 0).toFixed(2)}</div>
        <div class="item-qty">
          <button onclick="cartQty(${i}, -1)">−</button>
          <span>${item.qty}</span>
          <button onclick="cartQty(${i}, 1)">+</button>
        </div>
      </div>
      <button class="remove-item" onclick="removeFromCart(${i})">✕</button>
    </div>
  `).join('');

  document.getElementById('cartSubtotal').textContent = `$${total.toFixed(2)}`;
  document.getElementById('cartTotal').textContent = `$${total.toFixed(2)}`;
  document.getElementById('checkoutBtn').disabled = false;

  if (!freeEligible) {
    const left = (freeThreshold - total).toFixed(2);
    document.getElementById('freeShippingMsg').textContent = `Add $${left} more for free shipping ✈`;
  } else {
    document.getElementById('freeShippingMsg').textContent = '✔ You qualify for free shipping!';
  }
}

function cartQty(idx, delta) {
  const item = state.cart[idx];
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  renderCart();
}

function removeFromCart(idx) {
  state.cart.splice(idx, 1);
  saveCart();
  renderCart();
}

function saveCart() {
  localStorage.setItem('sd_cart', JSON.stringify(state.cart));
}

function openCart() {
  document.getElementById('cartOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartOverlay').classList.remove('show');
  document.body.style.overflow = '';
}

// ─── CHECKOUT ──────────────────────────────
function goToCheckout() {
  if (!state.cart.length) return;
  closeCart();
  document.getElementById('heroSection').style.display = 'none';
  document.getElementById('productSection').style.display = 'none';

  // Reset checkout state
  state.selectedShipping = 0;
  state.appliedCoupon = null;
  document.getElementById('couponInput').value = '';
  document.getElementById('couponAppliedMsg').textContent = '';

  renderCheckout();
  document.getElementById('checkoutPage').classList.add('show');
}

function renderCheckout() {
  const shipping = state.settings.shipping || state.settings.shipping || {};
  const methods = shipping.methods || [];
  const freeThreshold = shipping.freeThreshold || 50;
  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const freeEligible = subtotal >= freeThreshold;

  // Shipping options
  let shippingHtml = '';
  methods.forEach((m, i) => {
    const price = freeEligible && i === 0 ? 0 : m.price;
    shippingHtml += `
      <label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer">
        <input type="radio" name="shipping" value="${i}" ${i === state.selectedShipping ? 'checked' : ''} onchange="selectShipping(${i})">
        <div>
          <strong>${m.name}</strong>
          <span style="color:var(--text-light);font-size:12px;margin-left:8px">${freeEligible && i === 0 ? 'Free' : '$' + price.toFixed(2)}</span>
          ${freeEligible && i === 0 ? '<span style="color:var(--success);font-size:11px;margin-left:8px">✔ Free shipping applied</span>' : ''}
        </div>
      </label>`;
  });
  document.getElementById('shippingOptions').innerHTML = shippingHtml;

  // Order items
  document.getElementById('checkoutItems').innerHTML = state.cart.map(item =>
    `<div class="checkout-summary-item"><span>${item.name} × ${item.qty}</span><span>$${(item.price * item.qty).toFixed(2)}</span></div>`
  ).join('');

  updateCheckoutTotal();
}

function selectShipping(idx) {
  state.selectedShipping = idx;
  updateCheckoutTotal();
}

function updateCheckoutTotal() {
  const shipping = state.settings.shipping || {};
  const methods = shipping.methods || [];
  const freeThreshold = shipping.freeThreshold || 50;
  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const freeEligible = subtotal >= freeThreshold;

  let shippingCost = 0;
  if (methods[state.selectedShipping]) {
    shippingCost = freeEligible && state.selectedShipping === 0 ? 0 : methods[state.selectedShipping].price;
  }

  let discount = 0;
  if (state.appliedCoupon) {
    if (state.appliedCoupon.type === 'percentage') {
      discount = subtotal * (state.appliedCoupon.value / 100);
    } else {
      discount = state.appliedCoupon.value;
    }
    discount = Math.min(discount, subtotal);
  }

  const total = subtotal + shippingCost - discount;

  document.getElementById('checkoutShipping').textContent = freeEligible && state.selectedShipping === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`;
  document.getElementById('checkoutTotal').textContent = `$${Math.max(0, total).toFixed(2)}`;
  document.getElementById('discountAmount').textContent = `-$${discount.toFixed(2)}`;
  document.getElementById('checkoutDiscount').style.display = discount > 0 ? 'flex' : 'none';
}

// ─── COUPON ────────────────────────────────
function applyCoupon() {
  const code = document.getElementById('couponInput').value.trim().toUpperCase();
  if (!code) return;

  const coupons = state.settings.coupons || [];
  const coupon = coupons.find(c => c.code === code);

  if (!coupon) {
    document.getElementById('couponAppliedMsg').innerHTML = '<span style="color:var(--danger)">Invalid coupon code</span>';
    return;
  }

  if (coupon.maxUses && (coupon.usedCount || 0) >= coupon.maxUses) {
    document.getElementById('couponAppliedMsg').innerHTML = '<span style="color:var(--danger)">This coupon has expired</span>';
    return;
  }

  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  if (coupon.minOrder && subtotal < coupon.minOrder) {
    document.getElementById('couponAppliedMsg').innerHTML = `<span style="color:var(--danger)">Minimum order $${coupon.minOrder.toFixed(2)} required</span>`;
    return;
  }

  state.appliedCoupon = coupon;
  document.getElementById('couponAppliedMsg').innerHTML = `<span class="coupon-applied">✔ Coupon "${code}" applied!</span>`;
  updateCheckoutTotal();
}

// ─── PLACE ORDER ───────────────────────────
async function placeOrder() {
  // Validate fields
  const email = document.getElementById('coEmail').value.trim();
  const firstName = document.getElementById('coFirstName').value.trim();
  const lastName = document.getElementById('coLastName').value.trim();
  const addr1 = document.getElementById('coAddr1').value.trim();
  const city = document.getElementById('coCity').value.trim();
  const state2 = document.getElementById('coState').value.trim();
  const zip = document.getElementById('coZip').value.trim();

  if (!email || !firstName || !lastName || !addr1 || !city || !state2 || !zip) {
    alert('Please fill in all required fields.');
    return;
  }

  // Calculate totals
  const shipping = state.settings.shipping || {};
  const methods = shipping.methods || [];
  const freeThreshold = shipping.freeThreshold || 50;
  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const freeEligible = subtotal >= freeThreshold;
  let shippingCost = 0;
  if (methods[state.selectedShipping]) {
    shippingCost = freeEligible && state.selectedShipping === 0 ? 0 : methods[state.selectedShipping].price;
  }

  let discount = 0;
  if (state.appliedCoupon) {
    if (state.appliedCoupon.type === 'percentage') {
      discount = subtotal * (state.appliedCoupon.value / 100);
    } else {
      discount = state.appliedCoupon.value;
    }
    discount = Math.min(discount, subtotal);
  }

  const total = Math.max(0, subtotal + shippingCost - discount);
  const orderId = 'SD' + Date.now().toString(36).toUpperCase();

  // Build order object
  const order = {
    id: orderId,
    customerName: `${firstName} ${lastName}`,
    customerEmail: email,
    customerPhone: document.getElementById('coPhone').value.trim(),
    shippingAddress: {
      line1: addr1,
      line2: document.getElementById('coAddr2').value.trim(),
      city, state: state2, zip,
      country: document.getElementById('coCountry').value
    },
    items: state.cart.map(item => ({
      name: `${item.name} (${item.size || 'OS'} / ${item.color || 'Standard'})`,
      price: item.price,
      qty: item.qty
    })),
    shippingMethod: methods[state.selectedShipping]?.name || 'Standard',
    shippingCost,
    subtotal,
    discount,
    couponCode: state.appliedCoupon?.code || null,
    total,
    paymentMethod: 'PayPal',
    status: 'pending',
    trackingNumber: '',
    date: new Date().toISOString()
  };

  // Build PayPal URL
  const paypalEmail = state.settings.paypalEmail || 'jingm1658@gmail.com';
  const itemNames = state.cart.map(i => `${i.name} (${i.size || 'OS'})`).join(', ');
  const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?` +
    `cmd=_xclick&` +
    `business=${encodeURIComponent(paypalEmail)}&` +
    `item_name=${encodeURIComponent(itemNames)}&` +
    `amount=${total.toFixed(2)}&` +
    `currency_code=${state.settings.currency || 'USD'}&` +
    `custom=${encodeURIComponent(orderId)}&` +
    `return=${encodeURIComponent(window.location.origin + window.location.pathname + '?order=' + orderId)}&` +
    `cancel_return=${encodeURIComponent(window.location.href)}`;

  // Try to save order to GitHub (silently)
  try {
    const ordersUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data/orders.json?ref=${CONFIG.branch}`;
    const token = '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';
    const r = await fetch(ordersUrl, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `Bearer ${token}` }
    });
    if (r.ok) {
      const data = await r.json();
      const existingOrders = JSON.parse(atob(data.content));
      existingOrders.orders = existingOrders.orders || [];
      existingOrders.orders.push(order);
      const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(existingOrders, null, 2))));
      await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data/orders.json`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Order ${orderId} placed`,
          content: newContent,
          sha: data.sha,
          branch: CONFIG.branch
        })
      });
    }
  } catch (e) {
    console.error('Failed to save order to GitHub:', e);
    // Order still goes through via PayPal
  }

  // Clear cart
  state.cart = [];
  saveCart();

  // Show thank you
  document.getElementById('checkoutPage').classList.remove('show');
  document.getElementById('thankyouOrderNum').textContent = orderId;
  document.getElementById('thankyouPage').classList.add('show');

  // Open PayPal
  window.open(paypalUrl, '_blank');
}

// ─── URL PARAM CHECK ───────────────────────
(function checkOrderParam() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order');
  if (orderId) {
    document.getElementById('heroSection').style.display = 'none';
    document.getElementById('productSection').style.display = 'none';
    document.getElementById('checkoutPage').classList.remove('show');
    document.getElementById('thankyouOrderNum').textContent = orderId;
    document.getElementById('thankyouPage').classList.add('show');
  }
})();

// ─── START ─────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
