const fallbackProdApi = "https://rivalio-app.onrender.com";

export const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? fallbackProdApi : "")
).replace(/\/$/, "");

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

export function mediaUrl(
  path: string | null | undefined,
): string | undefined {
  if (!path) return undefined;
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  if (path.startsWith("/uploads") || path.startsWith("/api")) {
    return `${API_BASE}${path}`;
  }
  return path;
}
