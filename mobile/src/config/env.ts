import Constants from "expo-constants";
import { Platform } from "react-native";

export type AppEnv = "development" | "staging" | "production";

const PRODUCTION_API = "https://rivalio-app.onrender.com";
const DEV_API_PORT = process.env.EXPO_PUBLIC_DEV_API_PORT ?? "5000";

function readAppEnv(): AppEnv {
  const raw = process.env.EXPO_PUBLIC_APP_ENV;
  if (raw === "staging" || raw === "production") return raw;
  return "development";
}

/**
 * In development the backend runs on the developer machine. "localhost" means
 * different things per target:
 *  - iOS simulator: localhost is the Mac → works.
 *  - Android emulator: localhost is the emulator itself → host is 10.0.2.2.
 *  - Physical devices: need the machine's LAN IP. Metro's hostUri
 *    ("192.168.1.5:8081") already contains it, so we reuse that host.
 */
function devApiUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:${DEV_API_PORT}`;
  }
  return Platform.OS === "android"
    ? `http://10.0.2.2:${DEV_API_PORT}`
    : `http://localhost:${DEV_API_PORT}`;
}

function resolveApiUrl(env: AppEnv): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (env === "development") return devApiUrl();
  if (env === "staging") {
    // Staging must be configured explicitly; fall back to production API so a
    // misconfigured build still talks to a real server instead of localhost.
    return PRODUCTION_API;
  }
  return PRODUCTION_API;
}

const appEnv = readAppEnv();

export const env = {
  appEnv,
  apiUrl: resolveApiUrl(appEnv),
  isDev: appEnv === "development",
  requestTimeoutMs: 20_000,
} as const;
