import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "../api/auth";
import { setUnauthorizedHandler } from "../api/client";
import { toApiError } from "../api/errors";
import type { PickedImage } from "../api/upload";
import { clearQueryCache } from "../hooks/useQuery";
import { tokenExpiresAt, tokenStorage } from "../storage/tokenStorage";
import type { RegisterPayload, UpdateProfilePayload, User } from "../types/auth";

/**
 * - restoring: reading the stored token and validating it with GET /api/auth/me
 * - offline: a token exists but the server could not be reached; we keep the
 *   token (unlike a 401) and let the user retry instead of silently logging out
 */
export type AuthStatus = "restoring" | "offline" | "guest" | "authenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  token: string | null;
  isAdmin: boolean;
  /** Set when the session ended because the token was rejected/expired. */
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload, image?: PickedImage | null) => Promise<void>;
  logout: () => Promise<void>;
  retryRestore: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  updateProfileImage: (image: PickedImage) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isExpired(token: string) {
  const exp = tokenExpiresAt(token);
  return exp != null && exp <= Date.now();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("restoring");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const endSession = useCallback(async (expired: boolean) => {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    await tokenStorage.clear();
    clearQueryCache();
    setToken(null);
    setUser(null);
    setSessionExpired(expired);
    setStatus("guest");
  }, []);

  const scheduleExpiry = useCallback(
    (value: string) => {
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
      const exp = tokenExpiresAt(value);
      if (exp == null) return;
      // setTimeout overflows above ~24.8 days; the JWT lives 7 days.
      const delay = Math.min(exp - Date.now(), 2_000_000_000);
      expiryTimer.current = setTimeout(() => void endSession(true), Math.max(delay, 0));
    },
    [endSession],
  );

  const startSession = useCallback(
    async (nextToken: string, nextUser: User) => {
      await tokenStorage.save(nextToken);
      setToken(nextToken);
      setUser(nextUser);
      setSessionExpired(false);
      setStatus("authenticated");
      scheduleExpiry(nextToken);
    },
    [scheduleExpiry],
  );

  const restore = useCallback(async () => {
    setStatus("restoring");
    const stored = await tokenStorage.load();
    if (!stored) {
      setStatus("guest");
      return;
    }
    if (isExpired(stored)) {
      await endSession(true);
      return;
    }
    try {
      const me = await authApi.me(stored);
      setToken(stored);
      setUser(me);
      setStatus("authenticated");
      scheduleExpiry(stored);
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.kind === "unauthorized" || apiError.kind === "not_found") {
        await endSession(true);
      } else {
        setStatus("offline");
      }
    }
  }, [endSession, scheduleExpiry]);

  useEffect(() => {
    void restore();
    return () => {
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
    };
  }, [restore]);

  // Any authenticated request answered with 401 ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (tokenStorage.current()) void endSession(true);
    });
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email.trim().toLowerCase(), password);
      await startSession(result.token, result.user);
    },
    [startSession],
  );

  const register = useCallback(
    async (payload: RegisterPayload, image?: PickedImage | null) => {
      const result = await authApi.register(payload);
      await startSession(result.token, result.user);
      if (image) {
        try {
          setUser(await authApi.updateProfileImage(image));
        } catch {
          // Account exists; the photo can be added later from the profile.
        }
      }
    },
    [startSession],
  );

  const logout = useCallback(() => endSession(false), [endSession]);

  const refreshUser = useCallback(async () => {
    setUser(await authApi.me());
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    setUser(await authApi.updateProfile(payload));
  }, []);

  const updateProfileImage = useCallback(async (image: PickedImage) => {
    setUser(await authApi.updateProfileImage(image));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      token,
      isAdmin: user?.role === "ADMIN",
      sessionExpired,
      login,
      register,
      logout,
      retryRestore: restore,
      refreshUser,
      updateProfile,
      updateProfileImage,
    }),
    [
      status,
      user,
      token,
      sessionExpired,
      login,
      register,
      logout,
      restore,
      refreshUser,
      updateProfile,
      updateProfileImage,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** For screens that only render inside the authenticated navigator. */
export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error("useCurrentUser used outside an authenticated screen");
  return user;
}
