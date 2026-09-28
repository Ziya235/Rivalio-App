import type { RequestStatus, UserBrief } from "./common";

export type FriendRequest = {
  id: number;
  senderId: number;
  receiverId: number;
  status: RequestStatus;
  createdAt: string;
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

/** backend/services/conversationService.js → formatMessage */
export type ChatMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  clientMessageId: string | null;
  createdAt: string;
  deletedAt: string | null;
  sender: UserBrief | null;
  readByOthers: boolean;
  /** Mobile-only: optimistic message waiting for the server echo. */
  pending?: boolean;
  /** Mobile-only: server rejected the optimistic message. */
  failed?: boolean;
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
