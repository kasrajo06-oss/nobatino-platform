import "server-only";
import { cookies } from "next/headers";

const API = process.env.API_INTERNAL_URL || "http://127.0.0.1:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Fetch from Django on the server. Public data is cached for `revalidate` seconds. */
export async function serverGet<T>(path: string, opts: { revalidate?: number; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.auth) {
    const jar = await cookies();
    headers.Cookie = jar.toString();
  }
  const res = await fetch(`${API}/api${path}`, {
    headers,
    ...(opts.auth ? { cache: "no-store" } : { next: { revalidate: opts.revalidate ?? 60 } }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export async function serverGetOrNull<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    return await serverGet<T>(path, { revalidate });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "" && v !== false) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
