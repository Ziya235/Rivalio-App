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

export type ChatMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  clientMessageId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  sender: UserBrief | null;
  readByOthers: boolean;
};

export type ConversationSummary = {
  id: number;
  type: "DIRECT" | "GROUP" | "TEAM" | "LEAGUE";
  otherParticipant: UserBrief | null;
  lastMessage: ChatMessage | null;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MessagesPage = {
  messages: ChatMessage[];
  nextCursor: number | null;
  hasMore: boolean;
};

export function fetchConversations(): Promise<ConversationSummary[]> {
  return apiFetch<ConversationSummary[]>("/api/conversations");
}

export function createDirectConversation(
  userId: number,
): Promise<ConversationSummary> {
  return apiFetch<ConversationSummary>(`/api/conversations/direct/${userId}`, {
    method: "POST",
  });
}

export function fetchMessages(
  conversationId: number,
  params?: { cursor?: number; limit?: number },
): Promise<MessagesPage> {
  const search = new URLSearchParams();
  if (params?.cursor) search.set("cursor", String(params.cursor));
  if (params?.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return apiFetch<MessagesPage>(
    `/api/conversations/${conversationId}/messages${query ? `?${query}` : ""}`,
  );
}
