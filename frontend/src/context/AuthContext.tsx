import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearToken,
  getToken,
  loginRequest,
  meRequest,
  registerRequest,
  setToken,
  updateProfileImageRequest,
  updateProfileRequest,
} from "../api/auth";
import type { RegisterPayload, UpdateProfilePayload, User } from "../types/auth";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  updateProfileImage: (file: File) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    meRequest(token)
      .then(setUser)
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: nextUser, token } = await loginRequest(email, password);
    setToken(token);
    setUser(nextUser);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const { user: nextUser, token } = await registerRequest(payload);
    setToken(token);
    setUser(nextUser);
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const nextUser = await updateProfileRequest(payload);
    setUser(nextUser);
  }, []);

  const updateProfileImage = useCallback(async (file: File) => {
    const nextUser = await updateProfileImageRequest(file);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAdmin: user?.role === "ADMIN",
      login,
      register,
      updateProfile,
      updateProfileImage,
      logout,
    }),
    [user, isLoading, login, register, updateProfile, updateProfileImage, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
