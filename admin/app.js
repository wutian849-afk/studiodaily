/* ============================================
   STUDIO DAILY — Admin App (Full eCommerce Backend)
   ============================================ */

// ─── CONFIGURATION ─────────────────────────
const CONFIG = {
  owner: 'wutian849-afk',
  repo: 'studiodaily',
  branch: 'main',
  adminPassword: 'admin123',
  token: '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'
};

const BASE = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents`;

// ─── STATE ─────────────────────────────────
let state = {
  products: [], productsSha: null,
  orders: [], ordersSha: null,
  customers: [], customersSha: null,
  settings: {
    storeName: 'STUDIO DAILY',
    paypalEmail: 'jingm1658@gmail.com',
    currency: 'USD',
    theme: { primary: '#2C2C2C', accent: '#9C8B7A', background: '#FAF8F5', text: '#1a1a1a' },
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
  }, settingsSha: null,
  revenueChart: null,
  topProductsChart: null
};

// ─── GITHUB API HELPERS ────────────────────
function hdrs() {
  const h = { 'Accept': 'application/vnd.github.v3+json' };
  if (CONFIG.token) h['Authorization'] = `Bearer ${CONFIG.token}`;
  return h;
}

async function getJSON(path) {
  const url = `${BASE}/${encodeURIComponent(path)}?ref=${CONFIG.branch}`;
  const r = await fetch(url, { headers: hdrs() });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Fetch error: ${r.status}`);
  const d = await r.json();
  return { content: JSON.parse(atob(d.content)), sha: d.sha };
}

