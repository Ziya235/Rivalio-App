import type {
  ChatMessage,
  ConversationSummary,
  FriendListItem,
  FriendRequest,
  FriendshipStatus,
  MessagesPage,
  UserPresence,
} from "../types/chat";
import type { NotificationsResponse } from "../types/notification";
import type { PlayerProfile, UserSearchHit } from "../types/player";
import { api } from "./client";

export const playersApi = {
  get(playerId: number) {
    return api.get<PlayerProfile>(`/api/players/${playerId}`);
  },
};

export const usersApi = {
  /** Backend rate-limits this to 60/min per user — callers must debounce. */
  search(q: string, signal?: AbortSignal) {
    const query = q.trim().replace(/^@+/, "");
    if (!query) return Promise.resolve<UserSearchHit[]>([]);
    return api.get<UserSearchHit[]>("/api/users/search", { params: { q: query }, signal });
  },
  profile(userId: number) {
    return api.get<PlayerProfile>(`/api/users/${userId}`);
  },
};

export const friendsApi = {
  status(userId: number) {
    return api.get<FriendshipStatus>(`/api/friends/status/${userId}`);
  },
  list() {
    return api.get<FriendListItem[]>("/api/friends");
  },
  incoming() {
    return api.get<FriendRequest[]>("/api/friends/requests/incoming");
  },
  send(receiverId: number) {
    return api.post<FriendRequest>("/api/friends/requests", { receiverId });
  },
  accept(requestId: number) {
    return api.patch<unknown>(`/api/friends/requests/${requestId}/accept`);
  },
  reject(requestId: number) {
    return api.patch<FriendRequest>(`/api/friends/requests/${requestId}/reject`);
  },
  remove(userId: number) {
    return api.delete<unknown>(`/api/friends/${userId}`);
  },
  presence(userId: number) {
    return api.get<UserPresence>(`/api/friends/presence/${userId}`);
  },
};

export const chatApi = {
  conversations() {
    return api.get<ConversationSummary[]>("/api/conversations");
  },
  openDirect(userId: number) {
    return api.post<ConversationSummary>(`/api/conversations/direct/${userId}`);
  },
  unreadPeople(since?: string | null) {
    return api.get<{ unreadPeopleCount: number }>("/api/conversations/unread-people", {
      params: { since: since || undefined },
    });
  },
  messages(conversationId: number, params: { cursor?: number; limit?: number } = {}) {
    return api.get<MessagesPage>(`/api/conversations/${conversationId}/messages`, {
      params: { cursor: params.cursor, limit: params.limit ?? 30 },
    });
  },
};

export const notificationsApi = {
  list(limit = 100) {
    return api.get<NotificationsResponse>("/api/notifications", { params: { limit } });
  },
  markRead(id: number) {
    return api.patch<{ unreadCount: number }>(`/api/notifications/${id}/read`);
  },
  markAllRead() {
    return api.patch<{ unreadCount: number }>("/api/notifications/read-all");
  },
};

export type { ChatMessage };
