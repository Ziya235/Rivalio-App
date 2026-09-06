import { getToken } from "./auth";
import { apiUrl } from "./base";
import type { PlayerProfile } from "./players";

type ApiSuccess<T> = { success: boolean; data: T; message?: string };

async function apiFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const token = getToken();
  const res = await fetch(apiUrl(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  });
  const body = (await res.json()) as ApiSuccess<T> & { message?: string };

  if (!res.ok) {
    throw new Error(body.message || "Something went wrong");
  }

  return body.data;
}

export type UserSearchHit = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  image: string | null;
  playerId: number | null;
  teamName: string | null;
};

export function searchUsers(
  q: string,
  signal?: AbortSignal,
): Promise<UserSearchHit[]> {
  const query = q.trim().replace(/^@+/, "");
  if (!query) return Promise.resolve([]);
  return apiFetch<UserSearchHit[]>(
    `/api/users/search?q=${encodeURIComponent(query)}`,
    signal,
  );
}

export function fetchUserProfile(userId: number): Promise<PlayerProfile> {
  return apiFetch<PlayerProfile>(`/api/users/${userId}`);
}
