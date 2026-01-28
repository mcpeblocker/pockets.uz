import "server-only";
import { cookies } from "next/headers";

export type ApiError = { error: string; details?: string };

function getBackendUrl() {
  return process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3001";
}

export function getAuthTokenFromCookies() {
  // In Next.js 16, cookies() is async in some contexts (e.g. Server Actions).
  // This helper is intended for server-side usage; treat it as async-safe by
  // supporting both sync and async return types via await where used.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = cookies();
  // If cookies() returns a Promise, caller should await via getAuthTokenFromCookiesAsync().
  // Here we keep a sync version for route handlers where it's sync.
  return typeof c?.then === "function" ? null : c.get("pockets_token")?.value || null;
}

export async function getAuthTokenFromCookiesAsync() {
  const cookieStore = await cookies();
  return cookieStore.get("pockets_token")?.value || null;
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { auth?: boolean } = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const url = `${getBackendUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(opts.headers || {});
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");

  if (opts.auth) {
    const token = (await getAuthTokenFromCookiesAsync()) || getAuthTokenFromCookies();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...opts, headers, cache: "no-store" });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown network error";
    return {
      status: 0,
      error: `Failed to reach API at ${url}. Is the backend running? (${message})`,
    };
  }

  const status = res.status;

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    return { status, error: body?.error || `Request failed (${status})` };
  }

  return { status, data: body as T };
}

