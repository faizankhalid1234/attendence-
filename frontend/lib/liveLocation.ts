/**
 * Browser geolocation for attendance — tied to a user gesture (button tap).
 * Tries high accuracy first, then a faster / indoor-friendly fallback.
 */

export function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineKm(startLat: number, startLng: number, endLat: number, endLng: number): number {
  const earthRadiusKm = 6371;
  const latDiff = toRadians(endLat - startLat);
  const lngDiff = toRadians(endLng - startLng);
  const a =
    Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
    Math.cos(toRadians(startLat)) *
      Math.cos(toRadians(endLat)) *
      Math.sin(lngDiff / 2) *
      Math.sin(lngDiff / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function geoMessage(code: number, fallback: string): string {
  if (code === 1) {
    return "Location is blocked for this site. Click the lock or ⊕ in the address bar → Site settings → Location → Allow, then try Check in again.";
  }
  if (code === 2) {
    return "Position unavailable. Turn on GPS / location on your phone or PC, move near a window, and try again.";
  }
  if (code === 3) {
    return "Location timed out. Try again; if indoors, wait a few seconds on the first attempt.";
  }
  return fallback || "Unable to read your location.";
}

function readPosition(options: PositionOptions): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Your browser does not support geolocation."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (geoError) => {
        const code = geoError && typeof geoError.code === "number" ? geoError.code : 0;
        const raw = geoError && "message" in geoError && typeof geoError.message === "string" ? geoError.message : "";
        reject(new Error(geoMessage(code, raw)));
      },
      options,
    );
  });
}

/**
 * Resolves current lat/lng. Uses two attempts so indoor / laptop Wi‑Fi often still works.
 */
export async function getBrowserPosition(): Promise<{ lat: number; lng: number }> {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    throw new Error(
      "Location only works on a secure page. Use https:// or open the app at http://localhost:3000 (or 127.0.0.1). Plain http:// on a random LAN IP is often blocked by the browser.",
    );
  }
  try {
    return await readPosition({ enableHighAccuracy: true, maximumAge: 0, timeout: 14000 });
  } catch (e) {
    try {
      return await readPosition({ enableHighAccuracy: false, maximumAge: 120000, timeout: 22000 });
    } catch {
      if (e instanceof Error) throw e;
      throw new Error("Location failed.");
    }
  }
}
