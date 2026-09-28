import axios, { type AxiosRequestConfig } from "axios";
import { env } from "../config/env";
import { tokenStorage } from "../storage/tokenStorage";
import type { ApiEnvelope } from "../types/common";
import { toApiError } from "./errors";

export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: env.requestTimeoutMs,
  headers: { Accept: "application/json" },
});

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** AuthProvider registers this so any 401 on an authenticated call ends the session. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

http.interceptors.request.use((config) => {
  const token = tokenStorage.current();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error);
    const sentToken =
      axios.isAxiosError(error) && Boolean(error.config?.headers?.Authorization);
    // Only a rejected *token* means the session is over. A 401 from /auth/login
    // (wrong password) is sent without a token and must not log anyone out.
    if (apiError.kind === "unauthorized" && sentToken) {
      onUnauthorized?.();
    }
    return Promise.reject(apiError);
  },
);

/** Unwraps `{ success, data }` so API modules return the payload directly. */
async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}

export const api = {
  get<T>(url: string, config?: AxiosRequestConfig) {
    return unwrap<T>(http.get(url, config));
  },
  post<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    return unwrap<T>(http.post(url, body ?? {}, config));
  },
  put<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    return unwrap<T>(http.put(url, body ?? {}, config));
  },
  patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    return unwrap<T>(http.patch(url, body ?? {}, config));
  },
  delete<T>(url: string, config?: AxiosRequestConfig) {
    return unwrap<T>(http.delete(url, config));
  },
};

/** Backend returns relative `/uploads/...` paths; images need the absolute URL. */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^(https?:|file:|data:|content:)/i.test(path)) return path;
  if (path.startsWith("/")) return `${env.apiUrl}${path}`;
  return path;
}
