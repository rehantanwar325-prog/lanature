/* ===== LaNature Hotel — Shared Application Logic ===== */

// ─── Default Menu Data (seed) ───
const DEFAULT_MENU_DATA = [
  // Starters
  { id: 1, name: "Paneer Tikka", category: "starters", price: 220, desc: "Creamy marinated cottage cheese, grilled in tandoor", img: "images/paneer-tikka.png", veg: true },
  { id: 2, name: "Veg Spring Rolls", category: "starters", price: 180, desc: "Crispy rolls with fresh vegetables", img: "images/spring-rolls.png", veg: true },
  { id: 3, name: "Chicken Seekh Kebab", category: "starters", price: 280, desc: "Minced chicken with aromatic spices", img: "images/seekh-kebab.png", veg: false },
  // Main Course
  { id: 4, name: "Dal Makhani", category: "main", price: 240, desc: "Slow-cooked black lentils in rich gravy", img: "images/dal-makhani.png", veg: true },
  { id: 5, name: "Butter Chicken", category: "main", price: 320, desc: "Tender chicken in tomato-butter sauce", img: "images/butter-chicken.png", veg: false },
  { id: 6, name: "Paneer Butter Masala", category: "main", price: 260, desc: "Cottage cheese in creamy tomato gravy", img: "images/paneer-butter-masala.png", veg: true },
  { id: 7, name: "Biryani (Veg)", category: "main", price: 280, desc: "Fragrant basmati rice with vegetables", img: "images/veg-biryani.png", veg: true },
  { id: 8, name: "Biryani (Chicken)", category: "main", price: 340, desc: "Aromatic rice with tender chicken", img: "images/chicken-biryani.png", veg: false },
  // Beverages
  { id: 9, name: "Fresh Lime Soda", category: "beverages", price: 80, desc: "Refreshing citrus drink with soda", img: "images/mango-lassi.png", veg: true },
  { id: 10, name: "Mango Lassi", category: "beverages", price: 120, desc: "Cool yogurt drink with fresh mango", img: "images/mango-lassi.png", veg: true },
  { id: 11, name: "Masala Chai", category: "beverages", price: 60, desc: "Aromatic Indian spiced tea", img: "images/dal-makhani.png", veg: true },
  { id: 12, name: "Cold Coffee", category: "beverages", price: 140, desc: "Chilled coffee with ice cream", img: "images/mango-lassi.png", veg: true },
  // Desserts
  { id: 13, name: "Gulab Jamun", category: "desserts", price: 110, desc: "Soft milk dumplings in sugar syrup", img: "images/gulab-jamun.png", veg: true },
  { id: 14, name: "Ice Cream (2 scoops)", category: "desserts", price: 130, desc: "Choice of vanilla / chocolate / mango", img: "images/ice-cream.png", veg: true },
  { id: 15, name: "Rasgulla", category: "desserts", price: 100, desc: "Spongy cottage cheese balls in syrup", img: "images/rasgulla.png", veg: true }
];

// ─── Dynamic Menu (localStorage-backed) ───
function getMenuData() {
  const saved = localStorage.getItem('lanature_menu');
  if (saved) return JSON.parse(saved);
  // First time — seed with defaults
  localStorage.setItem('lanature_menu', JSON.stringify(DEFAULT_MENU_DATA));
  return [...DEFAULT_MENU_DATA];
}

function saveMenuData(data) {
  localStorage.setItem('lanature_menu', JSON.stringify(data));
}

function getNextProductId() {
  const menu = getMenuData();
  return menu.length > 0 ? Math.max(...menu.map(m => m.id)) + 1 : 1;
}

function addProduct(product) {
  const menu = getMenuData();
  product.id = getNextProductId();
  menu.push(product);
  saveMenuData(menu);
  return product;
}

function editProduct(id, updates) {
  const menu = getMenuData();
  const idx = menu.findIndex(m => m.id === id);
  if (idx === -1) return false;
  menu[idx] = { ...menu[idx], ...updates, id };
  saveMenuData(menu);
  return true;
}

function deleteProduct(id) {
  let menu = getMenuData();
  menu = menu.filter(m => m.id !== id);
  saveMenuData(menu);
  return true;
}

