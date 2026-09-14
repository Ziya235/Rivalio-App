import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Swords,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import { Avatar, Button } from "../components/ui";
import { NotificationTime } from "../components/NotificationTime";
import {
  respondChampionshipInvite,
  respondChampionshipJoinRequest,
} from "../api/championships";
import {
  fetchMyTeamPlayerInviteNotifications,
  respondTeamPlayerInvite,
  respondTeamInvite,
  respondLeagueJoinRequest,
  type TeamPlayerInvite,
} from "../api/teams";
import {
  fetchMyChallengeNotifications,
  fetchMyPlayerSearchNotifications,
  respondChallengeRequest,
  respondPlayerSearchRequest,
  type ChallengeNotificationRequest,
  type PlayerSearchNotificationRequest,
} from "../api/social";
import {
  acceptFriendRequest,
  rejectFriendRequest,
} from "../api/friends";
import {
  markNotificationRead,
  type AppNotification,
} from "../api/notifications";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { subscribeSocketEvent } from "../services/socket";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { AppOutletContext } from "../App";
import {
  isAcceptedNotification,
  isPendingChampionshipInvite,
  isPendingChampionshipJoinRequest,
  isPendingFriendRequest,
  isPendingJoinRequest,
  isPendingLeagueInvite,
  isRejectedNotification,
  notificationLabel,
  personName,
} from "../lib/notificationDisplay";

type FeedEntry =
  | {
      key: string;
      at: number;
      kind: "social";
      notification: AppNotification;
    }
  | {
      key: string;
      at: number;
      kind: "player";
      request: PlayerSearchNotificationRequest;
      incoming: boolean;
    }
  | {
      key: string;
      at: number;
      kind: "challenge";
      request: ChallengeNotificationRequest;
      incoming: boolean;
    }
  | {
      key: string;
      at: number;
      kind: "team-player";
      invite: TeamPlayerInvite;
      incoming: boolean;
    };

