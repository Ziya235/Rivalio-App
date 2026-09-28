import { io, type Socket } from "socket.io-client";
import { env } from "../config/env";
import type { ChatMessage } from "../types/chat";
import type { AppNotification } from "../types/notification";
import type { UserBrief } from "../types/common";

/** Events emitted by backend/socket/* and backend/services/*. */
export type ServerEvents = {
  notification_received: { notification: AppNotification; unreadCount: number };
  notifications_removed: { notificationIds: number[]; unreadCount: number };
  friend_request_received: unknown;
  friend_request_accepted: unknown;
  friend_request_resolved: { friendRequestId: number; status: "ACCEPTED" | "REJECTED" };
  social_requests_changed: Record<string, never>;
  user_presence_changed: { userId: number; online: boolean; lastSeenAt: string };
  chat_unread: { conversationId: number; senderId?: number };
  new_message: { message: ChatMessage };
  messages_read: { conversationId: number; readByUserId: number; upToMessageId: number | null };
  typing_start: { conversationId: number; user?: UserBrief };
  typing_stop: { conversationId: number; userId: number };
  error_message: { message: string; clientMessageId?: string };
};

/** Events the backend listens for (backend/socket/socket.handlers.js). */
type ClientEvents = {
  join_conversation: { conversationId: number };
  leave_conversation: { conversationId: number };
  send_message: { conversationId: number; content: string; clientMessageId: string };
  mark_messages_read: { conversationId: number; upToMessageId?: number };
  typing_start: { conversationId: number };
  typing_stop: { conversationId: number };
};

export type EventName = keyof ServerEvents;
type Handler<E extends EventName> = (payload: ServerEvents[E]) => void;

// One socket per signed-in session. Handlers are registered on the instance,
// so they survive automatic reconnects; they are only dropped on logout.
let socket: Socket | null = null;
let sessionToken: string | null = null;

type StatusListener = (connected: boolean) => void;
const statusListeners = new Set<StatusListener>();
type AuthFailureListener = () => void;
let authFailureListener: AuthFailureListener | null = null;

function notifyStatus(connected: boolean) {
  statusListeners.forEach((listener) => listener(connected));
}

export const realtime = {
  start(token: string, onAuthFailure: AuthFailureListener) {
    authFailureListener = onAuthFailure;
    if (socket && sessionToken === token) {
      if (!socket.connected) socket.connect();
      return;
    }
    realtime.stop();
    sessionToken = token;
    socket = io(env.apiUrl, {
      auth: { token },
      // React Native has no XHR-streaming benefit; websocket-only avoids
      // long-polling fallbacks that misbehave on mobile networks.
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      timeout: 15_000,
    });
    socket.on("connect", () => notifyStatus(true));
    socket.on("disconnect", () => notifyStatus(false));
    socket.on("connect_error", (error: Error) => {
      notifyStatus(false);
      // socket.auth.js rejects bad/expired tokens with "Unauthorized".
      if (error.message === "Unauthorized") authFailureListener?.();
    });
  },

  /** Background: drop the connection so the server marks the user offline. */
  pause() {
    socket?.disconnect();
  },

  resume() {
    if (socket && !socket.connected) socket.connect();
  },

  stop() {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    socket = null;
    sessionToken = null;
    notifyStatus(false);
  },

  isConnected() {
    return Boolean(socket?.connected);
  },

  onStatus(listener: StatusListener) {
    statusListeners.add(listener);
    return () => {
      statusListeners.delete(listener);
    };
  },

  /** Subscribe; returns an unsubscribe function for effect cleanup. */
  on<E extends EventName>(event: E, handler: Handler<E>): () => void {
    const target = socket;
    if (!target) return () => undefined;
    target.on(event as string, handler as (...args: unknown[]) => void);
    return () => {
      target.off(event as string, handler as (...args: unknown[]) => void);
    };
  },

  emit<E extends keyof ClientEvents>(event: E, payload: ClientEvents[E]) {
    socket?.emit(event, payload);
  },
};
