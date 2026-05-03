/* ===== LaNature Hotel — QR Session Management (Supabase-backed) ===== */
import { QR_CONFIG, getHotelConfig, type QRType } from './config';
import { isWithinRange, type GeoCoords } from './geo';
import {
  createQRSession, getQRSession, fetchActiveSessions,
  closeQRSession, cleanExpiredSessionsDB,
  type DBSession,
} from './supabase';

export interface QRSession {
  token: string;
  type: QRType;        // 'table' | 'room'
  id: string;          // table/room number
  lat: number;         // first-scan GPS latitude
  lng: number;         // first-scan GPS longitude
  createdAt: number;   // timestamp ms
  expiresAt: number;   // timestamp ms
  active: boolean;
}

export type SessionValidation =
  | { valid: true; session: QRSession }
  | { valid: false; reason: 'INVALID_TOKEN' | 'EXPIRED' | 'OUT_OF_RANGE' | 'CLOSED'; message: string; distance?: number };

/* ─── Converters ─── */

function dbToApp(db: DBSession): QRSession {
  return {
    token: db.token,
    type: db.type as QRType,
    id: db.location_id,
    lat: db.lat,
    lng: db.lng,
    createdAt: new Date(db.created_at || '').getTime(),
    expiresAt: new Date(db.expires_at).getTime(),
    active: db.active,
  };
}

// ─── Token Generation (stays client-side) ───
export function generateToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

// ─── Session CRUD (async — Supabase) ───

export async function createSession(
  type: QRType,
  id: string,
  lat: number,
  lng: number
): Promise<QRSession> {
  // Fetch dynamic config from DB
  const hotelConfig = await getHotelConfig();
  const sessionDurationMs = type === 'table' ? hotelConfig.tableSessionMs : hotelConfig.roomSessionMs;

  const now = Date.now();
  const sessionToken = generateToken(); // ALWAYS generate a fresh unique session token
  const expiresAt = new Date(now + sessionDurationMs).toISOString();

  const dbSession = await createQRSession({
    token: sessionToken,
    type,
    location_id: id,
    lat,
    lng,
    active: true,
    expires_at: expiresAt,
  });

  // Return app-format session (even if DB call failed, construct from inputs)
  if (dbSession) {
    return dbToApp(dbSession);
  }

  // Fallback — construct session locally
  return {
    token: sessionToken,
    type,
    id,
    lat,
    lng,
    createdAt: now,
    expiresAt: now + sessionDurationMs,
    active: true,
  };
}

export async function getSession(token: string): Promise<QRSession | null> {
  const db = await getQRSession(token);
  return db ? dbToApp(db) : null;
}

/**
 * Validates a session token against expiry and GPS distance.
 * Now uses DYNAMIC coordinates & radius from Supabase DB.
 */
export async function validateSession(
  token: string,
  currentCoords: GeoCoords
): Promise<SessionValidation> {
  const session = await getSession(token);

  // 1. Token not found
  if (!session) {
    return { valid: false, reason: 'INVALID_TOKEN', message: 'Invalid or unknown QR code. Please scan again.' };
  }

  // 2. Session manually closed by staff
  if (!session.active) {
    return { valid: false, reason: 'CLOSED', message: 'This session has been closed by staff. Please scan the QR code again.' };
  }

  // 3. Session expired
  const config = QR_CONFIG[session.type];
  if (Date.now() > session.expiresAt) {
    return { valid: false, reason: 'EXPIRED', message: config.expiredMsg };
  }

  // 4. Distance check — using DYNAMIC hotel coordinates & radius from DB
  const hotelConfig = await getHotelConfig();
  const hotelCoords: GeoCoords = { lat: hotelConfig.hotelLat, lng: hotelConfig.hotelLng };
  const maxDistance = session.type === 'table' ? hotelConfig.tableRadiusMeters : hotelConfig.roomRadiusMeters;

  const { inRange, distance } = isWithinRange(hotelCoords, currentCoords, maxDistance);

  if (!inRange) {
    return {
      valid: false,
      reason: 'OUT_OF_RANGE',
      message: config.outOfRangeMsg,
      distance,
    };
  }

  // ✅ All checks passed
  return { valid: true, session };
}

/**
 * Staff closes a session manually.
 */
export async function closeSession(token: string): Promise<boolean> {
  return closeQRSession(token);
}

/**
 * Remove all expired sessions (garbage collection).
 */
export async function cleanExpiredSessions(): Promise<void> {
  await cleanExpiredSessionsDB();
}

/**
 * Get only active, non-expired sessions (for admin dashboard).
 */
export async function getActiveSessions(): Promise<QRSession[]> {
  const dbSessions = await fetchActiveSessions();
  return dbSessions.map(dbToApp);
}
