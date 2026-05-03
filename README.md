# STUDIO DAILY — E-Commerce Admin Panel + Store Front

A complete, free e-commerce solution hosted on **GitHub Pages** with **JSON file storage**.

## System Architecture

```
studio-daily-store/
├── admin/
│   ├── index.html    ← Admin panel (login, manage products/orders/customers/settings)
│   └── app.js        ← Admin logic (GitHub API for CRUD operations)
├── store/
│   ├── index.html    ← Customer-facing store front
│   └── app.js        ← Store logic (fetches products, PayPal integration)
├── data/
│   ├── products.json  ← Product catalog
│   ├── orders.json    ← Customer orders
│   ├── customers.json ← Customer records
│   └── settings.json  ← Store settings (name, PayPal email, theme)
└── README.md
```

## Setup Instructions

### 1. Create a GitHub Repository

1. Go to https://github.com/new
2. Repository name: `studio-daily-store` (or your preferred name)
3. Set to **Public**
4. Click "Create repository"

### 2. Upload Files

Upload the folder contents to your repo:
- `admin/` folder
- `store/` folder
- `data/` folder (with all JSON files)

### 3. Configure Files

#### In `admin/app.js` — Update these values:

```javascript
const CONFIG = {
  owner: 'YOUR_GITHUB_USERNAME',    // ← Your GitHub username
  repo: 'studio-daily-store',        // ← Your repo name
  branch: 'main',
  adminPassword: 'admin123',         // ← Change this!
  token: ''                          // ← Add your GitHub token (see below)
};
```

#### Generate a GitHub Personal Access Token (for admin panel):
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: `studio-daily-admin`
4. Scopes: check `repo` (full control)
5. Click "Generate token"
6. **Copy the token now** — paste it into `CONFIG.token` in `admin/app.js`

#### In `store/app.js` — Update these values:

```javascript
const CONFIG = {
  baseUrl: 'https://YOUR_USERNAME.github.io/studio-daily-store',
  owner: 'YOUR_GITHUB_USERNAME',
  repo: 'studio-daily-store',
  branch: 'main'
};
```

### 4. Enable GitHub Pages

1. Go to repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Click "Save"
5. Wait 1-2 minutes, then your store is live at:
   `https://YOUR_USERNAME.github.io/studio-daily-store/store/`
   
   Admin panel at:
   `https://YOUR_USERNAME.github.io/studio-daily-store/admin/`

### 5. Login to Admin Panel

- Default password: `admin123`
- **Change this immediately** after first login via Settings page

## Features

### Admin Panel (`admin/index.html`)
- **Dashboard** — Overview of products, orders, revenue, customers
- **Products** — Add, edit, delete products with images, sizes, colors
- **Orders** — View all orders, update status (pending/paid/shipped/delivered)
- **Customers** — View customer list with order history
- **Settings** — Change store name, PayPal email, theme colors, admin password

### Store Front (`store/index.html`)
- **Product Grid** — Beautiful responsive layout with product images
- **Category Filtering** — Filter by Dresses, Tops, Bottoms, Outerwear
- **Product Detail Modal** — View full details, select size & color
- **PayPal Buy Now** — Direct PayPal checkout for each product
- **Mobile Responsive** — Works perfectly on phones and tablets

## How It Works

### Data Storage
All data is stored in JSON files in the `data/` folder:
- **Admin panel** reads/writes via **GitHub API** (authenticated with your token)
- **Store front** reads via **GitHub Pages** (public, no auth needed)

### Payment Processing
Payments go directly through **PayPal** — no middleman, no fees beyond PayPal's standard transaction fees (~2.9% + $0.30).

When a customer clicks "Buy Now":
1. They select size and color
2. PayPal opens a checkout form with the product details
3. Payment goes directly to your PayPal account
4. You manually mark orders as "paid" in the admin panel

### Order Tracking
Orders are **not** automatically recorded (PayPal doesn't send webhooks to a static site). You have two options:

**Option A (Manual):** After receiving a PayPal notification email, manually create the order in the admin panel.

**Option B (Advanced):** Set up a free Zapier/IFTTT webhook that detects PayPal payment emails and sends order data to... a separate tracking method.

## Customization

### Changing the Look
Edit the CSS variables in both `admin/index.html` and `store/index.html`:
```css
:root {
  --primary: #9C8B7A;    /* Main brand color */
  --secondary: #D4C5B5;  /* Secondary accent */
  --bg: #FAF8F5;         /* Background color */
  --text: #2C2C2C;       /* Text color */
}
```

Or change them live in the admin panel's Settings page.

### Adding Products via JSON
Edit `data/products.json` directly in GitHub or use the admin panel.

## Important Notes

- **Token security**: Your GitHub token gives write access to your repo. Never share it.
- **No database**: All data is stored in JSON files. For high-traffic stores, consider upgrading.
- **PayPal Personal**: Works fine for small stores. For larger operations, upgrade to PayPal Business.
- **China access**: GitHub Pages can be slow in China. Consider using a CDN or Cloudflare.

## License

Free for personal and commercial use.
