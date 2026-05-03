/* ============================================
   STUDIO DAILY — Admin App (app.js)
   Uses GitHub API to read/write JSON data files
   ============================================ */

// ─── CONFIGURATION ─────────────────────────
// !!! IMPORTANT: Update these with your repo info !!!
const CONFIG = {
  owner: 'wutian849-afk',
  repo: 'studiodaily',
  branch: 'main',
  adminPassword: 'admin123', // change this!
  // GitHub personal access token (classic) with 'repo' scope
  token: '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'
};

const BASE = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents`;

// ─── TOAST ─────────────────────────────────
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ─── GITHUB API HELPERS ────────────────────
function getHeaders() {
  const h = { 'Accept': 'application/vnd.github.v3+json' };
  if (CONFIG.token) h['Authorization'] = `Bearer ${CONFIG.token}`;
  return h;
}

async function fetchJson(path) {
  const url = `${BASE}/${encodeURIComponent(path)}?ref=${CONFIG.branch}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub fetch error: ${res.status}`);
  const data = await res.json();
  const content = atob(data.content);
  return { content: JSON.parse(content), sha: data.sha };
}

async function saveJson(path, data, sha) {
  const url = `${BASE}/${encodeURIComponent(path)}`;
  const body = {
    message: `Update ${path}`,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
    branch: CONFIG.branch
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || `GitHub save error: ${res.status}`);
  return result;
}

// ─── STATE ─────────────────────────────────
let state = {
  products: [],
  orders: [],
  customers: [],
  settings: { storeName: 'STUDIO DAILY', paypalEmail: 'jingm1658@gmail.com', currency: 'USD', theme: { primary: '#9C8B7A', background: '#FAF8F5', text: '#2C2C2C' } },
  productSha: null,
  ordersSha: null,
  customersSha: null,
  settingsSha: null
};

// ─── AUTH ──────────────────────────────────
function login() {
  const pw = document.getElementById('loginPassword').value;
  if (pw === CONFIG.adminPassword) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    loadAllData();
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
}
function logout() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginPassword').value = '';
}
document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

// ─── LOAD ALL DATA ─────────────────────────
async function loadAllData() {
  try {
    const [pRes, oRes, cRes, sRes] = await Promise.all([
      fetchJson('data/products.json'),
      fetchJson('data/orders.json'),
      fetchJson('data/customers.json'),
      fetchJson('data/settings.json')
    ]);

    if (pRes) { state.products = pRes.content.products || []; state.productSha = pRes.sha; }
    if (oRes) { state.orders = oRes.content.orders || []; state.ordersSha = oRes.sha; }
    if (cRes) { state.customers = cRes.content.customers || []; state.customersSha = cRes.sha; }
    if (sRes) { state.settings = { ...state.settings, ...sRes.content }; state.settingsSha = sRes.sha; }

    renderDashboard();
    renderProducts();
    renderOrders();
    renderCustomers();
    renderSettings();
  } catch (e) {
    toast('Failed to load data: ' + e.message, 'error');
  }
}

// ─── NAVIGATION ────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelector(`.sidebar-nav a[data-page="${name}"]`).classList.add('active');
  const titles = { dashboard: 'Dashboard', products: 'Products', orders: 'Orders', customers: 'Customers', settings: 'Settings' };
  document.getElementById('pageTitle').textContent = titles[name] || name;
}

// ─── DASHBOARD ─────────────────────────────
function renderDashboard() {
  const totalProducts = state.products.length;
  const totalOrders = state.orders.length;
  const totalRevenue = state.orders.reduce((s, o) => s + (o.total || 0), 0);
  const totalCustomers = state.customers.length;

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="num">${totalProducts}</div><div class="label">Products</div></div>
    <div class="stat-card"><div class="num">${totalOrders}</div><div class="label">Orders</div></div>
    <div class="stat-card"><div class="num">$${totalRevenue.toFixed(2)}</div><div class="label">Revenue</div></div>
    <div class="stat-card"><div class="num">${totalCustomers}</div><div class="label">Customers</div></div>
  `;

  const recent = state.orders.slice(-5).reverse();
  document.getElementById('recentOrders').innerHTML = recent.map(o => `
    <tr>
      <td>#${o.id || '—'}</td>
      <td>${o.customerName || '—'}</td>
      <td>$${(o.total || 0).toFixed(2)}</td>
      <td><span class="status-badge status-${o.status || 'pending'}">${o.status || 'pending'}</span></td>
      <td>${o.date ? new Date(o.date).toLocaleDateString() : '—'}</td>
    </tr>
  `).join('');
}