async function putJSON(path, data, sha) {
  const url = `${BASE}/${encodeURIComponent(path)}`;
  const body = {
    message: `Update ${path}`,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
    branch: CONFIG.branch
  };
  if (sha) body.sha = sha;
  const r = await fetch(url, {
    method: 'PUT',
    headers: { ...hdrs(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const res = await r.json();
  if (!r.ok) throw new Error(res.message || `Save error: ${r.status}`);
  return res;
}

// ─── TOAST ─────────────────────────────────
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ─── AUTH ──────────────────────────────────
function login() {
  const pw = document.getElementById('loginPassword').value;
  if (pw === CONFIG.adminPassword) {
    sessionStorage.setItem('sd_admin', '1');
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    loadAll();
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
}
function logout() {
  sessionStorage.removeItem('sd_admin');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginPassword').value = '';
}

// ─── LOAD ALL DATA ─────────────────────────
async function loadAll() {
  try {
    const [pRes, oRes, cRes, sRes] = await Promise.all([
      getJSON('data/products.json'),
      getJSON('data/orders.json'),
      getJSON('data/customers.json'),
      getJSON('data/settings.json')
    ]);
    if (pRes) { state.products = pRes.content.products || []; state.productsSha = pRes.sha; }
    if (oRes) { state.orders = oRes.content.orders || []; state.ordersSha = oRes.sha; }
    if (cRes) { state.customers = cRes.content.customers || []; state.customersSha = cRes.sha; }
    if (sRes) { state.settings = deepMerge(state.settings, sRes.content); state.settingsSha = sRes.sha; }
    renderAll();
  } catch (e) {
    toast('Failed to load data: ' + e.message, 'error');
  }
}

function deepMerge(a, b) {
  const o = JSON.parse(JSON.stringify(a));
  for (const k in b) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) {
      o[k] = deepMerge(o[k] || {}, b[k]);
    } else {
      o[k] = b[k];
    }
  }
  return o;
}

// ─── NAVIGATION ────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelector(`.sidebar-nav a[data-page="${name}"]`).classList.add('active');
  const titles = {
    dashboard: 'Dashboard', orders: 'Orders', products: 'Products',
    customers: 'Customers', discounts: 'Discounts', shipping: 'Shipping', settings: 'Settings'
  };
  document.getElementById('pageTitle').textContent = titles[name] || name;
  if (name === 'dashboard') renderDashboard();
  if (name === 'orders') renderOrders();
  if (name === 'products') renderProducts();
  if (name === 'customers') renderCustomers();
  if (name === 'discounts') renderCoupons();
  if (name === 'shipping') renderShipping();
  if (name === 'settings') renderSettingsForm();
}

function renderAll() {
  renderDashboard();
  renderOrders();
  renderProducts();
  renderCustomers();
  renderCoupons();
  renderShipping();
  renderSettingsForm();
}

// =====================================================================
// DASHBOARD
// =====================================================================
function renderDashboard() {
  const orders = state.orders;
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const totalCustomers = state.customers.length;

  // Orders today, this week, this month
  const now = new Date();
  const todayStr = now.toDateString();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);

  const todayOrders = orders.filter(o => new Date(o.date).toDateString() === todayStr).length;
  const todayRevenue = orders.filter(o => new Date(o.date).toDateString() === todayStr).reduce((s, o) => s + (o.total || 0), 0);
  const weekOrders = orders.filter(o => new Date(o.date) >= weekAgo).length;
  const weekRevenue = orders.filter(o => new Date(o.date) >= weekAgo).reduce((s, o) => s + (o.total || 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card"><div class="stat-value">$${totalRevenue.toFixed(2)}</div><div class="stat-label">Total Revenue</div></div>
    <div class="stat-card"><div class="stat-value">${totalOrders}</div><div class="stat-label">Total Orders</div></div>
    <div class="stat-card"><div class="stat-value">${totalCustomers}</div><div class="stat-label">Customers</div></div>
    <div class="stat-card"><div class="stat-value">${pendingOrders}</div><div class="stat-label">Pending / Processing</div><div class="stat-change ${pendingOrders > 0 ? 'up' : ''}">${pendingOrders > 0 ? '⚠ Needs attention' : '✔ All clear'}</div></div>
    <div class="stat-card"><div class="stat-value">$${todayRevenue.toFixed(2)}</div><div class="stat-label">Today</div><div class="stat-change">${todayOrders} order(s)</div></div>
    <div class="stat-card"><div class="stat-value">$${weekRevenue.toFixed(2)}</div><div class="stat-label">This Week</div><div class="stat-change">${weekOrders} order(s)</div></div>
  `;

  // Revenue chart (last 7 days)
  const days = [];
  const revs = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const ds = d.toDateString();
    days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    revs.push(orders.filter(o => new Date(o.date).toDateString() === ds).reduce((s, o) => s + (o.total || 0), 0));
  }

  const ctx = document.getElementById('revenueChart');
  if (state.revenueChart) state.revenueChart.destroy();
  state.revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Revenue ($)',
        data: revs,
        borderColor: '#2C2C2C',
        backgroundColor: 'rgba(44,44,44,0.06)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#2C2C2C'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
        x: { grid: { display: false } }
      }
    }
  });

  // Top products
  const productSales = {};
  orders.forEach(o => {
    (o.items || []).forEach(item => {
      const n = item.name || 'Unknown';
      productSales[n] = (productSales[n] || 0) + (item.qty || 1);
    });
  });
  const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
  document.getElementById('topProductsList').innerHTML = topProducts.length
    ? topProducts.map(([name, qty], i) =>
        `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
          <span>${i + 1}. ${name}</span>
          <span style="font-weight:600">${qty} sold</span>
        </div>`
      ).join('')
    : '<p style="font-size:13px;color:var(--text-light)">No sales yet</p>';

  // Recent orders
  const recent = orders.slice(-5).reverse();
  document.getElementById('recentOrdersTable').innerHTML = recent.length
    ? `<table>
        <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>${recent.map(o => `
          <tr onclick="openOrderDetail('${o.id}')" style="cursor:pointer">
            <td>#${o.id}</td>
            <td>${o.customerName || '—'}</td>
            <td>${(o.items || []).length} item(s)</td>
            <td>$${(o.total || 0).toFixed(2)}</td>
            <td><span class="badge badge-${o.status || 'pending'}">${o.status || 'pending'}</span></td>
            <td>${o.date ? new Date(o.date).toLocaleDateString() : '—'}</td>
          </tr>`).join('')}</tbody>
      </table>`
    : '<p style="font-size:13px;color:var(--text-light)">No orders yet</p>';
}

// =====================================================================
// ORDERS
// =====================================================================
function renderOrders() {
  const filter = document.getElementById('orderStatusFilter').value;
  const filtered = filter === 'all' ? state.orders : state.orders.filter(o => o.status === filter);
  const sorted = [...filtered].reverse();

  document.getElementById('ordersTableBody').innerHTML = sorted.length
    ? sorted.map(o => `
      <tr>
        <td>#${o.id}</td>
        <td>${o.customerName || '—'}<br><small style="color:var(--text-light)">${o.customerEmail || ''}</small></td>
        <td>${(o.items || []).length} item(s)<br><small style="color:var(--text-light)">$${(o.total || 0).toFixed(2)}</small></td>
        <td>$${(o.total || 0).toFixed(2)}</td>
        <td>${o.paymentMethod || 'PayPal'}</td>
        <td><span class="badge badge-${o.status || 'pending'}">${o.status || 'pending'}</span></td>
        <td>${o.date ? new Date(o.date).toLocaleDateString() : '—'}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openOrderDetail('${o.id}')">View</button>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="8" class="empty-state"><p>No orders found</p></td></tr>';
}

let currentOrderId = null;

function openOrderDetail(id) {
  const o = state.orders.find(x => x.id === id);
  if (!o) return;
  currentOrderId = id;

  document.getElementById('odCustomerName').textContent = o.customerName || '—';
  document.getElementById('odCustomerEmail').textContent = o.customerEmail || '—';
  document.getElementById('odCustomerPhone').textContent = o.customerPhone || '—';
  document.getElementById('odAddress').innerHTML =
    [o.shippingAddress?.line1, o.shippingAddress?.line2, o.shippingAddress?.city,
     o.shippingAddress?.state, o.shippingAddress?.zip, o.shippingAddress?.country]
    .filter(Boolean).join(', ') || '—';

  document.getElementById('odItems').innerHTML = (o.items || []).map(item =>
    `<div class="item"><span>${item.name || 'Item'} × ${item.qty || 1}</span><span>$${((item.price || 0) * (item.qty || 1)).toFixed(2)}</span></div>`
  ).join('');

  document.getElementById('odShippingMethod').textContent = `Shipping: ${o.shippingMethod || 'Standard'}`;
  document.getElementById('odTotal').textContent = `$${(o.total || 0).toFixed(2)}`;
  document.getElementById('odStatusSelect').value = o.status || 'pending';
  document.getElementById('odTracking').value = o.trackingNumber || '';

  document.getElementById('orderDetailModal').classList.add('show');
}

async function updateOrderDetail() {
  const o = state.orders.find(x => x.id === currentOrderId);
  if (!o) return;
  o.status = document.getElementById('odStatusSelect').value;
  o.trackingNumber = document.getElementById('odTracking').value.trim();

  try {
    await putJSON('data/orders.json', { orders: state.orders }, state.ordersSha);
    const result = await getJSON('data/orders.json');
    if (result) { state.orders = result.content.orders || []; state.ordersSha = result.sha; }
    document.getElementById('orderDetailModal').classList.remove('show');
    renderOrders();
    toast('Order updated!');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

// =====================================================================
// PRODUCTS
// =====================================================================
function renderProducts() {
  const q = (document.getElementById('productSearch').value || '').toLowerCase();
  const filtered = q
    ? state.products.filter(p => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q))
    : state.products;

  const grid = document.getElementById('productGrid');
  grid.innerHTML = filtered.length
    ? filtered.map(p => `
      <div class="product-card-admin">
        <img src="${p.image || 'https://via.placeholder.com/400x500?text=No+Image'}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/400x500?text=No+Image'">
        <div class="info">
          <h4>${p.name}</h4>
          <div class="price">$${(p.price || 0).toFixed(2)}</div>
          <div class="meta">${p.category || ''} · ${(p.sku || 'No SKU')} · Stock: ${p.stock ?? '—'}</div>
        </div>
        <div class="actions">
          <button class="btn btn-secondary btn-sm" onclick="openProductModal('${p.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Delete</button>
        </div>
      </div>
    `).join('')
    : '<div class="empty-state"><p>No products found</p></div>';
}

let editingProductId = null;

function openProductModal(id) {
  editingProductId = id;
  const p = id ? state.products.find(x => x.id === id) : null;
  document.getElementById('productModalTitle').textContent = p ? 'Edit Product' : 'Add Product';
  document.getElementById('prodName').value = p ? p.name : '';
  document.getElementById('prodDesc').value = p ? (p.description || '') : '';
  document.getElementById('prodPrice').value = p ? p.price : '';
  document.getElementById('prodImage').value = p ? (p.image || '') : '';
  document.getElementById('prodSizes').value = p ? (p.sizes || []).join(', ') : '';
  document.getElementById('prodColors').value = p ? (p.colors || []).join(', ') : '';
  document.getElementById('prodStock').value = p ? (p.stock ?? 50) : 50;
  document.getElementById('prodSku').value = p ? (p.sku || '') : '';

  // Set category
  const catSelect = document.getElementById('prodCategory');
  if (p && p.category) {
    catSelect.value = p.category;
  } else {
    catSelect.value = 'Dresses';
  }

  document.getElementById('productModal').classList.add('show');
}

async function saveProduct() {
  const name = document.getElementById('prodName').value.trim();
  const description = document.getElementById('prodDesc').value.trim();
  const price = parseFloat(document.getElementById('prodPrice').value);
  const category = document.getElementById('prodCategory').value;
  const image = document.getElementById('prodImage').value.trim();
  const sizes = document.getElementById('prodSizes').value.split(',').map(s => s.trim()).filter(Boolean);
  const colors = document.getElementById('prodColors').value.split(',').map(s => s.trim()).filter(Boolean);
  const stock = parseInt(document.getElementById('prodStock').value) || 0;
  const sku = document.getElementById('prodSku').value.trim();

  if (!name || !price) { toast('Name and price required.', 'error'); return; }

  try {
    if (editingProductId) {
      const idx = state.products.findIndex(p => p.id === editingProductId);
      if (idx > -1) {
        state.products[idx] = { ...state.products[idx], name, description, price, category, image, sizes, colors, stock, sku };
      }
    } else {
      state.products.push({
        id: 'p' + Date.now(),
        name, description, price, category, image, sizes, colors, stock, sku,
        inStock: stock > 0,
        createdAt: new Date().toISOString()
      });
    }

    await putJSON('data/products.json', { products: state.products }, state.productsSha);
    const result = await getJSON('data/products.json');
    if (result) { state.products = result.content.products || []; state.productsSha = result.sha; }
    closeModal('productModal');
    renderProducts();
    toast(editingProductId ? 'Product updated!' : 'Product added!');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  try {
    state.products = state.products.filter(p => p.id !== id);
    await putJSON('data/products.json', { products: state.products }, state.productsSha);
    const result = await getJSON('data/products.json');
    if (result) { state.products = result.content.products || []; state.productsSha = result.sha; }
    renderProducts();
    toast('Product deleted.');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

// =====================================================================
// CUSTOMERS
// =====================================================================
function renderCustomers() {
  const q = (document.getElementById('customerSearch').value || '').toLowerCase();
  const filtered = q
    ? state.customers.filter(c => (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q))
    : state.customers;

  document.getElementById('customersTableBody').innerHTML = filtered.length
    ? filtered.map(c => `
      <tr>
        <td>${c.name || '—'}</td>
        <td>${c.email || '—'}</td>
        <td>${c.orders || 0}</td>
        <td>$${(c.totalSpent || 0).toFixed(2)}</td>
        <td>${c.lastOrder ? new Date(c.lastOrder).toLocaleDateString() : '—'}</td>
        <td>${c.firstOrder ? new Date(c.firstOrder).toLocaleDateString() : '—'}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="6" class="empty-state"><p>No customers yet</p></td></tr>';
}

// =====================================================================
// DISCOUNTS / COUPONS
// =====================================================================
function renderCoupons() {
  const coupons = state.settings.coupons || [];
  document.getElementById('couponsTableBody').innerHTML = coupons.length
    ? coupons.map((c, i) => {
        const expired = c.expires && new Date(c.expires) < new Date();
        const maxed = c.maxUses && (c.usedCount || 0) >= c.maxUses;
        const status = expired || maxed ? 'inactive' : 'active';
        return `
        <tr>
          <td><span class="coupon-code">${c.code}</span></td>
          <td>${c.type === 'percentage' ? '% Off' : '$ Off'}</td>
          <td>${c.type === 'percentage' ? c.value + '%' : '$' + c.value}</td>
          <td>${c.minOrder ? '$' + c.minOrder : 'None'}</td>
          <td>${c.usedCount || 0}${c.maxUses ? '/' + c.maxUses : ''}</td>
          <td>${c.maxUses || '∞'}</td>
          <td>${c.expires ? new Date(c.expires).toLocaleDateString() : 'Never'}</td>
          <td><span class="badge badge-${status === 'active' ? 'delivered' : 'cancelled'}">${status}</span></td>
          <td><button class="btn btn-danger btn-sm" onclick="deleteCoupon(${i})">Delete</button></td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="9" class="empty-state"><p>No coupons yet — create one!</p></td></tr>';
}

function openCouponModal() {
  document.getElementById('cpType').value = 'percentage';
  document.getElementById('cpValue').value = '';
  document.getElementById('cpMinOrder').value = '';
  document.getElementById('cpMaxUses').value = '100';
  document.getElementById('cpCustomCode').value = '';
  document.getElementById('couponModal').classList.add('show');
}

async function saveCoupon() {
  const type = document.getElementById('cpType').value;
  const value = parseFloat(document.getElementById('cpValue').value);
  const minOrder = parseFloat(document.getElementById('cpMinOrder').value) || 0;
  const maxUses = parseInt(document.getElementById('cpMaxUses').value) || 100;
  let code = document.getElementById('cpCustomCode').value.trim().toUpperCase();

  if (!value) { toast('Please enter a value.', 'error'); return; }
  if (!code) code = generateCouponCode();

  if (!state.settings.coupons) state.settings.coupons = [];
  state.settings.coupons.push({
    code, type, value, minOrder, maxUses,
    usedCount: 0,
    createdAt: new Date().toISOString()
  });

  try {
    await putJSON('data/settings.json', state.settings, state.settingsSha);
    const result = await getJSON('data/settings.json');
    if (result) { state.settings = deepMerge(state.settings, result.content); state.settingsSha = result.sha; }
    closeModal('couponModal');
    renderCoupons();
    toast(`Coupon "${code}" created!`);
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

function generateCouponCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function deleteCoupon(idx) {
  if (!confirm('Delete this coupon?')) return;
  state.settings.coupons.splice(idx, 1);
  try {
    await putJSON('data/settings.json', state.settings, state.settingsSha);
    const result = await getJSON('data/settings.json');
    if (result) { state.settings = deepMerge(state.settings, result.content); state.settingsSha = result.sha; }
    renderCoupons();
    toast('Coupon deleted.');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

// =====================================================================
// SHIPPING
// =====================================================================
function renderShipping() {
  const s = state.settings.shipping || state.settings.shipping || {};
  document.getElementById('shipFreeThreshold').value = s.freeThreshold || 50;
  document.getElementById('shipFreeLabel').value = s.freeLabel || 'Free (5-8 business days)';
  const methods = s.methods || [];
  document.getElementById('shipStandardName').value = methods[0]?.name || 'Standard Shipping';
  document.getElementById('shipStandardPrice').value = methods[0]?.price || 5.99;
  document.getElementById('shipPriorityName').value = methods[1]?.name || 'Priority Shipping';
  document.getElementById('shipPriorityPrice').value = methods[1]?.price || 12.99;
  document.getElementById('shipExpressName').value = methods[2]?.name || 'Express Shipping';
  document.getElementById('shipExpressPrice').value = methods[2]?.price || 24.99;

  renderShippingRules();
}

function renderShippingRules() {
  const s = state.settings.shipping || {};
  const methods = s.methods || [];
  document.getElementById('shippingRulesDisplay').innerHTML = `
    <p style="font-size:13px;margin-bottom:8px"><strong>Free Shipping:</strong> Orders over $${s.freeThreshold || 50} → ${s.freeLabel || 'Free'}</p>
    ${methods.map(m => `<p style="font-size:13px;margin-bottom:4px">• ${m.name}: <strong>$${m.price.toFixed(2)}</strong></p>`).join('')}
  `;
}

async function saveShipping() {
  const shipping = {
    freeThreshold: parseFloat(document.getElementById('shipFreeThreshold').value) || 50,
    freeLabel: document.getElementById('shipFreeLabel').value || 'Free',
    methods: [
      { name: document.getElementById('shipStandardName').value, price: parseFloat(document.getElementById('shipStandardPrice').value) || 5.99 },
      { name: document.getElementById('shipPriorityName').value, price: parseFloat(document.getElementById('shipPriorityPrice').value) || 12.99 },
      { name: document.getElementById('shipExpressName').value, price: parseFloat(document.getElementById('shipExpressPrice').value) || 24.99 }
    ]
  };
  state.settings.shipping = shipping;

  try {
    await putJSON('data/settings.json', state.settings, state.settingsSha);
    const result = await getJSON('data/settings.json');
    if (result) { state.settings = deepMerge(state.settings, result.content); state.settingsSha = result.sha; }
    renderShippingRules();
    toast('Shipping settings saved!');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

// =====================================================================
// SETTINGS
// =====================================================================
function renderSettingsForm() {
  document.getElementById('setStoreName').value = state.settings.storeName || 'STUDIO DAILY';
  document.getElementById('setPaypal').value = state.settings.paypalEmail || 'jingm1658@gmail.com';
  document.getElementById('setCurrency').value = state.settings.currency || 'USD';

  const theme = state.settings.theme || {};
  document.getElementById('setPrimary').value = theme.primary || '#2C2C2C';
  document.getElementById('setPrimaryVal').textContent = theme.primary || '#2C2C2C';
  document.getElementById('setAccent').value = theme.accent || '#9C8B7A';
  document.getElementById('setAccentVal').textContent = theme.accent || '#9C8B7A';
  document.getElementById('setBg').value = theme.background || '#FAF8F5';
  document.getElementById('setBgVal').textContent = theme.background || '#FAF8F5';
  document.getElementById('setText').value = theme.text || '#1a1a1a';
  document.getElementById('setTextVal').textContent = theme.text || '#1a1a1a';

  // Color picker live preview
  ['setPrimary','setAccent','setBg','setText'].forEach(id => {
    document.getElementById(id).addEventListener('input', function() {
      document.getElementById(id + 'Val').textContent = this.value;
    });
  });
}

async function saveSettings() {
  // Store info
  state.settings.storeName = document.getElementById('setStoreName').value.trim() || 'STUDIO DAILY';
  state.settings.paypalEmail = document.getElementById('setPaypal').value.trim() || 'jingm1658@gmail.com';
  state.settings.currency = document.getElementById('setCurrency').value;

  // Theme
  state.settings.theme = {
    primary: document.getElementById('setPrimary').value,
    accent: document.getElementById('setAccent').value,
    background: document.getElementById('setBg').value,
    text: document.getElementById('setText').value
  };

  // Password
  const passCurrent = document.getElementById('passCurrent').value;
  const passNew = document.getElementById('passNew').value;
  if (passCurrent || passNew) {
    if (passCurrent === CONFIG.adminPassword && passNew.length >= 4) {
      CONFIG.adminPassword = passNew;
      toast('Password changed!');
    } else if (passCurrent || passNew) {
      toast('Current password incorrect or new password too short.', 'error');
      return;
    }
  }

  try {
    await putJSON('data/settings.json', state.settings, state.settingsSha);
    const result = await getJSON('data/settings.json');
    if (result) { state.settings = deepMerge(state.settings, result.content); state.settingsSha = result.sha; }
    document.getElementById('passCurrent').value = '';
    document.getElementById('passNew').value = '';
    toast('Settings saved!');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

// =====================================================================
// MODALS
// =====================================================================
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('show'); });
});

// =====================================================================
// INIT
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('sd_admin') === '1') {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    loadAll();
  }
});
