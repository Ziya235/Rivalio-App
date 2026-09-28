import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { chatApi, notificationsApi } from "../api/people";
import { realtime, type EventName, type ServerEvents } from "../sockets/socket";
import { prefs } from "../storage/prefs";
import type { AppNotification } from "../types/notification";
import { useAuth } from "./AuthContext";

type RealtimeContextValue = {
  isConnected: boolean;
  /** Changes each time a new socket session starts; subscribers depend on it. */
  sessionId: number;
  notifications: AppNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  patchNotification: (id: number, patch: Partial<AppNotification>) => void;
  markNotificationRead: (id: number) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  onlineUsers: Record<number, { online: boolean; lastSeenAt: string | null }>;
  unreadChatPeople: number;
  refreshChatUnread: () => Promise<void>;
  clearChatBadge: () => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

// Types whose extra entity data (invite/team names) needs a full reload.
const RELOAD_TYPES = new Set([
  "CHAMPIONSHIP_INVITE",
  "LEAGUE_INVITE",
  "JOIN_REQUEST",
  "CHAMPIONSHIP_JOIN_REQUEST",
]);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user, token, logout } = useAuth();
  const userId = user?.id ?? null;
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<RealtimeContextValue["onlineUsers"]>({});
  const [unreadChatPeople, setUnreadChatPeople] = useState(0);
  const chatSeenAt = useRef<string | null>(null);

  const refreshNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await notificationsApi.list(100);
      setNotifications(data.notifications.filter((item) => item.type !== "NEW_MESSAGE"));
      setUnreadCount(data.unreadCount);
    } catch {
      // Badge stays at its last value; the notifications screen shows errors.
    }
  }, [userId]);

  const refreshChatUnread = useCallback(async () => {
    if (!userId) return;
    try {
      const since = chatSeenAt.current;
      const data = await chatApi.unreadPeople(since);
      if (since === chatSeenAt.current) setUnreadChatPeople(data.unreadPeopleCount);
    } catch {
      // Non-critical badge.
    }
  }, [userId]);

  const clearChatBadge = useCallback(() => {
    if (!userId) return;
    const now = new Date().toISOString();
    chatSeenAt.current = now;
    setUnreadChatPeople(0);
    void prefs.setChatSeenAt(userId, now);
  }, [userId]);

  const patchNotification = useCallback((id: number, patch: Partial<AppNotification>) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const markNotificationRead = useCallback(async (id: number) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id && !item.isRead ? { ...item, isRead: true } : item)),
    );
    try {
      const result = await notificationsApi.markRead(id);
      setUnreadCount(result.unreadCount);
    } catch {
      // Server stays source of truth on next refresh.
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    await notificationsApi.markAllRead();
  }, []);

  // Socket lifecycle bound to the session token.
  useEffect(() => {
    if (!token || !userId) {
      realtime.stop();
      setIsConnected(false);
      setNotifications([]);
      setUnreadCount(0);
      setOnlineUsers({});
      setUnreadChatPeople(0);
      return;
    }

    let cancelled = false;
    realtime.start(token, () => void logout());
    const offStatus = realtime.onStatus((connected) => {
      setIsConnected(connected);
      // After a reconnect we may have missed events: resync the badges.
      if (connected) {
        void refreshNotifications();
        void refreshChatUnread();
      }
    });

    const subs = [
      realtime.on("notification_received", ({ notification, unreadCount: count }) => {
        if (notification.type !== "NEW_MESSAGE") {
          setNotifications((current) =>
            current.some((item) => item.id === notification.id)
              ? current
              : [notification, ...current],
          );
        }
        setUnreadCount(count);
        if (RELOAD_TYPES.has(notification.type)) void refreshNotifications();
      }),
      realtime.on("notifications_removed", ({ notificationIds, unreadCount: count }) => {
        const removed = new Set(notificationIds ?? []);
        setNotifications((current) => current.filter((item) => !removed.has(item.id)));
        setUnreadCount(count);
      }),
      realtime.on("friend_request_received", () => void refreshNotifications()),
      realtime.on("friend_request_accepted", () => void refreshNotifications()),
      realtime.on("friend_request_resolved", ({ friendRequestId, status }) => {
        setNotifications((current) =>
          current.map((item) =>
            item.type === "FRIEND_REQUEST" &&
            item.entityId === String(friendRequestId) &&
            (item.friendRequestStatus === "PENDING" || item.friendRequestStatus == null)
              ? { ...item, friendRequestStatus: status, isRead: true }
              : item,
          ),
        );
        void refreshNotifications();
      }),
      realtime.on("user_presence_changed", ({ userId: id, online, lastSeenAt }) => {
        setOnlineUsers((current) => ({ ...current, [id]: { online, lastSeenAt } }));
      }),
      realtime.on("chat_unread", () => void refreshChatUnread()),
    ];

    void prefs.getChatSeenAt(userId).then((value) => {
      if (cancelled) return;
      chatSeenAt.current = value;
      void refreshChatUnread();
    });
    void refreshNotifications();
    setIsConnected(realtime.isConnected());
    setSessionId((id) => id + 1);

    return () => {
      cancelled = true;
      offStatus();
      subs.forEach((unsubscribe) => unsubscribe());
    };
  }, [token, userId, logout, refreshNotifications, refreshChatUnread]);

  // Background → disconnect (server records lastSeenAt / offline presence);
  // foreground → reconnect, and onStatus resyncs badges.
  useEffect(() => {
    if (!token) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") realtime.resume();
      else if (state === "background") realtime.pause();
    });
    return () => sub.remove();
  }, [token]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      isConnected,
      sessionId,
      notifications,
      unreadCount,
      refreshNotifications,
      patchNotification,
      markNotificationRead,
      markAllNotificationsRead,
      onlineUsers,
      unreadChatPeople,
      refreshChatUnread,
      clearChatBadge,
    }),
    [
      isConnected,
      sessionId,
      notifications,
      unreadCount,
      refreshNotifications,
      patchNotification,
      markNotificationRead,
      markAllNotificationsRead,
      onlineUsers,
      unreadChatPeople,
      refreshChatUnread,
      clearChatBadge,
    ],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used within RealtimeProvider");
  return ctx;
}

/**
 * Subscribes a screen to a socket event for as long as it is mounted.
 * Handler identity may change freely; only one listener is ever attached.
 */
export function useSocketEvent<E extends EventName>(
  event: E,
  handler: (payload: ServerEvents[E]) => void,
  enabled = true,
) {
  const { sessionId } = useRealtime();
  const saved = useRef(handler);
  saved.current = handler;
  useEffect(() => {
    if (!enabled || sessionId === 0) return;
    return realtime.on(event, (payload) => saved.current(payload));
  }, [event, enabled, sessionId]);
}