// ─── PRODUCTS ──────────────────────────────
function renderProducts() {
  document.getElementById('productCount').textContent = `(${state.products.length})`;
  document.getElementById('productGrid').innerHTML = state.products.map(p => `
    <div class="product-card-admin">
      <img src="${p.image || 'https://via.placeholder.com/300x400?text=No+Image'}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'" />
      <div class="info">
        <h4>${p.name}</h4>
        <div class="price">$${(p.price || 0).toFixed(2)}</div>
        <div class="meta">${p.category || ''} · ${(p.sizes || []).length} sizes</div>
      </div>
      <div class="actions">
        <button class="btn btn-secondary btn-sm" onclick="editProduct('${p.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function openProductModal(prod) {
  document.getElementById('modalTitle').textContent = prod ? 'Edit Product' : 'Add Product';
  document.getElementById('prodId').value = prod ? prod.id : '';
  document.getElementById('prodName').value = prod ? prod.name : '';
  document.getElementById('prodDesc').value = prod ? prod.description : '';
  document.getElementById('prodPrice').value = prod ? prod.price : '';
  document.getElementById('prodCategory').value = prod ? (prod.category || 'Dresses') : 'Dresses';
  document.getElementById('prodImage').value = prod ? (prod.image || '') : '';
  document.getElementById('prodSizes').value = prod ? (prod.sizes || []).join(', ') : '';
  document.getElementById('prodColors').value = prod ? (prod.colors || []).join(', ') : '';
  document.getElementById('productModal').classList.add('show');
}

function editProduct(id) {
  const prod = state.products.find(p => p.id === id);
  if (prod) openProductModal(prod);
}

async function saveProduct() {
  const id = document.getElementById('prodId').value;
  const name = document.getElementById('prodName').value.trim();
  const description = document.getElementById('prodDesc').value.trim();
  const price = parseFloat(document.getElementById('prodPrice').value);
  const category = document.getElementById('prodCategory').value;
  const image = document.getElementById('prodImage').value.trim();
  const sizes = document.getElementById('prodSizes').value.split(',').map(s => s.trim()).filter(Boolean);
  const colors = document.getElementById('prodColors').value.split(',').map(s => s.trim()).filter(Boolean);

  if (!name || !price) { toast('Name and price required.', 'error'); return; }

  try {
    if (id) {
      // Edit existing
      const idx = state.products.findIndex(p => p.id === id);
      if (idx > -1) {
        state.products[idx] = { ...state.products[idx], name, description, price, category, image, sizes, colors };
      }
    } else {
      // Add new
      const newId = 'p' + Date.now();
      state.products.push({
        id: newId, name, description, price, category, image, sizes, colors,
        inStock: true,
        createdAt: new Date().toISOString()
      });
    }

    await saveJson('data/products.json', { products: state.products }, state.productSha);
    const result = await fetchJson('data/products.json');
    if (result) { state.products = result.content.products || []; state.productSha = result.sha; }

    closeModal('productModal');
    renderProducts();
    renderDashboard();
    toast(id ? 'Product updated!' : 'Product added!');
  } catch (e) {
    toast('Error saving: ' + e.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  try {
    state.products = state.products.filter(p => p.id !== id);
    await saveJson('data/products.json', { products: state.products }, state.productSha);
    const result = await fetchJson('data/products.json');
    if (result) { state.products = result.content.products || []; state.productSha = result.sha; }
    renderProducts();
    renderDashboard();
    toast('Product deleted.');
  } catch (e) {
    toast('Error deleting: ' + e.message, 'error');
  }
}

// ─── ORDERS ────────────────────────────────
function renderOrders() {
  document.getElementById('ordersList').innerHTML = state.orders.length
    ? state.orders.slice().reverse().map(o => `
      <tr>
        <td>#${o.id || '—'}</td>
        <td>${o.customerName || '—'}</td>
        <td>${o.customerEmail || '—'}</td>
        <td>${(o.items || []).length} item(s)</td>
        <td>$${(o.total || 0).toFixed(2)}</td>
        <td><span class="status-badge status-${o.status || 'pending'}">${o.status || 'pending'}</span></td>
        <td>${o.date ? new Date(o.date).toLocaleDateString() : '—'}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="openOrderStatusModal('${o.id}')">Update</button></td>
      </tr>
    `).join('')
    : '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-light)">No orders yet.</td></tr>';
}

function openOrderStatusModal(id) {
  document.getElementById('orderEditId').value = id;
  const order = state.orders.find(o => o.id === id);
  document.getElementById('orderEditStatus').value = order ? (order.status || 'pending') : 'pending';
  document.getElementById('orderModal').classList.add('show');
}

async function updateOrderStatus() {
  const id = document.getElementById('orderEditId').value;
  const status = document.getElementById('orderEditStatus').value;
  try {
    const idx = state.orders.findIndex(o => o.id === id);
    if (idx > -1) {
      state.orders[idx].status = status;
      await saveJson('data/orders.json', { orders: state.orders }, state.ordersSha);
      const result = await fetchJson('data/orders.json');
      if (result) { state.orders = result.content.orders || []; state.ordersSha = result.sha; }
      renderOrders();
      renderDashboard();
      toast('Order status updated!');
      closeModal('orderModal');
    }
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

// ─── CUSTOMERS ─────────────────────────────
function renderCustomers() {
  document.getElementById('customersList').innerHTML = state.customers.length
    ? state.customers.map(c => `
      <tr>
        <td>${c.name || '—'}</td>
        <td>${c.email || '—'}</td>
        <td>${c.orders || 0}</td>
        <td>$${(c.totalSpent || 0).toFixed(2)}</td>
        <td>${c.firstOrder ? new Date(c.firstOrder).toLocaleDateString() : '—'}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-light)">No customers yet.</td></tr>';
}

