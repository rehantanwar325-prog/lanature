/* ===== LaNature Hotel — QR Session Config ===== */
import { fetchHotelSettings, type DBHotelSettings } from './supabase';

// ─── Default/Fallback values (used when DB is unavailable) ───
export const HOTEL_COORDS = {
  lat: 31.1048, // Shimla Hotel coordinates
  lng: 77.1734,
};

export const QR_CONFIG = {
  // Table QR — for restaurant dining area
  table: {
    maxDistanceMeters: 50,       // 50 meter radius
    sessionDurationMs: 60 * 60 * 1000,  // 1 hour
    label: 'Table',
    outOfRangeMsg: 'Aap hotel restaurant area se bahar hain. Kripya table par baith kar order karein.',
    expiredMsg: 'Aapka ordering session expire ho gaya hai. Kripya Table QR code dobara scan karein.',
  },
  // Room QR — for hotel room service
  room: {
    maxDistanceMeters: 200,      // 200 meter radius
    sessionDurationMs: 24 * 60 * 60 * 1000,  // 24 hours
    label: 'Room',
    outOfRangeMsg: 'Aap hotel premises se bahar hain. Kripya apne room ya hotel se order karein.',
    expiredMsg: 'Aapka room ordering session expire ho gaya hai. Kripya Room QR code dobara scan karein.',
  },
} as const;

export type QRType = keyof typeof QR_CONFIG;

export function isValidQRType(type: string): type is QRType {
  return type === 'table' || type === 'room';
}

// ─── Dynamic Hotel Config (fetched from Supabase) ───

export interface HotelConfig {
  hotelLat: number;
  hotelLng: number;
  tableRadiusMeters: number;
  roomRadiusMeters: number;
  tableSessionMs: number;
  roomSessionMs: number;
}

// Cache to avoid fetching every time
let _cachedConfig: HotelConfig | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // Refresh from DB every 30 seconds

/**
 * Fetch dynamic hotel config from Supabase.
 * Falls back to hardcoded defaults if DB is unavailable.
 */
export async function getHotelConfig(): Promise<HotelConfig> {
  const now = Date.now();

  // Return cached if still valid
  if (_cachedConfig && (now - _cacheTimestamp) < CACHE_TTL_MS) {
    return _cachedConfig;
  }

  try {
    const settings: DBHotelSettings | null = await fetchHotelSettings();
    if (settings) {
      _cachedConfig = {
        hotelLat: settings.hotel_lat,
        hotelLng: settings.hotel_lng,
        tableRadiusMeters: settings.table_radius_meters,
        roomRadiusMeters: settings.room_radius_meters,
        tableSessionMs: settings.table_session_hours * 60 * 60 * 1000,
        roomSessionMs: settings.room_session_hours * 60 * 60 * 1000,
      };
      _cacheTimestamp = now;
      return _cachedConfig;
    }
  } catch (err) {
    console.error('Failed to fetch hotel config from DB:', err);
  }

  // Fallback to hardcoded defaults
  return {
    hotelLat: HOTEL_COORDS.lat,
    hotelLng: HOTEL_COORDS.lng,
    tableRadiusMeters: QR_CONFIG.table.maxDistanceMeters,
    roomRadiusMeters: QR_CONFIG.room.maxDistanceMeters,
    tableSessionMs: QR_CONFIG.table.sessionDurationMs,
    roomSessionMs: QR_CONFIG.room.sessionDurationMs,
  };
}

/** Force clear the cache (call after admin saves settings) */
export function clearConfigCache() {
  _cachedConfig = null;
  _cacheTimestamp = 0;
}
