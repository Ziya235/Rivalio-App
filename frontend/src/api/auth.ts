import type {
  AuthResponse,
  MeResponse,
  RegisterPayload,
  UpdateProfilePayload,
  User,
} from "../types/auth";

const TOKEN_KEY = "sport_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      (data as { message?: string }).message || "Something went wrong",
    );
  }
  return data as T;
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<{ user: User; token: string }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<AuthResponse>(res);
  return data.data;
}

export async function registerRequest(
  payload: RegisterPayload,
): Promise<{ user: User; token: string }> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<AuthResponse>(res);
  return data.data;
}

export async function meRequest(token: string): Promise<User> {
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJson<MeResponse>(res);
  return data.data.user;
}

export async function updateProfileRequest(
  payload: UpdateProfilePayload,
): Promise<User> {
  const token = getToken();
  if (!token) {
    throw new Error("Unauthorized");
  }

  const res = await fetch("/api/auth/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<MeResponse>(res);
  return data.data.user;
}

export async function updateProfileImageRequest(file: File): Promise<User> {
  const token = getToken();
  if (!token) {
    throw new Error("Unauthorized");
  }

  const body = new FormData();
  body.append("image", file);

  const res = await fetch("/api/auth/me/image", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });
  const data = await parseJson<MeResponse>(res);
  return data.data.user;
}
