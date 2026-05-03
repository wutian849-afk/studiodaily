/* ============================================
   STUDIO DAILY — Store Front (app.js)
   Fetches products from GitHub Pages data files
   Uses PayPal Buy Now buttons
   ============================================ */

// ─── CONFIGURATION ─────────────────────────
const CONFIG = {
  // Base URL for GitHub Pages raw data
  // Change this to your published GitHub Pages URL
  // e.g., 'https://YOUR_USERNAME.github.io/studio-daily-store'
  baseUrl: 'https://aming.github.io/studiodaily',
  // Fallback: try GitHub raw content if baseUrl is empty
  owner: 'aming',
  repo: 'studiodaily',
  branch: 'main'
};

// ─── STATE ─────────────────────────────────
let state = {
  products: [],
  settings: { storeName: 'STUDIO DAILY', paypalEmail: 'jingm1658@gmail.com', currency: 'USD', theme: {} },
  currentCategory: 'all',
  selectedProduct: null,
  selectedSize: '',
  selectedColor: ''
};

// ─── INIT ──────────────────────────────────
async function init() {
  try {
    // Try GitHub Pages first, fallback to raw.githubusercontent.com
    let productsUrl, settingsUrl;

    if (CONFIG.baseUrl) {
      productsUrl = `${CONFIG.baseUrl}/data/products.json`;
      settingsUrl = `${CONFIG.baseUrl}/data/settings.json`;
    } else {
      productsUrl = `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/${CONFIG.branch}/data/products.json`;
      settingsUrl = `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/${CONFIG.branch}/data/settings.json`;
    }

    const [pRes, sRes] = await Promise.all([
      fetch(productsUrl),
      fetch(settingsUrl)
    ]);

    if (pRes.ok) {
      const pData = await pRes.json();
      state.products = pData.products || [];
    }

    if (sRes.ok) {
      const sData = await sRes.json();
      state.settings = { ...state.settings, ...sData };
    }

    // Apply theme
    applyTheme();

    renderProducts();

  } catch (e) {
    console.error('Failed to load store data:', e);
    document.getElementById('productGrid').innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-light);">
        <p style="font-size:18px;margin-bottom:8px;">Unable to load products</p>
        <p style="font-size:14px;">Please check that your data files are published correctly.</p>
      </div>
    `;
  }
}

// ─── APPLY THEME ──────────────────────────
function applyTheme() {
  const t = state.settings.theme || {};
  const root = document.documentElement;
  if (t.primary) root.style.setProperty('--primary', t.primary);
  if (t.background) root.style.setProperty('--bg', t.background);
  if (t.text) root.style.setProperty('--text', t.text);
  if (t.secondary) root.style.setProperty('--secondary', t.secondary);
  if (t.accent) root.style.setProperty('--accent', t.accent);

  // Update page title
  if (state.settings.storeName) {
    document.title = `${state.settings.storeName} — Women's Clothing`;
    const logo = document.querySelector('.header-logo');
    if (logo) logo.textContent = state.settings.storeName;
  }
}

// ─── RENDER PRODUCTS ──────────────────────
function renderProducts(category) {
  const cat = category || state.currentCategory;
  const filtered = cat === 'all'
    ? state.products
    : state.products.filter(p => p.category === cat);

  const grid = document.getElementById('productGrid');

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-light);">
        <p style="font-size:16px;">No products found in this category.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const colorStr = (p.colors || []).slice(0, 4).join(' / ');
    return `
      <div class="product-card" onclick="openProductModal('${p.id}')">
        <div class="image-wrap">
          <img src="${p.image || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=800&fit=crop'}" 
               alt="${p.name}" 
               loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=800&fit=crop'" />
        </div>
        <div class="info">
          <div class="category">${p.category || ''}</div>
          <h3>${p.name}</h3>
          <div class="price">$${(p.price || 0).toFixed(2)}</div>
          ${colorStr ? `<div class="colors">${colorStr}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ─── FILTER ───────────────────────────────
