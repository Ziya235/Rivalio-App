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
import {
  connectSocket,
  disconnectSocket,
  subscribeSocketEvent,
} from "../services/socket";
import { useAuth } from "./AuthContext";
import { fetchUnreadPeopleCount } from "../api/chat";
import {
  fetchNotifications,
  type AppNotification,
} from "../api/notifications";

function chatSeenKey(userId: number) {
  return `rivalio.chatBadgeSeenAt.${userId}`;
}

type SocketContextValue = {
  isConnected: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markLocalNotificationRead: (id: number) => void;
  markAllLocalNotificationsRead: () => void;
  patchNotification: (
    id: number,
    patch: Partial<AppNotification>,
  ) => void;
  prependNotification: (notification: AppNotification) => void;
  onlineUsers: Record<number, boolean>;
  lastSeenMap: Record<number, string | null>;
  unreadChatPeople: number;
  refreshChatUnread: () => Promise<void>;
  clearChatBadge: () => void;
};

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<Record<number, boolean>>({});
  const [lastSeenMap, setLastSeenMap] = useState<Record<number, string | null>>(
    {},
  );
  const [unreadChatPeople, setUnreadChatPeople] = useState(0);
  const mountedRef = useRef(true);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    const data = await fetchNotifications(100);
    if (!mountedRef.current) return;
    setNotifications(data.notifications.filter((item) => item.type !== "NEW_MESSAGE"));
    setUnreadCount(data.unreadCount);
  }, [user]);

  const markLocalNotificationRead = useCallback((id: number) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, isRead: true } : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const markAllLocalNotificationsRead = useCallback(() => {
    setNotifications((current) =>
      current.map((item) =>
        item.isRead ? item : { ...item, isRead: true },
      ),
    );
    setUnreadCount(0);
  }, []);

  const patchNotification = useCallback(
    (id: number, patch: Partial<AppNotification>) => {
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const prependNotification = useCallback((notification: AppNotification) => {
    if (notification.type === "NEW_MESSAGE") return;
    setNotifications((current) => {
      if (current.some((item) => item.id === notification.id)) return current;
      return [notification, ...current];
    });
    if (!notification.isRead) {
      setUnreadCount((count) => count + 1);
    }
  }, []);

  const refreshChatUnread = useCallback(async () => {
    if (!user) return;
    const since = localStorage.getItem(chatSeenKey(user.id));
    const data = await fetchUnreadPeopleCount(since);
    if (!mountedRef.current) return;
    const latestSince = localStorage.getItem(chatSeenKey(user.id));
    if (since !== latestSince) return;
    setUnreadChatPeople(data.unreadPeopleCount);
  }, [user]);

  const clearChatBadge = useCallback(() => {
    if (!user) return;
    localStorage.setItem(chatSeenKey(user.id), new Date().toISOString());
    setUnreadChatPeople(0);
  }, [user]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setIsConnected(false);
      setNotifications([]);
      setUnreadCount(0);
      setOnlineUsers({});
      setLastSeenMap({});
      setUnreadChatPeople(0);
      return;
    }

    let cancelled = false;
    let unsubscribers: Array<() => void> = [];

    connectSocket()
      .then(() => {
        if (cancelled || !mountedRef.current) return;
        setIsConnected(true);
        unsubscribers = [
          subscribeSocketEvent("notification_received", (payload: {
            notification: AppNotification;
            unreadCount: number;
          }) => {
            prependNotification(payload.notification);
            setUnreadCount(payload.unreadCount);
            if (payload.notification.type === "CHAMPIONSHIP_INVITE" ||
              payload.notification.type === "LEAGUE_INVITE" ||
              payload.notification.type === "JOIN_REQUEST" ||
              payload.notification.type === "CHAMPIONSHIP_JOIN_REQUEST") {
              void refreshNotifications();
            }
          }),
          subscribeSocketEvent("notifications_removed", (payload: {
            notificationIds: number[];
            unreadCount: number;
          }) => {
            const removed = new Set(payload.notificationIds ?? []);
            setNotifications((current) =>
              current.filter((item) => !removed.has(item.id)),
            );
            setUnreadCount(payload.unreadCount);
          }),
          subscribeSocketEvent("friend_request_received", () => {
            refreshNotifications();
          }),
          subscribeSocketEvent("friend_request_accepted", () => {
            refreshNotifications();
          }),
          subscribeSocketEvent("friend_request_resolved", (payload: {
            friendRequestId: number;
            status: "ACCEPTED" | "REJECTED";
          }) => {
            setNotifications((current) =>
              current.map((item) =>
                item.type === "FRIEND_REQUEST" &&
                item.entityId === String(payload.friendRequestId) &&
                (item.friendRequestStatus === "PENDING" ||
                  item.friendRequestStatus == null)
                  ? {
                      ...item,
                      friendRequestStatus: payload.status,
                      isRead: true,
                    }
                  : item,
              ),
            );
            refreshNotifications();
          }),
          subscribeSocketEvent("user_presence_changed", (payload: {
            userId: number;
            online: boolean;
            lastSeenAt: string;
          }) => {
            setOnlineUsers((current) => ({
              ...current,
              [payload.userId]: payload.online,
            }));
            setLastSeenMap((current) => ({
              ...current,
              [payload.userId]: payload.lastSeenAt,
            }));
          }),
          subscribeSocketEvent("chat_unread", () => {
            void refreshChatUnread();
          }),
        ];
        return Promise.all([refreshNotifications(), refreshChatUnread()]);
      })
      .catch(() => {
        if (mountedRef.current && !cancelled) setIsConnected(false);
      });

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsub) => unsub());
      disconnectSocket();
      setIsConnected(false);
    };
  }, [user, refreshNotifications, refreshChatUnread, prependNotification]);

  const value = useMemo(
    () => ({
      isConnected,
      notifications,
      unreadCount,
      refreshNotifications,
      markLocalNotificationRead,
      markAllLocalNotificationsRead,
      patchNotification,
      prependNotification,
      onlineUsers,
      lastSeenMap,
      unreadChatPeople,
      refreshChatUnread,
      clearChatBadge,
    }),
    [
      isConnected,
      notifications,
      unreadCount,
      refreshNotifications,
      markLocalNotificationRead,
      markAllLocalNotificationsRead,
      patchNotification,
      prependNotification,
      onlineUsers,
      lastSeenMap,
      unreadChatPeople,
      refreshChatUnread,
      clearChatBadge,
    ],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return ctx;
}
