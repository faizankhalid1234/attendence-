/**
 * Attendance photo URLs from the API are usually `/media/...` (Django).
 * The browser loads them from the Next origin; `next.config` rewrites `/media/*` to BACKEND_URL.
 */
export function mediaSrc(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const u = url.trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return u.startsWith("/") ? u : `/${u}`;
}