export default function NotificationsPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const ctx = useOutletContext<AppOutletContext | undefined>();
  const isAdminView = location.pathname.startsWith("/admin");
  const isDarkMode = isAdminView ? false : Boolean(ctx?.isDarkMode);
  const light = !isDarkMode;
  const bg = light
    ? "[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]"
    : "bg-[#08080e]";
  const card = light
    ? "bg-white/70 backdrop-blur-sm border-gray-200"
    : "bg-[#101017] border-white/10";
  const title = light ? "text-gray-900" : "text-white";
  const muted = light ? "text-gray-500" : "text-white/45";
  const soft = light ? "text-gray-400" : "text-white/35";
  const body = light ? "text-gray-600" : "text-white/55";
  const pendingBorder = light ? "border-emerald-500/25" : "border-[#c5f135]/20";
  const [incoming, setIncoming] = useState<PlayerSearchNotificationRequest[]>(
    [],
  );
  const [outcomes, setOutcomes] = useState<PlayerSearchNotificationRequest[]>(
    [],
  );
  const [challengeIncoming, setChallengeIncoming] = useState<
    ChallengeNotificationRequest[]
  >([]);
  const [challengeOutcomes, setChallengeOutcomes] = useState<
    ChallengeNotificationRequest[]
  >([]);
  const [teamPlayerIncoming, setTeamPlayerIncoming] = useState<
    TeamPlayerInvite[]
  >([]);
  const [teamPlayerOutcomes, setTeamPlayerOutcomes] = useState<
    TeamPlayerInvite[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const {
    isConnected,
    notifications,
    refreshNotifications,
    patchNotification,
    markLocalNotificationRead,
  } = useSocket();

  const loadExtras = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [playerSearch, challenges, teamPlayer] = await Promise.all([
        fetchMyPlayerSearchNotifications(),
        fetchMyChallengeNotifications(),
        fetchMyTeamPlayerInviteNotifications(),
      ]);
      setIncoming(playerSearch.incoming);
      setOutcomes(playerSearch.outcomes);
      setChallengeIncoming(challenges.incoming);
      setChallengeOutcomes(challenges.outcomes);
      setTeamPlayerIncoming(teamPlayer.incoming);
      setTeamPlayerOutcomes(teamPlayer.outcomes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadExtras();
  }, [loadExtras, notifications]);

  useEffect(() => {
    if (!user || !isConnected) return;
    return subscribeSocketEvent("social_requests_changed", () => {
      void loadExtras();
    });
  }, [user, isConnected, loadExtras]);

  const entries = useMemo<FeedEntry[]>(() => {
    return [
      ...notifications.map((notification) => ({
        key: `social-${notification.id}`,
        at: Date.parse(notification.createdAt) || 0,
        kind: "social" as const,
        notification,
      })),
      ...incoming.map((request) => ({
        key: `player-in-${request.id}`,
        at: Date.parse(request.createdAt) || 0,
        kind: "player" as const,
        request,
        incoming: true,
      })),
      ...outcomes.map((request) => ({
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
      ...teamPlayerIncoming.map((invite) => ({
        key: `team-player-in-${invite.id}`,
        at: Date.parse(invite.createdAt) || 0,
        kind: "team-player" as const,
        invite,
        incoming: true,
      })),
      ...teamPlayerOutcomes.map((invite) => ({
        key: `team-player-out-${invite.id}`,
        at: Date.parse(invite.respondedAt || invite.createdAt) || 0,
        kind: "team-player" as const,
        invite,
        incoming: false,
      })),
    ].sort((a, b) => b.at - a.at);
  }, [
    notifications,
    incoming,
    outcomes,
    challengeIncoming,
    challengeOutcomes,
    teamPlayerIncoming,
    teamPlayerOutcomes,
  ]);

  const respondSocial = async (
    notification: AppNotification,
    action: "accept" | "reject",
  ) => {
    if (!notification.entityId) return;
    const champPending = isPendingChampionshipInvite(notification);
    const leaguePending = isPendingLeagueInvite(notification);
    const joinPending = isPendingJoinRequest(notification) && isAdmin;
    const champJoinPending =
      isPendingChampionshipJoinRequest(notification) && isAdmin;
    setBusyKey(
      champPending
        ? `champ-${notification.id}`
        : leaguePending
          ? `league-${notification.id}`
          : joinPending
            ? `join-${notification.id}`
            : champJoinPending
              ? `cjoin-${notification.id}`
            : `friend-${notification.id}`,
    );
    try {
      if (champPending) {
        await respondChampionshipInvite(Number(notification.entityId), action);
        patchNotification(notification.id, {
          championshipInviteStatus: action === "accept" ? "ACCEPTED" : "REJECTED",
          isRead: true,
        });
      } else if (leaguePending) {
        await respondTeamInvite(Number(notification.entityId), action);
        patchNotification(notification.id, {
          leagueInviteStatus: action === "accept" ? "ACCEPTED" : "REJECTED",
          isRead: true,
        });
      } else if (joinPending) {
        await respondLeagueJoinRequest(Number(notification.entityId), action);
        patchNotification(notification.id, {
          joinRequestStatus: action === "accept" ? "ACCEPTED" : "REJECTED",
          isRead: true,
        });
      } else if (champJoinPending) {
        await respondChampionshipJoinRequest(
          Number(notification.entityId),
          action,
        );
        patchNotification(notification.id, {
          championshipJoinRequestStatus:
            action === "accept" ? "ACCEPTED" : "REJECTED",
          isRead: true,
        });
      } else {
        if (action === "accept") {
          await acceptFriendRequest(Number(notification.entityId));
        } else {
          await rejectFriendRequest(Number(notification.entityId));
        }
        patchNotification(notification.id, {
          friendRequestStatus: action === "accept" ? "ACCEPTED" : "REJECTED",
          isRead: true,
        });
      }
      if (!notification.isRead) markLocalNotificationRead(notification.id);
      await markNotificationRead(notification.id);
      await refreshNotifications();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Əməliyyat alınmadı");
    } finally {
      setBusyKey(null);
    }
  };

  if (!user) {
    return (
      <div className={`${bg} min-h-screen ${isAdminView ? "pt-8" : "pt-24"} text-center`}>
        <p className={`${muted} mb-4`}>Daxil olun</p>
        <Button onClick={() => navigate("/login")}>Giriş</Button>
      </div>
    );
  }

  return (
    <div
      className={`${isAdminView ? "" : bg} ${
        isAdminView ? "pb-8" : "min-h-screen pt-24 pb-20"
      }`}
    >
      <div className={`mx-auto px-4 sm:px-6 ${isAdminView ? "max-w-3xl" : "max-w-[700px]"}`}>
        <div className="mb-8">
          <h1
            className={
              isAdminView
                ? "text-2xl font-extrabold tracking-tight text-ink"
                : `font-display text-5xl font-bold ${title}`
            }
          >
            Bildirişlər
          </h1>
          <p className={`${muted} text-sm mt-1`}>
            Bütün bildirişlər tarixə görə, ən yenilər üstdə
          </p>
        </div>

        {loading && entries.length === 0 ? (
          <p className={`${soft} text-center py-12`}>Yüklənir...</p>
        ) : error ? (
          <p className="text-rose-400 text-center py-12">{error}</p>
        ) : entries.length === 0 ? (
          <div className={`rounded-2xl border p-10 text-center ${card}`}>
            <Bell
              className={`mx-auto mb-3 ${light ? "text-gray-300" : "text-white/25"}`}
              size={28}
            />
            <p className={muted}>Bildiriş yoxdur</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              if (entry.kind === "player") {
                const request = entry.request;
                const actorName = entry.incoming
                  ? personName(request.user)
                  : request.playerSearch.hostTeam.name;
                const pending = entry.incoming && request.status === "PENDING";
                const accepted = request.status === "ACCEPTED";
                const rejected =
                  request.status === "REJECTED" || request.status === "CANCELLED";
                return (
                  <div
                    key={entry.key}
                    className={`rounded-2xl border p-4 ${card} ${pending ? pendingBorder : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-xl p-2 ${light ? "bg-emerald-500/15 text-emerald-600" : "bg-[#c5f135]/15 text-[#c5f135]"}`}>
                        <UserPlus size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${title}`}>
                          <span className="font-semibold">{actorName}</span>{" "}
                          <span className={body}>
                            {entry.incoming
                              ? accepted
                                ? "oyunçu axtarışı sorğusunu qəbul etdiniz"
                                : request.status === "REJECTED"
                                  ? "oyunçu axtarışı sorğusunu rədd etdiniz"
                                  : "komandanızın oyunçu axtarışına qoşulmaq istəyir"
                              : accepted
                                ? "oyunçu axtarışı sorğunuzu qəbul etdi"
                                : request.status === "CANCELLED"
                                  ? "oyunçu axtarışını bağladı"
                                  : "oyunçu axtarışı sorğunuzu rədd etdi"}
                          </span>
                        </p>
                        <NotificationTime value={request.createdAt} light={light} />
                        {request.playerSearch.venue ? (
                          <p className={`mt-2 flex flex-wrap gap-3 text-xs ${soft}`}>
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} />
                              {request.playerSearch.venue}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} />
                              {new Date(request.playerSearch.scheduledAt).toLocaleString()}
                            </span>
                          </p>
                        ) : null}
                        {pending ? (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              disabled={busyKey === `player-${request.id}`}
                              onClick={() => {
                                setBusyKey(`player-${request.id}`);
                                void respondPlayerSearchRequest(request.id, "accept")
                                  .then(() => loadExtras())
                                  .catch((err) =>
                                    alert(err instanceof Error ? err.message : "Əməliyyat alınmadı"),
                                  )
                                  .finally(() => setBusyKey(null));
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              <Check size={14} />
                              Qəbul et
                            </button>
                            <button
                              type="button"
                              disabled={busyKey === `player-${request.id}`}
                              onClick={() => {
                                setBusyKey(`player-${request.id}`);
                                void respondPlayerSearchRequest(request.id, "reject")
                                  .then(() => loadExtras())
                                  .catch((err) =>
                                    alert(err instanceof Error ? err.message : "Əməliyyat alınmadı"),
                                  )
                                  .finally(() => setBusyKey(null));
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                            >
                              <X size={14} />
                              Rədd et
                            </button>
                          </div>
                        ) : null}
                        {!pending && accepted ? (
                          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                            <CheckCircle2 size={13} />
                            Qəbul edildi
                          </p>
                        ) : null}
                        {!pending && rejected ? (
                          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-rose-400">
                            <XCircle size={13} />
                            {request.status === "CANCELLED" ? "Bağlandı" : "Rədd edildi"}
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
                const pending = entry.incoming && request.status === "PENDING";
                const accepted = request.status === "ACCEPTED";
                const rejected =
                  request.status === "REJECTED" || request.status === "CANCELLED";
                return (
                  <div
                    key={entry.key}
                    className={`rounded-2xl border p-4 ${card} ${pending ? pendingBorder : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-xl p-2 ${light ? "bg-emerald-500/15 text-emerald-600" : "bg-[#c5f135]/15 text-[#c5f135]"}`}>
                        <Swords size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${title}`}>
                          <span className="font-semibold">{actorName}</span>{" "}
                          <span className={body}>
                            {entry.incoming
                              ? request.status === "PENDING"
                                ? "sizin challenge elanınıza sorğu göndərdi"
                                : accepted
                                  ? "challenge sorğusunu qəbul etdiniz"
                                  : "challenge sorğusunu rədd etdiniz"
                              : accepted
                                ? "challenge sorğunuzu qəbul etdi"
                                : "challenge sorğunuzu rədd etdi"}
                          </span>
                        </p>
                        <NotificationTime value={request.createdAt} light={light} />
                        {pending ? (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              disabled={busyKey === `challenge-${request.id}`}
                              onClick={() => {
                                setBusyKey(`challenge-${request.id}`);
                                void respondChallengeRequest(request.id, "accept")
                                  .then(() => loadExtras())
                                  .catch((err) =>
                                    alert(err instanceof Error ? err.message : "Əməliyyat alınmadı"),
                                  )
                                  .finally(() => setBusyKey(null));
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              <Check size={14} />
                              Qəbul et
                            </button>
                            <button
                              type="button"
                              disabled={busyKey === `challenge-${request.id}`}
                              onClick={() => {
                                setBusyKey(`challenge-${request.id}`);
                                void respondChallengeRequest(request.id, "reject")
                                  .then(() => loadExtras())
                                  .catch((err) =>
                                    alert(err instanceof Error ? err.message : "Əməliyyat alınmadı"),
                                  )
                                  .finally(() => setBusyKey(null));
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                            >
                              <X size={14} />
                              Rədd et
                            </button>
                          </div>
                        ) : null}
                        {!pending && accepted ? (
                          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                            <CheckCircle2 size={13} />
                            Qəbul edildi
                          </p>
                        ) : null}
                        {!pending && rejected ? (
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

              if (entry.kind === "team-player") {
                const invite = entry.invite;
                const pending = entry.incoming && invite.status === "PENDING";
                const accepted = invite.status === "ACCEPTED";
                return (
                  <div
                    key={entry.key}
                    className={`rounded-2xl border p-4 ${card} ${pending ? pendingBorder : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-xl p-2 ${light ? "bg-emerald-500/15 text-emerald-600" : "bg-[#c5f135]/15 text-[#c5f135]"}`}>
                        <UserPlus size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${title}`}>
                          {entry.incoming ? (
                            <>
                              <span className="font-semibold">{invite.team.name}</span>{" "}
                              <span className={body}>komandası sizi heyətinə dəvət edir</span>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold">
                                @{invite.invitedUser.username}
                              </span>{" "}
                              <span className={body}>
                                dəvəti {accepted ? "qəbul etdi" : "rədd etdi"}
                              </span>
                            </>
                          )}
                        </p>
                        <NotificationTime
                          value={invite.respondedAt || invite.createdAt}
                          light={light}
                        />
                        {pending ? (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              disabled={busyKey === `team-player-${invite.id}`}
                              onClick={() => {
                                setBusyKey(`team-player-${invite.id}`);
                                void respondTeamPlayerInvite(invite.id, "accept")
                                  .then(() => loadExtras())
                                  .catch((err) =>
                                    alert(err instanceof Error ? err.message : "Əməliyyat alınmadı"),
                                  )
                                  .finally(() => setBusyKey(null));
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              <Check size={14} />
                              Qəbul et
                            </button>
                            <button
                              type="button"
                              disabled={busyKey === `team-player-${invite.id}`}
                              onClick={() => {
                                setBusyKey(`team-player-${invite.id}`);
                                void respondTeamPlayerInvite(invite.id, "reject")
                                  .then(() => loadExtras())
                                  .catch((err) =>
                                    alert(err instanceof Error ? err.message : "Əməliyyat alınmadı"),
                                  )
                                  .finally(() => setBusyKey(null));
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                            >
                              <X size={14} />
                              Rədd et
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              }

              const notification = entry.notification;
              const actorName = personName(notification.actor);
              const champPending = isPendingChampionshipInvite(notification);
              const leaguePending = isPendingLeagueInvite(notification);
              const joinPending = isPendingJoinRequest(notification) && isAdmin;
              const champJoinPending =
                isPendingChampionshipJoinRequest(notification) && isAdmin;
              const pending =
                isPendingFriendRequest(notification) ||
                champPending ||
                leaguePending ||
                joinPending ||
                champJoinPending;
              const accepted = isAcceptedNotification(notification);
              const rejected = isRejectedNotification(notification);
              const busy =
                busyKey === `champ-${notification.id}` ||
                busyKey === `league-${notification.id}` ||
                busyKey === `join-${notification.id}` ||
                busyKey === `cjoin-${notification.id}` ||
                busyKey === `friend-${notification.id}`;

              return (
                <div
                  key={entry.key}
                  className={`rounded-2xl border p-4 ${card} ${pending ? pendingBorder : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={actorName}
                      src={notification.actor?.image || undefined}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${title}`}>
                        <span className="font-semibold">{actorName}</span>{" "}
                        <span className={body}>
                          {notificationLabel(notification)}
                        </span>
                      </p>
                      <NotificationTime
                        value={notification.createdAt}
                        light={light}
                      />

                      {pending && notification.entityId ? (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void respondSocial(notification, "accept")}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            <Check size={14} />
                            Qəbul et
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void respondSocial(notification, "reject")}
                            className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                          >
                            <X size={14} />
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
                          {notification.joinRequestStatus === "CANCELLED"
                            ? "Ləğv edildi"
                            : "Rədd edildi"}
                        </p>
                      ) : null}

                      {notification.type === "FRIEND_ACCEPTED" &&
                      notification.actor ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/chat?user=${notification.actor!.id}`)
                          }
                          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-500"
                        >
                          <MessageCircle size={13} />
                          Mesaj yaz
                        </button>
                      ) : null}

                      {notification.type === "NEW_MESSAGE" &&
                      notification.entityId ? (
                        <button
                          type="button"
                          onClick={() => {
                            void markNotificationRead(notification.id);
                            navigate(`/chat?conversation=${notification.entityId}`);
                          }}
                          className="mt-3 text-xs font-semibold text-emerald-500"
                        >
                          Mesaja keç
                        </button>
                      ) : null}

                      {notification.type === "CHAMPIONSHIP_INVITE" &&
                      notification.championshipInvite?.championship.id &&
                      notification.championshipInviteStatus === "ACCEPTED" ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              isAdmin
                                ? `/admin/football/championships/${notification.championshipInvite!.championship.id}`
                                : `/sports/football/championships/${notification.championshipInvite!.championship.id}`,
                            )
                          }
                          className="mt-3 w-full rounded-xl border px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          Çempionata keç
                        </button>
                      ) : null}

                      {notification.type === "CHAMPIONSHIP_JOIN_REQUEST" &&
                      notification.championshipJoinRequest?.championship.id &&
                      notification.championshipJoinRequestStatus ===
                        "ACCEPTED" ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              isAdmin
                                ? `/admin/football/championships/${notification.championshipJoinRequest!.championship.id}`
                                : `/sports/football/championships/${notification.championshipJoinRequest!.championship.id}`,
                            )
                          }
                          className="mt-3 w-full rounded-xl border px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          Çempionata keç
                        </button>
                      ) : null}

                      {notification.type === "LEAGUE_INVITE" &&
                      notification.leagueInvite?.league.id &&
                      notification.leagueInviteStatus === "ACCEPTED" ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              isAdmin
                                ? `/admin/football/leagues/${notification.leagueInvite!.league.id}`
                                : `/leagues/${notification.leagueInvite!.league.id}`,
                            )
                          }
                          className="mt-3 w-full rounded-xl border px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          Liqaya keç
                        </button>
                      ) : null}

                      {notification.type === "JOIN_REQUEST" &&
                      notification.joinRequest?.league.id &&
                      notification.joinRequestStatus === "ACCEPTED" ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              isAdmin
                                ? `/admin/football/leagues/${notification.joinRequest!.league.id}`
                                : `/leagues/${notification.joinRequest!.league.id}`,
                            )
                          }
                          className="mt-3 w-full rounded-xl border px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          Liqaya keç
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
