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
  const distance = haversineDistance(origin.lat, origin.lng, current.lat, current.lng);
  return { inRange: distance <= maxMeters, distance: Math.round(distance) };
}

/**
 * Promise wrapper for navigator.geolocation.getCurrentPosition.
 * Returns GPS coordinates or throws with a user-friendly reason.
 */
export function getCurrentPosition(): Promise<GeoCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS_NOT_SUPPORTED'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(new Error('GPS_DENIED'));
            break;
          case err.POSITION_UNAVAILABLE:
            reject(new Error('GPS_UNAVAILABLE'));
            break;
          case err.TIMEOUT:
            reject(new Error('GPS_TIMEOUT'));
            break;
          default:
            reject(new Error('GPS_ERROR'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  });
}