// ─── SETTINGS ──────────────────────────────
function renderSettings() {
  document.getElementById('setStoreName').value = state.settings.storeName || '';
  document.getElementById('setPaypalEmail').value = state.settings.paypalEmail || '';
  document.getElementById('setPrimary').value = (state.settings.theme && state.settings.theme.primary) || '#9C8B7A';
  document.getElementById('setBg').value = (state.settings.theme && state.settings.theme.background) || '#FAF8F5';
  document.getElementById('setText').value = (state.settings.theme && state.settings.theme.text) || '#2C2C2C';
}

async function saveSettings() {
  const storeName = document.getElementById('setStoreName').value.trim();
  const paypalEmail = document.getElementById('setPaypalEmail').value.trim();
  const primary = document.getElementById('setPrimary').value;
  const background = document.getElementById('setBg').value;
  const text = document.getElementById('setText').value.trim();

  // Password change
  const passCurrent = document.getElementById('passCurrent').value;
  const passNew = document.getElementById('passNew').value;
  if (passCurrent || passNew) {
    if (passCurrent === CONFIG.adminPassword && passNew.length >= 4) {
      CONFIG.adminPassword = passNew;
      toast('Password changed!', 'success');
    } else if (passCurrent || passNew) {
      toast('Current password is incorrect or new password too short (min 4).', 'error');
      return;
    }
  }

  try {
    state.settings.storeName = storeName || 'STUDIO DAILY';
    state.settings.paypalEmail = paypalEmail || 'jingm1658@gmail.com';
    state.settings.theme = { primary, secondary: '#D4C5B5', accent: '#4A4A4A', background, text: text || '#2C2C2C' };

    await saveJson('data/settings.json', state.settings, state.settingsSha);
    const result = await fetchJson('data/settings.json');
    if (result) { state.settings = { ...state.settings, ...result.content }; state.settingsSha = result.sha; }

    toast('Settings saved!');
  } catch (e) {
    toast('Error saving settings: ' + e.message, 'error');
  }
}

// ─── MODAL HELPERS ─────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('show'); });
});

// ─── INIT ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Check if already logged in via session
  if (sessionStorage.getItem('sd_admin') === '1') {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    loadAllData();
  }
  // Override login to store session
  const origLogin = login;
  login = function() {
    const pw = document.getElementById('loginPassword').value;
    if (pw === CONFIG.adminPassword) {
      sessionStorage.setItem('sd_admin', '1');
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      loadAllData();
    } else {
      document.getElementById('loginError').style.display = 'block';
    }
  };
  const origLogout = logout;
  logout = function() {
    sessionStorage.removeItem('sd_admin');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    document.getElementById('loginPassword').value = '';
  };
});
