/* ===== LaNature Hotel — Store (Supabase-backed) ===== */
import { type MenuItem, type CartItem, type Order } from './constants';
import {
  fetchMenu, addMenuItem, updateMenuItem, deleteMenuItem,
  fetchOrders, createOrder, updateOrderStatusDB, markAllOrdersDelivered,
  adminAction,
  placeOrderSecure,
  type DBMenuItem, type DBOrder,
  type SecureOrderRequest, type SecureOrderResponse,
} from './supabase';

export type { MenuItem, CartItem, Order };

/* ─── Converters: DB ↔ App types ─── */

function dbMenuToApp(db: DBMenuItem): MenuItem {
  return {
    id: db.id,
    name: db.name,
    category: db.category,
    price: db.price,
    desc: db.description,
    img: db.img,
    veg: db.veg,
  };
}

function dbOrderToApp(db: DBOrder): Order {
  return {
    id: db.order_number,
    customer: db.customer,
    locationType: db.location_type,
    locationNumber: db.location_number,
    items: db.items,
    total: db.total,
    status: db.status,
    paymentMethod: db.payment_method,
    time: db.created_at || new Date().toISOString(),
  };
}

/* ─── Menu Data (async — Supabase) ─── */

export async function getMenuData(): Promise<MenuItem[]> {
  const dbItems = await fetchMenu();
  return dbItems.map(dbMenuToApp);
}

export async function addProduct(product: Omit<MenuItem, 'id'>): Promise<MenuItem | null> {
  // Route through admin edge function (RLS blocks direct insert)
  const success = await adminAction('add_menu_item', {
    name: product.name,
    category: product.category,
    price: product.price,
    description: product.desc,
    img: product.img,
    veg: product.veg,
  });
  // Refetch to get the new item
  if (success) {
    const items = await getMenuData();
    return items[items.length - 1] || null;
  }
  return null;
}

export async function editProduct(id: number, updates: Partial<MenuItem>): Promise<boolean> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.price !== undefined) dbUpdates.price = updates.price;
  if (updates.desc !== undefined) dbUpdates.description = updates.desc;
  if (updates.img !== undefined) dbUpdates.img = updates.img;
  if (updates.veg !== undefined) dbUpdates.veg = updates.veg;
  // Route through admin edge function (RLS blocks direct update)
  return adminAction('update_menu_item', { id, updates: dbUpdates });
}

export async function deleteProduct(id: number): Promise<boolean> {
  // Route through admin edge function (RLS blocks direct delete)
  return adminAction('delete_menu_item', { id });
}

/* ─── Orders (async — Supabase) ─── */

export async function getOrders(): Promise<Order[]> {
  const dbOrders = await fetchOrders();
  return dbOrders.map(dbOrderToApp);
}

export async function saveOrder(order: Order & { sessionToken?: string }): Promise<void> {
  await createOrder({
    order_number: order.id,
    customer: order.customer,
    location_type: order.locationType,
    location_number: order.locationNumber,
    items: order.items,
    total: order.total,
    status: order.status,
    payment_method: order.paymentMethod,
    session_token: order.sessionToken || null,
  });
}

export async function updateOrderStatus(orderId: number, status: Order['status']): Promise<void> {
  // Route through admin edge function (RLS blocks direct update)
  await adminAction('update_order_status', { orderNumber: orderId, status });
}

export async function markAllDelivered(): Promise<void> {
  // Route through admin edge function (RLS blocks direct update)
  await adminAction('mark_all_delivered');
}

// Re-export secure order placement
export { placeOrderSecure, type SecureOrderRequest, type SecureOrderResponse };

export function generateOrderId(): number {
  return Math.floor(1000 + Math.random() * 9000);
}

/* ─── URL Params ─── */
export function getLocationInfo(searchParams: URLSearchParams): { type: string; number: string } {
  const table = searchParams.get('table');
  const room = searchParams.get('room');
  if (table) return { type: 'Table', number: table };
  if (room) return { type: 'Room', number: room };
  return { type: 'Table', number: '1' };
}

/* ─── Format Helpers ─── */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatCurrency(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}

/* ─── Audio Notification ─── */
export function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch { /* ignore audio errors */ }
}
