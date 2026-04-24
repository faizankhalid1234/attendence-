/**
 * Simple browser geolocation + Haversine distance (merged from Live-Location demo).
 * Uses navigator.geolocation.getCurrentPosition only — no reverse geocoding.
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

/**
 * Same flow as Live-Location/src/App.jsx — one getCurrentPosition call when the user taps the button
 * (keeps the permission prompt tied to the click where possible).
 */
export function getBrowserPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
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
        let msg = "Unable to fetch your location.";
        if (geoError && typeof geoError.code === "number") {
          if (geoError.code === 1) {
            msg =
              "Location is off for this site. Turn it on: use the lock or info icon in the address bar → Site settings → Location → Allow, then tap Get my location again.";
          } else if (geoError.code === 2) {
            msg = "Location unavailable. Turn on GPS / location services on your device and try again.";
          } else if (geoError.code === 3) {
            msg = "Location request timed out. Try again near a window or outdoors.";
          } else if (geoError.message) {
            msg = geoError.message;
          }
        }
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  });
}
