/**
 * Browser → same origin `/api/...` → Next route handler → Django (`BACKEND_URL`).
 * `credentials: 'include'` zaroori hai taake login cookie save ho.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    credentials: "include",
  });
}
