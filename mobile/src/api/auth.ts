import type { RegisterPayload, UpdateProfilePayload, User } from "../types/auth";
import { api } from "./client";
import { appendImage, type PickedImage } from "./upload";

type AuthResult = { user: User; token: string };

export const authApi = {
  login(email: string, password: string) {
    return api.post<AuthResult>("/api/auth/login", { email, password });
  },
  register(payload: RegisterPayload) {
    return api.post<AuthResult>("/api/auth/register", payload);
  },
  /** Explicit token so session restore can validate before the token is "live". */
  async me(token?: string) {
    const data = await api.get<{ user: User }>(
      "/api/auth/me",
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    );
    return data.user;
  },
  async updateProfile(payload: UpdateProfilePayload) {
    const data = await api.patch<{ user: User }>("/api/auth/me", payload);
    return data.user;
  },
  async updateProfileImage(image: PickedImage) {
    const body = new FormData();
    appendImage(body, image);
    const data = await api.post<{ user: User }>("/api/auth/me/image", body, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.user;
  },
};
