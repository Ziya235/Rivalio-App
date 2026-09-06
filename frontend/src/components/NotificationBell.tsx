import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, XCircle } from "lucide-react";
import { Avatar } from "./ui";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { acceptFriendRequest, rejectFriendRequest } from "../api/friends";
import {
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "../api/notifications";
import {
  fetchMyChallengeNotifications,
  fetchMyPlayerSearchNotifications,
  respondChallengeRequest,
  respondPlayerSearchRequest,
  type ChallengeNotificationRequest,
  type PlayerSearchNotificationRequest,
} from "../api/social";

type NotificationBellProps = {
  isLightMode?: boolean;
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("az", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function notificationLabel(notification: AppNotification) {
  if (
    notification.type === "FRIEND_REQUEST" &&
    notification.friendRequestStatus === "ACCEPTED"
  ) {
    return "dostluq sorğusunu qəbul etdiniz";
  }
  if (
    notification.type === "FRIEND_REQUEST" &&
    notification.friendRequestStatus === "REJECTED"
  ) {
    return "dostluq sorğusunu rədd etdiniz";
  }

  switch (notification.type) {
    case "FRIEND_REQUEST":
      return "sizə dostluq sorğusu göndərdi";
    case "FRIEND_ACCEPTED":
      return "dostluq sorğunuzu qəbul etdi";
    case "NEW_MESSAGE":
      return "yeni mesaj göndərdi";
    default:
      return "bildiriş göndərdi";
  }
}

function isPendingFriendRequest(notification: AppNotification) {
  return (
    notification.type === "FRIEND_REQUEST" &&
    (notification.friendRequestStatus === "PENDING" ||
      notification.friendRequestStatus == null)
  );
}

function personName(person?: {
  firstName?: string;
  lastName?: string;
  username?: string;
} | null) {
  if (!person) return "İstifadəçi";
  const full = `${person.firstName || ""} ${person.lastName || ""}`.trim();
  return full || person.username || "İstifadəçi";
}

function playerSearchLabel(
  request: PlayerSearchNotificationRequest,
  incoming: boolean,
) {
  if (incoming) {
    return "komandanızın oyunçu axtarışına qoşulmaq istəyir";
  }
  if (request.status === "ACCEPTED") {
    return "oyunçu axtarışı sorğunuzu qəbul etdi";
  }
  if (request.status === "CANCELLED") {
    return "oyunçu axtarışını bağladı";
  }
  return "oyunçu axtarışı sorğunuzu rədd etdi";
}

function challengeLabel(
  request: ChallengeNotificationRequest,
  incoming: boolean,
) {
  if (incoming) {
    if (request.status === "PENDING") {
      return "sizin challenge elanınıza sorğu göndərdi";
    }
    if (request.status === "ACCEPTED") {
      return "challenge sorğusunu qəbul etdiniz";
    }
    if (request.status === "REJECTED") {
      return "challenge sorğusunu rədd etdiniz";
    }
    return "üçün başqa rəqib seçildi";
  }
  if (request.status === "ACCEPTED") {
    return "challenge sorğunuzu qəbul etdi";
  }
  if (request.status === "REJECTED") {
    return "challenge sorğunuzu rədd etdi";
  }
  return "başqa rəqib seçdi";
}

function seenStorageKey(userId: number) {
  return `rivalio.notificationSeen.${userId}`;
}

function loadSeenKeys(userId: number) {
  try {
    const raw = localStorage.getItem(seenStorageKey(userId));
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as unknown;
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((key): key is string => typeof key === "string")
        : [],
    );
  } catch {
    return new Set<string>();
  }
}

function saveSeenKeys(userId: number, keys: Set<string>) {
  localStorage.setItem(seenStorageKey(userId), JSON.stringify([...keys]));
}

export default function NotificationBell({
  isLightMode = false,
}: NotificationBellProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    refreshNotifications,
    markLocalNotificationRead,
    markAllLocalNotificationsRead,
    patchNotification,
  } = useSocket();
  const [open, setOpen] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [seenKeys, setSeenKeys] = useState<Set<string>>(() =>
    user ? loadSeenKeys(user.id) : new Set(),
  );
  const [playerIncoming, setPlayerIncoming] = useState<
    PlayerSearchNotificationRequest[]
  >([]);
  const [playerOutcomes, setPlayerOutcomes] = useState<
    PlayerSearchNotificationRequest[]
  >([]);
  const [challengeIncoming, setChallengeIncoming] = useState<
    ChallengeNotificationRequest[]
  >([]);
  const [challengeOutcomes, setChallengeOutcomes] = useState<
    ChallengeNotificationRequest[]
  >([]);
  const ref = useRef<HTMLDivElement>(null);

  const iconButton = isLightMode
    ? "text-slate-600 hover:text-slate-950 hover:bg-slate-900/5"
    : "text-white/70 hover:text-white hover:bg-white/5";
  const panel = isLightMode
    ? "bg-white border-slate-900/10"
    : "bg-[#12121a] border-white/10";
  const strongText = isLightMode ? "text-slate-900" : "text-white";
  const mutedText = isLightMode ? "text-slate-500" : "text-white/45";

  const loadExtraNotifications = useCallback(async () => {
    try {
      const [playerSearch, challenges] = await Promise.all([
        fetchMyPlayerSearchNotifications(),
        fetchMyChallengeNotifications(),
      ]);
      setPlayerIncoming(playerSearch.incoming);
      setPlayerOutcomes(playerSearch.outcomes);
      setChallengeIncoming(challenges.incoming);
      setChallengeOutcomes(challenges.outcomes);
    } catch {
      // Keep previously loaded extra notifications if a refresh fails.
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setSeenKeys(new Set());
      return;
    }
    setSeenKeys(loadSeenKeys(user.id));
  }, [user]);

  useEffect(() => {
    void loadExtraNotifications();
    const onFocus = () => {
      void loadExtraNotifications();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadExtraNotifications]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      await markAllNotificationsRead();
      await refreshNotifications();
      await loadExtraNotifications();
    })();
  }, [open, refreshNotifications, loadExtraNotifications]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const extraKeys = useMemo(
    () => [
      ...playerIncoming.map((request) => `player-in-${request.id}`),
      ...playerOutcomes.map((request) => `player-out-${request.id}`),
      ...challengeIncoming.map((request) => `challenge-in-${request.id}`),
      ...challengeOutcomes.map((request) => `challenge-out-${request.id}`),
    ],
    [playerIncoming, playerOutcomes, challengeIncoming, challengeOutcomes],
  );

  useEffect(() => {
    if (!open || !user || extraKeys.length === 0) return;
    setSeenKeys((prev) => {
      const missing = extraKeys.filter((key) => !prev.has(key));
      if (missing.length === 0) return prev;
      const next = new Set(prev);
      missing.forEach((key) => next.add(key));
      saveSeenKeys(user.id, next);
      return next;
    });
  }, [open, user, extraKeys]);

  const extraUnread = extraKeys.filter((key) => !seenKeys.has(key)).length;
  const totalUnread = unreadCount + extraUnread;
  const hasItems =
    notifications.length > 0 ||
    playerIncoming.length > 0 ||
    playerOutcomes.length > 0 ||
    challengeIncoming.length > 0 ||
    challengeOutcomes.length > 0;

  const handleRead = async (notification: AppNotification) => {
    if (notification.isRead) return;
    markLocalNotificationRead(notification.id);
    await markNotificationRead(notification.id);
  };

  const handleAccept = async (notification: AppNotification) => {
    if (!notification.entityId) return;
    setBusyKey(`friend-${notification.id}`);
    try {
      await acceptFriendRequest(Number(notification.entityId));
      patchNotification(notification.id, {
        friendRequestStatus: "ACCEPTED",
        isRead: true,
      });
      if (!notification.isRead) {
        markLocalNotificationRead(notification.id);
      }
      await refreshNotifications();
    } finally {
      setBusyKey(null);
    }
  };

  const handleReject = async (notification: AppNotification) => {
    if (!notification.entityId) return;
    setBusyKey(`friend-${notification.id}`);
    try {
      await rejectFriendRequest(Number(notification.entityId));
      patchNotification(notification.id, {
        friendRequestStatus: "REJECTED",
        isRead: true,
      });
      if (!notification.isRead) {
        markLocalNotificationRead(notification.id);
      }
      await refreshNotifications();
    } finally {
      setBusyKey(null);
    }
  };

  const handlePlayerRespond = async (
    request: PlayerSearchNotificationRequest,
    action: "accept" | "reject",
  ) => {
    setBusyKey(`player-${request.id}`);
    try {
      await respondPlayerSearchRequest(request.id, action);
      await loadExtraNotifications();
    } finally {
      setBusyKey(null);
    }
  };

  const handleChallengeRespond = async (
    request: ChallengeNotificationRequest,
    action: "accept" | "reject",
  ) => {
    setBusyKey(`challenge-${request.id}`);
    try {
      await respondChallengeRequest(request.id, action);
      await loadExtraNotifications();
    } finally {
      setBusyKey(null);
    }
  };

  const entries = [
    ...notifications.map((notification) => ({
      key: `social-${notification.id}`,
      at: Date.parse(notification.createdAt) || 0,
      kind: "social" as const,
      notification,
    })),
    ...playerIncoming.map((request) => ({
      key: `player-in-${request.id}`,
      at: Date.parse(request.createdAt) || 0,
      kind: "player" as const,
      request,
      incoming: true,
    })),
    ...playerOutcomes.map((request) => ({
      key: `player-out-${request.id}`,
      at: Date.parse(request.respondedAt || request.createdAt) || 0,
      kind: "player" as const,
      request,
      incoming: false,
    })),
    ...challengeIncoming.map((request) => ({
      key: `challenge-in-${request.id}`,
      at: Date.parse(request.createdAt) || 0,
      kind: "challenge" as const,
      request,
      incoming: true,
    })),
    ...challengeOutcomes.map((request) => ({
      key: `challenge-out-${request.id}`,
      at: Date.parse(request.respondedAt || request.createdAt) || 0,
      kind: "challenge" as const,
      request,
      incoming: false,
    })),
  ].sort((a, b) => b.at - a.at);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((current) => {
            if (!current) {
              markAllLocalNotificationsRead();
              if (user) {
                setSeenKeys((prev) => {
                  const next = new Set(prev);
                  extraKeys.forEach((key) => next.add(key));
                  saveSeenKeys(user.id, next);
                  return next;
                });
              }
            }
            return !current;
          });
        }}
        className={`relative p-2 rounded-lg transition-all ${iconButton}`}
        aria-label="Bildirişlər"
      >
        <Bell size={18} />
        {totalUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#c5f135] text-[#08080e] text-[10px] font-bold flex items-center justify-center">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl overflow-hidden z-50 ${panel}`}
        >
          <div
            className={`flex items-center px-4 py-3 border-b ${
              isLightMode ? "border-slate-900/10" : "border-white/8"
            }`}
          >
            <p className={`text-sm font-semibold ${strongText}`}>Bildirişlər</p>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {!hasItems ? (
              <p className={`px-4 py-8 text-center text-sm ${mutedText}`}>
                Bildiriş yoxdur
              </p>
            ) : (
              entries.map((entry) => {
                if (entry.kind === "player") {
                  const request = entry.request;
                  const actorName = entry.incoming
                    ? personName(request.user)
                    : request.playerSearch.hostTeam.name;
                  const pending =
                    entry.incoming && request.status === "PENDING";
                  const accepted = request.status === "ACCEPTED";
                  const rejected =
                    request.status === "REJECTED" ||
                    request.status === "CANCELLED";
                  const busy = busyKey === `player-${request.id}`;

                  return (
                    <div
                      key={entry.key}
                      className={`px-4 py-3 border-b last:border-b-0 ${
                        isLightMode ? "border-slate-900/8" : "border-white/6"
                      } ${pending ? "" : "opacity-80"}`}
                    >
                      <div className="flex gap-3">
                        <Avatar
                          name={actorName}
                          src={
                            (entry.incoming
                              ? request.user?.image
                              : request.playerSearch.hostTeam.logo) || undefined
                          }
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${strongText}`}>
                            <span className="font-semibold">{actorName}</span>{" "}
                            <span className={mutedText}>
                              {playerSearchLabel(request, entry.incoming)}
                            </span>
                          </p>
                          <p className={`mt-1 text-[11px] ${mutedText}`}>
                            {formatTime(request.createdAt)}
                          </p>
                          {pending ? (
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void handlePlayerRespond(request, "accept")
                                }
                                className="px-3 py-1.5 rounded-lg bg-[#c5f135] text-[#08080e] text-xs font-semibold disabled:opacity-50"
                              >
                                Qəbul et
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void handlePlayerRespond(request, "reject")
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                  isLightMode
                                    ? "border-slate-900/15 text-slate-700"
                                    : "border-white/15 text-white/75"
                                } disabled:opacity-50`}
                              >
                                Rədd et
                              </button>
                            </div>
                          ) : null}
                          {!pending && accepted && !entry.incoming ? (
                            <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                              <CheckCircle2 size={13} />
                              Qəbul edildi
                            </p>
                          ) : null}
                          {!pending && rejected && !entry.incoming ? (
                            <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-rose-400">
                              <XCircle size={13} />
                              {request.status === "CANCELLED"
                                ? "Bağlandı"
                                : "Rədd edildi"}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (entry.kind === "challenge") {
                  const request = entry.request;
                  const actorName = entry.incoming
                    ? request.team.name
                    : request.challenge.team.name;
                  const pending =
                    entry.incoming && request.status === "PENDING";
                  const accepted = request.status === "ACCEPTED";
                  const rejected =
                    request.status === "REJECTED" ||
                    request.status === "CANCELLED";
                  const busy = busyKey === `challenge-${request.id}`;

                  return (
                    <div
                      key={entry.key}
                      className={`px-4 py-3 border-b last:border-b-0 ${
                        isLightMode ? "border-slate-900/8" : "border-white/6"
                      } ${pending ? "" : "opacity-80"}`}
                    >
                      <div className="flex gap-3">
                        <Avatar
                          name={actorName}
                          src={
                            (entry.incoming
                              ? request.requestedBy?.image || request.team.logo
                              : request.challenge.team.logo) || undefined
                          }
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${strongText}`}>
                            <span className="font-semibold">{actorName}</span>{" "}
                            <span className={mutedText}>
                              {challengeLabel(request, entry.incoming)}
                            </span>
                          </p>
                          <p className={`mt-1 text-[11px] ${mutedText}`}>
                            {formatTime(request.createdAt)}
                          </p>
                          {pending ? (
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void handleChallengeRespond(request, "accept")
                                }
                                className="px-3 py-1.5 rounded-lg bg-[#c5f135] text-[#08080e] text-xs font-semibold disabled:opacity-50"
                              >
                                Qəbul et
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void handleChallengeRespond(request, "reject")
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                  isLightMode
                                    ? "border-slate-900/15 text-slate-700"
                                    : "border-white/15 text-white/75"
                                } disabled:opacity-50`}
                              >
                                Rədd et
                              </button>
                            </div>
                          ) : null}
                          {!pending && accepted && !entry.incoming ? (
                            <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                              <CheckCircle2 size={13} />
                              Qəbul edildi
                            </p>
                          ) : null}
                          {!pending && rejected && !entry.incoming ? (
                            <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-rose-400">
                              <XCircle size={13} />
                              Rədd edildi
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                }

                const notification = entry.notification;
                const actorName = personName(notification.actor);
                const busy = busyKey === `friend-${notification.id}`;
                const pending = isPendingFriendRequest(notification);
                const accepted =
                  notification.type === "FRIEND_REQUEST" &&
                  notification.friendRequestStatus === "ACCEPTED";
                const rejected =
                  notification.type === "FRIEND_REQUEST" &&
                  notification.friendRequestStatus === "REJECTED";

                return (
                  <div
                    key={entry.key}
                    className={`px-4 py-3 border-b last:border-b-0 ${
                      isLightMode ? "border-slate-900/8" : "border-white/6"
                    } ${notification.isRead ? "opacity-80" : ""}`}
                  >
                    <div className="flex gap-3">
                      <Avatar
                        name={actorName}
                        src={notification.actor?.image || undefined}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${strongText}`}>
                          <span className="font-semibold">{actorName}</span>{" "}
                          <span className={mutedText}>
                            {notificationLabel(notification)}
                          </span>
                        </p>
                        <p className={`mt-1 text-[11px] ${mutedText}`}>
                          {formatTime(notification.createdAt)}
                        </p>

                        {pending && notification.entityId ? (
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleAccept(notification)}
                              className="px-3 py-1.5 rounded-lg bg-[#c5f135] text-[#08080e] text-xs font-semibold disabled:opacity-50"
                            >
                              Qəbul et
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleReject(notification)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                isLightMode
                                  ? "border-slate-900/15 text-slate-700"
                                  : "border-white/15 text-white/75"
                              } disabled:opacity-50`}
                            >
                              Rədd et
                            </button>
                          </div>
                        ) : null}

                        {accepted ? (
                          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                            <CheckCircle2 size={13} />
                            Qəbul edildi
                          </p>
                        ) : null}

                        {rejected ? (
                          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-rose-400">
                            <XCircle size={13} />
                            Rədd edildi
                          </p>
                        ) : null}

                        {notification.type === "FRIEND_ACCEPTED" &&
                        notification.actor ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleRead(notification);
                              navigate(`/chat?user=${notification.actor!.id}`);
                              setOpen(false);
                            }}
                            className="mt-2 text-xs font-semibold text-[#c5f135]"
                          >
                            Mesaj yaz
                          </button>
                        ) : null}

                        {notification.type === "NEW_MESSAGE" &&
                        notification.entityId ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleRead(notification);
                              navigate(
                                `/chat?conversation=${notification.entityId}`,
                              );
                              setOpen(false);
                            }}
                            className="mt-2 text-xs font-semibold text-[#c5f135]"
                          >
                            Mesaja keç
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
            className={`w-full px-4 py-3 text-xs font-medium border-t ${
              isLightMode
                ? "border-slate-900/10 text-slate-600 hover:bg-slate-900/5"
                : "border-white/8 text-white/60 hover:bg-white/5"
            }`}
          >
            Bütün bildirişlərə bax
          </button>
        </div>
      )}
    </div>
  );
}
