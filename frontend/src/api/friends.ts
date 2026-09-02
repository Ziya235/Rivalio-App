import { getToken } from "./auth";

type ApiSuccess<T> = { success: boolean; data: T; message?: string };

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      (data as { message?: string }).message || "Something went wrong",
    );
  }

  return ((data as ApiSuccess<T>).data ?? undefined) as T;
}

export type UserBrief = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  image: string | null;
};

export type FriendRequest = {
  id: number;
  senderId: number;
  receiverId: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  sender: UserBrief;
  receiver: UserBrief;
};

export type FriendshipStatus =
  | { status: "SELF" }
  | { status: "NONE" }
  | { status: "FRIENDS"; friendshipId: number }
  | { status: "INCOMING_PENDING"; request: FriendRequest }
  | { status: "OUTGOING_PENDING"; request: FriendRequest };

export type FriendListItem = {
  friendshipId: number;
  friend: UserBrief;
  createdAt: string;
};

export type UserPresence = {
  userId: number;
  online: boolean;
  lastSeenAt: string | null;
};

export function fetchFriendshipStatus(userId: number): Promise<FriendshipStatus> {
  return apiFetch<FriendshipStatus>(`/api/friends/status/${userId}`);
}

export function fetchFriends(): Promise<FriendListItem[]> {
  return apiFetch<FriendListItem[]>("/api/friends");
}

export function sendFriendRequest(receiverId: number): Promise<FriendRequest> {
  return apiFetch<FriendRequest>("/api/friends/requests", {
    method: "POST",
    body: JSON.stringify({ receiverId }),
  });
}

export function acceptFriendRequest(requestId: number): Promise<unknown> {
  return apiFetch(`/api/friends/requests/${requestId}/accept`, {
    method: "PATCH",
  });
}

export function rejectFriendRequest(requestId: number): Promise<FriendRequest> {
  return apiFetch<FriendRequest>(`/api/friends/requests/${requestId}/reject`, {
    method: "PATCH",
  });
}

export function removeFriend(userId: number): Promise<{ success: boolean }> {
  return apiFetch(`/api/friends/${userId}`, { method: "DELETE" });
}

export function fetchUserPresence(userId: number): Promise<UserPresence> {
  return apiFetch<UserPresence>(`/api/friends/presence/${userId}`);
}

export function fetchIncomingFriendRequests(): Promise<FriendRequest[]> {
  return apiFetch<FriendRequest[]>("/api/friends/requests/incoming");
}

export function fetchOutgoingFriendRequests(): Promise<FriendRequest[]> {
  return apiFetch<FriendRequest[]>("/api/friends/requests/outgoing");
}
