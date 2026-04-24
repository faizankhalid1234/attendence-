/**
 * Browser → same origin `/api/...` → Next route handler → Django (`BACKEND_URL`).
 * Use `credentials: 'include'` so the login session cookie is sent and stored.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    credentials: "include",
  });
}

export async function readJsonSafe<T = Record<string, unknown>>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
