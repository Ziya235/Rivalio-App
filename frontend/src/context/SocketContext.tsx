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
import {
  fetchNotifications,
  type AppNotification,
} from "../api/notifications";

type SocketContextValue = {
  isConnected: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markLocalNotificationRead: (id: number) => void;
  patchNotification: (
    id: number,
    patch: Partial<AppNotification>,
  ) => void;
  prependNotification: (notification: AppNotification) => void;
  onlineUsers: Record<number, boolean>;
  lastSeenMap: Record<number, string | null>;
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
  const mountedRef = useRef(true);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    const data = await fetchNotifications();
    if (!mountedRef.current) return;
    setNotifications(data.notifications);
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

  const patchNotification = useCallback(
    (id: number, patch: Partial<AppNotification>) => {
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const prependNotification = useCallback((notification: AppNotification) => {
    setNotifications((current) => {
      if (current.some((item) => item.id === notification.id)) return current;
      return [notification, ...current];
    });
    if (!notification.isRead) {
      setUnreadCount((count) => count + 1);
    }
  }, []);

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
      return;
    }

    let unsubscribers: Array<() => void> = [];

    connectSocket()
      .then(() => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        return refreshNotifications();
      })
      .catch(() => {
        if (mountedRef.current) setIsConnected(false);
      });

    unsubscribers = [
      subscribeSocketEvent("notification_received", (payload: {
        notification: AppNotification;
        unreadCount: number;
      }) => {
        prependNotification(payload.notification);
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
            item.entityId === String(payload.friendRequestId)
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
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      disconnectSocket();
      setIsConnected(false);
    };
  }, [user, refreshNotifications, prependNotification]);

  const value = useMemo(
    () => ({
      isConnected,
      notifications,
      unreadCount,
      refreshNotifications,
      markLocalNotificationRead,
      patchNotification,
      prependNotification,
      onlineUsers,
      lastSeenMap,
    }),
    [
      isConnected,
      notifications,
      unreadCount,
      refreshNotifications,
      markLocalNotificationRead,
      patchNotification,
      prependNotification,
      onlineUsers,
      lastSeenMap,
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
