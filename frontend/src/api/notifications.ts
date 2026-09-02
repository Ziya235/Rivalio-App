import { getToken } from "./auth";
import type { UserBrief } from "./friends";

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

export type NotificationType =
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPTED"
  | "NEW_MESSAGE"
  | "TEAM_INVITE"
  | "LEAGUE_INVITE"
  | "MATCH_INVITE"
  | "JOIN_REQUEST";

export type AppNotification = {
  id: number;
  userId: number;
  actorId: number | null;
  type: NotificationType;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
  actor: UserBrief | null;
  friendRequestStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | null;
};

export type NotificationsResponse = {
  notifications: AppNotification[];
  unreadCount: number;
};

export function fetchNotifications(limit = 50): Promise<NotificationsResponse> {
  return apiFetch<NotificationsResponse>(`/api/notifications?limit=${limit}`);
}

export function fetchUnreadNotificationCount(): Promise<{ unreadCount: number }> {
  return apiFetch<{ unreadCount: number }>("/api/notifications/unread-count");
}

export function markNotificationRead(
  notificationId: number,
): Promise<{ unreadCount: number }> {
  return apiFetch(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export function markAllNotificationsRead(): Promise<{ unreadCount: number }> {
  return apiFetch("/api/notifications/read-all", { method: "PATCH" });
}