function filterProducts(category) {
  state.currentCategory = category;

  // Update nav
  document.querySelectorAll('.header-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.cat === category);
  });
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === category.toLowerCase() || 
      (category === 'all' && btn.textContent.trim() === 'All'));
  });

  renderProducts(category);

  // Scroll to products
  document.getElementById('productGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── PRODUCT MODAL ────────────────────────
function openProductModal(id) {
  const product = state.products.find(p => p.id === id);
  if (!product) return;

  state.selectedProduct = product;
  state.selectedSize = '';
  state.selectedColor = '';

  const modal = document.getElementById('productModal');

  document.getElementById('modalImage').src = product.image || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=800&fit=crop';
  document.getElementById('modalImage').alt = product.name;
  document.getElementById('modalName').textContent = product.name;
  document.getElementById('modalCategory').textContent = product.category || '';
  document.getElementById('modalPrice').textContent = `$${(product.price || 0).toFixed(2)}`;
  document.getElementById('modalDesc').textContent = product.description || '';

  // Sizes
  const sizeContainer = document.getElementById('sizeOptions');
  sizeContainer.innerHTML = (product.sizes || []).map(s =>
    `<button class="size-btn" onclick="selectSize(this, '${s}')">${s}</button>`
  ).join('');

  // Colors
  const colorContainer = document.getElementById('colorOptions');
  colorContainer.innerHTML = (product.colors || []).map(c => {
    const colorMap = {
      'Black': '#2C2C2C', 'White': '#FFFFFF', 'Navy': '#1B2A4A', 'Cream': '#F5F0E8',
      'Charcoal': '#4A4A4A', 'Sand': '#D4C5B5', 'Ivory': '#FFFFF0', 'Olive': '#6B7D5A',
      'Blush': '#E8C4C4', 'Taupe': '#8B7D6B', 'Camel': '#C19A6B', 'Burgundy': '#6E2C3D',
      'Heather Grey': '#B8B8B8', 'Sage': '#8A9A7A', 'Dusty Rose': '#C4A09A', 'Lavender': '#B8A0C4',
      'Mint': '#A8D4B8', 'Indigo': '#2C3E6B', 'Light Wash': '#8BA8C4', 'Khaki': '#B5A88A',
      'Stone': '#A89888'
    };
    const swatchColor = colorMap[c] || '#ccc';
    return `<button class="color-btn" onclick="selectColor(this, '${c}')"><span class="swatch" style="background:${swatchColor}"></span>${c}</button>`;
  }).join('');

  // Enable/disable PayPal button
  updatePaypalButton();

  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('show');
  document.body.style.overflow = '';
  state.selectedProduct = null;
}

function selectSize(el, size) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedSize = size;
  updatePaypalButton();
}

function selectColor(el, color) {
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedColor = color;
  updatePaypalButton();
}

function updatePaypalButton() {
  const btn = document.getElementById('paypalBtn');
  const product = state.selectedProduct;
  if (!product) return;

  const needsSize = (product.sizes || []).length > 0 && !state.selectedSize;
  const needsColor = (product.colors || []).length > 0 && !state.selectedColor;

  btn.disabled = needsSize || needsColor;
  btn.innerHTML = btn.disabled
    ? '<span>Select options to purchase</span>'
    : `<span>Buy Now with</span>
       <svg viewBox="0 0 36 10" width="48" height="14" fill="#2C2E2F">
         <path d="M5.88 1.62c-.04.2-.06.34-.1.5L5.0 6.1h2.44c.1 0 .2-.02.26-.12.06-.08.04-.18.06-.28l.56-3.58c.02-.1 0-.2-.06-.28-.06-.08-.16-.12-.26-.12H6.0c-.06 0-.12.04-.14.1l.02.8zM9.84 0c-.04.2-.06.34-.1.5L9.0 4.86c-.02.1-.04.2-.1.28-.06.08-.16.12-.26.12H6.22c-.06 0-.12.04-.14.1l-.02.1-.24 1.52c-.02.1 0 .2.06.28.06.08.16.12.26.12h2.12c.1 0 .2-.02.26-.12.06-.08.04-.18.06-.28l.56-3.58c.02-.1 0-.2-.06-.28-.06-.08-.16-.12-.26-.12H8.0c-.06 0-.12.04-.14.1l-.02.8z"/>
       </svg>`;
}

// ─── PAYPAL BUY NOW ───────────────────────
function paypalBuy() {
  const product = state.selectedProduct;
  if (!product) return;

  // Validate selections
  if ((product.sizes || []).length > 0 && !state.selectedSize) {
    alert('Please select a size.');
    return;
  }
  if ((product.colors || []).length > 0 && !state.selectedColor) {
    alert('Please select a color.');
    return;
  }

  const paypalEmail = state.settings.paypalEmail || 'jingm1658@gmail.com';
  const itemName = `${product.name} - ${state.selectedSize || 'OS'} / ${state.selectedColor || 'Standard'}`;
  const price = (product.price || 0).toFixed(2);
  const currency = state.settings.currency || 'USD';

  // Build PayPal purchase form URL
  // PayPal Buy Now button link format:
  const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?` +
    `cmd=_xclick&` +
    `business=${encodeURIComponent(paypalEmail)}&` +
    `item_name=${encodeURIComponent(itemName)}&` +
    `amount=${price}&` +
    `currency_code=${currency}&` +
    `return=${encodeURIComponent(window.location.href)}&` +
    `cancel_return=${encodeURIComponent(window.location.href)}`;

  // Also record the order in the system (via tracking link)
  // We can't write to GitHub from the store front directly,
  // but we open PayPal for the transaction
  window.open(paypalUrl, '_blank');

  // Close modal after purchase initiation
  closeProductModal();
}

// ─── CLOSE MODAL ON OVERLAY CLICK ─────────
document.getElementById('productModal').addEventListener('click', function(e) {
  if (e.target === this) closeProductModal();
});

// ─── ESC KEY ──────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeProductModal();
});

// ─── START ────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
