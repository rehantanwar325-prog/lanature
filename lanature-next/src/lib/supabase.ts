/* ===== LaNature Hotel — Supabase Client & Database Operations ===== */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://glxwttgadxqwhptrscii.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdseHd0dGdhZHhxd2hwdHJzY2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTUzNzcsImV4cCI6MjA4OTc3MTM3N30.jZJAJlhz_ZGwNHPzmBFv1a3vWDg7ysOp9Uuqoml5U8c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ─────────────────────────────────────────────
   Types matching Supabase table schemas
   ───────────────────────────────────────────── */

export interface DBMenuItem {
  id: number;
  name: string;
  category: 'starters' | 'main' | 'beverages' | 'desserts';
  price: number;
  description: string;
  img: string;
  veg: boolean;
  created_at?: string;
}

export interface DBOrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface DBOrder {
  id?: number;
  order_number: number;
  customer: string;
  location_type: string;
  location_number: string;
  items: DBOrderItem[];
  total: number;
  status: 'new' | 'preparing' | 'ready' | 'delivered';
  payment_method: 'online' | 'cash' | null;
  session_token?: string | null;
  created_at?: string;
}

export interface DBSession {
  id?: number;
  token: string;
  type: 'table' | 'room';
  location_id: string;
  lat: number;
  lng: number;
  active: boolean;
  expires_at: string;
  created_at?: string;
}

/* ─────────────────────────────────────────────
   MENU Operations
   ───────────────────────────────────────────── */

export async function fetchMenu(): Promise<DBMenuItem[]> {
  const { data, error } = await supabase
    .from('hotel_menu')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('fetchMenu error:', error);
    return [];
  }
  return data || [];
}

export async function addMenuItem(item: Omit<DBMenuItem, 'id' | 'created_at'>): Promise<DBMenuItem | null> {
  const { data, error } = await supabase
    .from('hotel_menu')
    .insert({
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description,
      img: item.img,
      veg: item.veg,
    })
    .select()
    .single();

  if (error) {
    console.error('addMenuItem error:', error);
    return null;
  }
  return data;
}

export async function updateMenuItem(id: number, updates: Partial<Omit<DBMenuItem, 'id' | 'created_at'>>): Promise<boolean> {
  const { error } = await supabase
    .from('hotel_menu')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('updateMenuItem error:', error);
    return false;
  }
  return true;
}

export async function deleteMenuItem(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('hotel_menu')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteMenuItem error:', error);
    return false;
  }
  return true;
}

/* ─────────────────────────────────────────────
   ORDER Operations
   ───────────────────────────────────────────── */

export async function fetchOrders(): Promise<DBOrder[]> {
  const { data, error } = await supabase
    .from('hotel_orders')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('fetchOrders error:', error);
    return [];
  }
  return data || [];
}

export async function createOrder(order: Omit<DBOrder, 'id' | 'created_at'>): Promise<DBOrder | null> {
  const { data, error } = await supabase
    .from('hotel_orders')
    .insert({
      order_number: order.order_number,
      customer: order.customer,
      location_type: order.location_type,
      location_number: order.location_number,
      items: order.items as unknown as Record<string, unknown>,
      total: order.total,
      status: order.status,
      payment_method: order.payment_method,
      session_token: order.session_token || null,
    })
    .select()
    .single();

  if (error) {
    console.error('createOrder error:', error);
    return null;
  }
  return data as unknown as DBOrder;
}

export async function updateOrderStatusDB(orderNumber: number, status: DBOrder['status']): Promise<boolean> {
  const { error } = await supabase
    .from('hotel_orders')
    .update({ status })
    .eq('order_number', orderNumber);

  if (error) {
    console.error('updateOrderStatus error:', error);
    return false;
  }
  return true;
}

export async function markAllOrdersDelivered(): Promise<boolean> {
  const { error } = await supabase
    .from('hotel_orders')
    .update({ status: 'delivered' })
    .neq('status', 'delivered');

  if (error) {
    console.error('markAllDelivered error:', error);
    return false;
  }
  return true;
}

/* ─────────────────────────────────────────────
   SESSION Operations
   ───────────────────────────────────────────── */

export async function createQRSession(session: Omit<DBSession, 'id' | 'created_at'>): Promise<DBSession | null> {
  // Remove any old session with same token first
  await supabase.from('hotel_sessions').delete().eq('token', session.token);

  const { data, error } = await supabase
    .from('hotel_sessions')
    .insert({
      token: session.token,
      type: session.type,
      location_id: session.location_id,
      lat: session.lat,
      lng: session.lng,
      active: session.active,
      expires_at: session.expires_at,
    })
    .select()
    .single();

  if (error) {
    console.error('createQRSession error:', error);
    return null;
  }
  return data;
}

