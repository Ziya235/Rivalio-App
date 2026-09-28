import * as SecureStore from "expo-secure-store";

// The JWT is the only secret the app holds. It lives in the iOS Keychain /
// Android Keystore-backed storage, never in AsyncStorage.
const TOKEN_KEY = "rivalio.auth.token";

const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

let memoryToken: string | null = null;

export const tokenStorage = {
  /** Synchronous read of the in-memory copy, used by the HTTP/socket layer. */
  current(): string | null {
    return memoryToken;
  },

  async load(): Promise<string | null> {
    try {
      memoryToken = await SecureStore.getItemAsync(TOKEN_KEY, options);
    } catch {
      memoryToken = null;
    }
    return memoryToken;
  },

  async save(token: string): Promise<void> {
    memoryToken = token;
    await SecureStore.setItemAsync(TOKEN_KEY, token, options);
  },

  async clear(): Promise<void> {
    memoryToken = null;
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY, options);
    } catch {
      // Nothing stored — nothing to clear.
    }
  },
};

/** Reads `exp` from the JWT payload so an expired session is dropped before any request. */
export function tokenExpiresAt(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = JSON.parse(globalThis.atob(padded)) as { exp?: number };
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}
