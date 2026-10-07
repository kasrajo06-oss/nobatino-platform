"use client";

export class ApiError extends Error {
  constructor(public status: number, public data: unknown) {
    super(extractMessage(data) || `خطای ${status}`);
  }
}

export function extractMessage(data: unknown): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.map(extractMessage).filter(Boolean).join(" ");
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (obj.detail) return extractMessage(obj.detail);
    return Object.entries(obj)
      .map(([, v]) => extractMessage(v))
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

let refreshing: Promise<boolean> | null = null;

async function refresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch("/api/auth/refresh/", { method: "POST", credentials: "include" })
      .then((r) => r.ok)
      .finally(() => setTimeout(() => (refreshing = null), 0));
  }
  return refreshing;
}

type Opts = { method?: string; body?: unknown; headers?: Record<string, string>; retry?: boolean };

/** Browser-side API call: same-origin `/api/*` (proxied to Django), cookies carry the JWT. */
export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
  const res = await fetch(`/api${path}`, {
    method: opts.method || (opts.body ? "POST" : "GET"),
    credentials: "include",
    headers: { Accept: "application/json", ...(isForm || !opts.body ? {} : { "Content-Type": "application/json" }), ...opts.headers },
    body: isForm ? (opts.body as FormData) : opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401 && opts.retry !== false && !path.startsWith("/auth/")) {
    if (await refresh()) return api<T>(path, { ...opts, retry: false });
  }
  if (res.status === 204) return undefined as T;
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text();
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const get = <T,>(path: string) => api<T>(path);
export const post = <T,>(path: string, body?: unknown) => api<T>(path, { method: "POST", body: body ?? {} });
export const patch = <T,>(path: string, body: unknown) => api<T>(path, { method: "PATCH", body });
export const del = (path: string) => api(path, { method: "DELETE" });