export async function getQRSession(token: string): Promise<DBSession | null> {
  const { data, error } = await supabase
    .from('hotel_sessions')
    .select('*')
    .eq('token', token)
    .single();

  if (error) {
    // PGRST116 = no rows found — expected for missing tokens
    if (error.code !== 'PGRST116') console.error('getQRSession error:', error);
    return null;
  }
  return data;
}

export async function fetchActiveSessions(): Promise<DBSession[]> {
  const { data, error } = await supabase
    .from('hotel_sessions')
    .select('*')
    .eq('active', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchActiveSessions error:', error);
    return [];
  }
  return data || [];
}

export async function closeQRSession(token: string): Promise<boolean> {
  const { error } = await supabase
    .from('hotel_sessions')
    .update({ active: false })
    .eq('token', token);

  if (error) {
    console.error('closeQRSession error:', error);
    return false;
  }
  return true;
}

export async function cleanExpiredSessionsDB(): Promise<void> {
  // Delete sessions that are expired or inactive
  await supabase
    .from('hotel_sessions')
    .delete()
    .or(`expires_at.lt.${new Date().toISOString()},active.eq.false`);
}

/* ─────────────────────────────────────────────
   HOTEL SETTINGS Operations
   ───────────────────────────────────────────── */

export interface DBHotelSettings {
  id: number;
  hotel_lat: number;
  hotel_lng: number;
  table_radius_meters: number;
  room_radius_meters: number;
  table_session_hours: number;
  room_session_hours: number;
  updated_at?: string;
}

export async function fetchHotelSettings(): Promise<DBHotelSettings | null> {
  const { data, error } = await supabase
    .from('hotel_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('fetchHotelSettings error:', error);
    return null;
  }
  return data;
}

export async function updateHotelSettings(
  settings: Partial<Omit<DBHotelSettings, 'id' | 'updated_at'>>
): Promise<boolean> {
  // Now routes through admin edge function (RLS blocks direct update)
  return adminAction('update_settings', { settings });
}

/* ─────────────────────────────────────────────
   SECURE EDGE FUNCTION CALLS
   ───────────────────────────────────────────── */

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1`;

export interface SecureOrderRequest {
  sessionToken: string;
  customer: string;
  items: { name: string; qty: number; price: number }[];
  paymentMethod: 'online' | 'cash';
  userLat?: number;
  userLng?: number;
}

export interface SecureOrderResponse {
  success: boolean;
  order?: {
    id: number;
    customer: string;
    locationType: string;
    locationNumber: string;
    items: { name: string; qty: number; price: number }[];
    total: number;
    status: string;
    paymentMethod: string;
    time: string;
  };
  error?: boolean;
  code?: string;
  message?: string;
}

/**
 * Place order through server-side edge function.
 * Validates session, checks GPS, verifies menu prices server-side.
 */
export async function placeOrderSecure(data: SecureOrderRequest): Promise<SecureOrderResponse> {
  try {
    const res = await fetch(`${EDGE_FUNCTION_URL}/place-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err) {
    console.error('placeOrderSecure error:', err);
    return { success: false, error: true, code: 'NETWORK_ERROR', message: 'Network error. Please try again.' };
  }
}

/**
 * Execute admin actions through server-side edge function.
 * Requires admin credentials. Uses service_role key on server.
 */
export async function adminAction(action: string, payload?: Record<string, unknown>): Promise<boolean> {
  try {
    // Get admin credentials from sessionStorage
    const adminCreds = sessionStorage.getItem('lanature_admin_creds');
    let adminUser = 'admin';
    let adminPass = 'lanature123';
    if (adminCreds) {
      const creds = JSON.parse(adminCreds);
      adminUser = creds.user;
      adminPass = creds.pass;
    }

    const res = await fetch(`${EDGE_FUNCTION_URL}/admin-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUser, adminPass, action, payload }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('adminAction error:', err);
    return false;
  }
}

/**
 * Admin action that returns data (for add_menu_item etc.)
 */
export async function adminActionWithData<T>(action: string, payload?: Record<string, unknown>): Promise<T | null> {
  try {
    const adminCreds = sessionStorage.getItem('lanature_admin_creds');
    let adminUser = 'admin';
    let adminPass = 'lanature123';
    if (adminCreds) {
      const creds = JSON.parse(adminCreds);
      adminUser = creds.user;
      adminPass = creds.pass;
    }

    const res = await fetch(`${EDGE_FUNCTION_URL}/admin-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUser, adminPass, action, payload }),
    });
    const data = await res.json();
    if (data.success) return data as T;
    return null;
  } catch (err) {
    console.error('adminActionWithData error:', err);
    return null;
  }
}