// Keep MENU_DATA as a live reference for backward compatibility
const MENU_DATA = getMenuData();

// ─── Cart State ───
let cart = [];

function getCart() { return cart; }

function addToCart(itemId) {
  const item = MENU_DATA.find(i => i.id === itemId);
  if (!item) return;
  const existing = cart.find(c => c.id === itemId);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  updateCartUI();
  showAddedFeedback(itemId);
}

function removeFromCart(itemId) {
  cart = cart.filter(c => c.id !== itemId);
  updateCartUI();
}

function updateQty(itemId, delta) {
  const item = cart.find(c => c.id === itemId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) { removeFromCart(itemId); return; }
  updateCartUI();
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getCartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function showAddedFeedback(itemId) {
  const btn = document.querySelector(`[data-id="${itemId}"] .add-btn`);
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = "✓ Added!";
  btn.style.background = "var(--accent)";
  btn.style.color = "var(--dark)";
  setTimeout(() => {
    btn.textContent = orig;
    btn.style.background = "";
    btn.style.color = "";
  }, 800);
}

// ─── Cart UI ───
function updateCartUI() {
  const badge = document.querySelector('.floating-cart .badge');
  const count = getCartCount();
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
  renderCartSidebar();
}

function renderCartSidebar() {
  const container = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="empty-icon">🛒</div>
        <p>Your cart is empty</p>
        <p style="font-size:0.8rem;">Add some delicious items!</p>
      </div>`;
    if (totalEl) totalEl.textContent = '₹0';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.img}" class="cart-item-img" alt="${item.name}">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <span class="cart-price">₹${item.price * item.qty}</span>
      </div>
      <div class="qty-controls">
        <button class="qty-btn" onclick="updateQty(${item.id}, -1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
      </div>
    </div>
  `).join('');

  if (totalEl) totalEl.textContent = '₹' + getCartTotal();
}

function toggleCart() {
  document.querySelector('.cart-sidebar')?.classList.toggle('open');
  document.querySelector('.cart-overlay')?.classList.toggle('open');
}

// ─── Orders (localStorage) ───
function getOrders() {
  return JSON.parse(localStorage.getItem('lanature_orders') || '[]');
}

function saveOrder(order) {
  const orders = getOrders();
  orders.push(order);
  localStorage.setItem('lanature_orders', JSON.stringify(orders));
}

function updateOrderStatus(orderId, status) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = status;
    localStorage.setItem('lanature_orders', JSON.stringify(orders));
  }
}

function generateOrderId() {
  return Math.floor(1000 + Math.random() * 9000);
}

// ─── URL Params ───
function getUrlParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function getLocationInfo() {
  const table = getUrlParam('table');
  const room = getUrlParam('room');
  if (table) return { type: 'Table', number: table };
  if (room) return { type: 'Room', number: room };
  return { type: 'Table', number: '1' };
}

// ─── Navbar Scroll ───
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
  // Hamburger
  const hamburger = document.querySelector('.nav-hamburger');
  const links = document.querySelector('.nav-links');
  if (hamburger && links) {
    hamburger.addEventListener('click', () => {
      links.classList.toggle('mobile-open');
    });
  }
}

// ─── Place Order Flow ───
function placeOrder(customerName) {
  const loc = getLocationInfo();
  const order = {
    id: generateOrderId(),
    customer: customerName,
    locationType: loc.type,
    locationNumber: loc.number,
    items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.price })),
    total: getCartTotal(),
    status: 'new',
    paymentMethod: null,
    time: new Date().toISOString()
  };
  // Save to sessionStorage for payment page
  sessionStorage.setItem('lanature_pending_order', JSON.stringify(order));
  window.location.href = 'payment.html';
}

// ─── Admin Audio Notification ───
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    // Play a pleasant two-tone chime
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) { /* ignore audio errors */ }
}

// ─── Format helpers ───
function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatCurrency(n) {
  return '₹' + n.toLocaleString('en-IN');
}

// ─── Init navbar on load ───
document.addEventListener('DOMContentLoaded', initNavbar);
