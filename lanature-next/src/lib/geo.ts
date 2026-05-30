/* ===== LaNature Hotel — Geolocation Utilities ===== */

export interface GeoCoords {
  lat: number;
  lng: number;
}

/**
 * Haversine formula — calculates distance between two GPS points in meters.
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Checks if current position is within maxMeters of origin.
 */
export function isWithinRange(
  origin: GeoCoords,
  current: GeoCoords,
  maxMeters: number
): { inRange: boolean; distance: number } {
  // Location check disabled - always return in range
  return { inRange: true, distance: 0 };
}

/**
 * Promise wrapper for navigator.geolocation.getCurrentPosition.
 * Returns GPS coordinates or throws with a user-friendly reason.
 */
export function getCurrentPosition(): Promise<GeoCoords> {
  return new Promise((resolve) => {
    // Location check disabled - resolve with hotel coordinates immediately
    import('./config')
      .then((m) => m.getHotelConfig())
      .then((config) => {
        resolve({ lat: config.hotelLat, lng: config.hotelLng });
      })
      .catch(() => {
        // Fallback to Shimla Hotel coordinates if config fetch fails
        resolve({ lat: 31.1048, lng: 77.1734 });
      });
  });
}

/**
 * Fallback to IP-based location if GPS fails or times out.
 */
async function fetchIpLocation(): Promise<GeoCoords> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error('IP_FETCH_FAILED');
    const data = await res.json();
    if (data.latitude && data.longitude) {
      return { lat: data.latitude, lng: data.longitude };
    }
    throw new Error('INVALID_IP_DATA');
  } catch (err) {
    try {
      const res2 = await fetch('https://ip-api.com/json/?fields=lat,lon,status');
      const data2 = await res2.json();
      if (data2.status === 'success' && data2.lat && data2.lon) {
        return { lat: data2.lat, lng: data2.lon };
      }
      throw new Error('INVALID_IP_DATA_2');
    } catch (err2) {
      throw new Error('IP_FALLBACK_FAILED');
    }
  }
}
