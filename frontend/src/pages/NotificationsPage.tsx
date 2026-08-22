import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  Swords,
  Trophy,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "../components/ui";
import {
  fetchMyTeamPlayerInviteNotifications,
  fetchMyTeamInvites,
  respondTeamPlayerInvite,
  respondTeamInvite,
  type TeamPlayerInvite,
  type TeamInvite,
} from "../api/teams";
import {
  fetchMyChallengeNotifications,
  fetchMyPlayerSearchNotifications,
  respondChallengeRequest,
  respondPlayerSearchRequest,
  type ChallengeNotificationRequest,
  type PlayerSearchNotificationRequest,
} from "../api/social";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { AppOutletContext } from "../App";

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useOutletContext<AppOutletContext>();
  const light = !isDarkMode;
  const bg = light
    ? "[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]"
    : "bg-[#08080e]";
  const card = light
    ? "bg-white/70 backdrop-blur-sm border-gray-200"
    : "bg-[#101017]";
  const title = light ? "text-gray-900" : "text-white";
  const muted = light ? "text-gray-500" : "text-white/45";
  const soft = light ? "text-gray-400" : "text-white/35";
  const body = light ? "text-gray-600" : "text-white/55";
  const sectionLabel = light ? "text-gray-400" : "text-white/40";
  const accentIcon = light
    ? "bg-emerald-500/15 text-emerald-600"
    : "bg-[#c5f135]/15 text-[#c5f135]";
  const pendingBorder = light ? "border-emerald-500/25" : "border-[#c5f135]/20";
  const [invites, setInvites] = useState<TeamInvite[]>([]);
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

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [
        teamInvites,
        playerSearchNotifications,
        challengeNotifications,
        teamPlayerNotifications,
      ] = await Promise.all([
        fetchMyTeamInvites(),
        fetchMyPlayerSearchNotifications(),
        fetchMyChallengeNotifications(),
        fetchMyTeamPlayerInviteNotifications(),
      ]);
      setInvites(teamInvites);
      setIncoming(playerSearchNotifications.incoming);
      setOutcomes(playerSearchNotifications.outcomes);
      setChallengeIncoming(challengeNotifications.incoming);
      setChallengeOutcomes(challengeNotifications.outcomes);
      setTeamPlayerIncoming(teamPlayerNotifications.incoming);
      setTeamPlayerOutcomes(teamPlayerNotifications.outcomes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (id: number, action: "accept" | "reject") => {
    setBusyKey(`invite-${id}`);
    try {
      await respondTeamInvite(id, action);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Əməliyyat alınmadı");
    } finally {
      setBusyKey(null);
    }
  };

  const respondToPlayer = async (
    id: number,
    action: "accept" | "reject",
  ) => {
    setBusyKey(`player-${id}`);
    try {
      await respondPlayerSearchRequest(id, action);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Əməliyyat alınmadı");
    } finally {
      setBusyKey(null);
    }
  };

  const respondToChallenge = async (
    id: number,
    action: "accept" | "reject",
  ) => {
    setBusyKey(`challenge-${id}`);
    try {
      await respondChallengeRequest(id, action);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Əməliyyat alınmadı");
    } finally {
      setBusyKey(null);
    }
  };

  const respondToTeamPlayerInvite = async (
    id: number,
    action: "accept" | "reject",
  ) => {
    setBusyKey(`team-player-${id}`);
    try {
      await respondTeamPlayerInvite(id, action);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Əməliyyat alınmadı");
    } finally {
      setBusyKey(null);
    }
  };

  const hasNotifications =
    invites.length > 0 ||
    incoming.length > 0 ||
    outcomes.length > 0 ||
    challengeIncoming.length > 0 ||
    challengeOutcomes.length > 0 ||
    teamPlayerIncoming.length > 0 ||
    teamPlayerOutcomes.length > 0;

  if (!user) {
    return (
      <div className={`${bg} min-h-screen pt-24 text-center`}>
        <p className={`${muted} mb-4`}>Daxil olun</p>
        <Button onClick={() => navigate("/login")}>Giriş</Button>
      </div>
    );
  }

  return (
    <div className={`${bg} min-h-screen pt-24 pb-20`}>
      <div className="max-w-[700px] mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className={`font-display text-5xl font-bold ${title}`}>
            Bildirişlər
          </h1>
          <p className={`${muted} text-sm mt-1`}>
            Liqa dəvətləri və digər sorğular
          </p>
        </div>

        {loading ? (
          <p className={`${soft} text-center py-12`}>Yüklənir...</p>
        ) : error ? (
          <p className="text-rose-400 text-center py-12">{error}</p>
        ) : !hasNotifications ? (
          <div
            className={`rounded-2xl border p-10 text-center ${
              light ? `${card}` : `${card} border-white/10`
            }`}
          >
            <Bell
              className={`mx-auto mb-3 ${light ? "text-gray-300" : "text-white/25"}`}
              size={28}
            />
            <p className={muted}>Bildiriş yoxdur</p>
          </div>
        ) : (
          <div className="space-y-6">
            {teamPlayerIncoming.length > 0 ? (
              <section>
                <h2
                  className={`mb-3 text-xs font-semibold uppercase tracking-wider ${sectionLabel}`}
                >
                  Komanda dəvətləri
                </h2>
                <div className="space-y-3">
                  {teamPlayerIncoming.map((invite) => {
                    const pending = invite.status === "PENDING";
                    const accepted = invite.status === "ACCEPTED";
                    return (
                      <div
                        key={invite.id}
                        className={`rounded-2xl border p-4 ${card} ${
                          pending
                            ? pendingBorder
                            : accepted
                              ? "border-emerald-500/20"
                              : "border-rose-500/20"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 rounded-xl p-2 ${
                              pending
                                ? accentIcon
                                : accepted
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            <UserPlus size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className={`font-semibold ${title}`}>
                              {pending
                                ? "Komanda dəvəti"
                                : accepted
                                  ? "Komanda dəvətini qəbul etdiniz"
                                  : "Komanda dəvətini rədd etdiniz"}
                            </h3>
                            <p className={`mt-1 text-sm ${body}`}>
                              <span className={title}>{invite.team.name}</span>{" "}
                              komandası sizi heyətinə dəvət edir. Kapitan:{" "}
                              <span className={title}>
                                @{invite.invitedBy.username}
                              </span>
                            </p>
                            {invite.position ? (
                              <p className={`mt-2 text-xs ${soft}`}>
                                Pozisiya: {invite.position}
                              </p>
                            ) : null}
                            {invite.message ? (
                              <p className={`mt-2 text-xs italic ${soft}`}>
                                “{invite.message}”
                              </p>
                            ) : null}
                            {pending ? (
                              <div className="mt-4 flex gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    busyKey === `team-player-${invite.id}`
                                  }
                                  onClick={() =>
                                    void respondToTeamPlayerInvite(
                                      invite.id,
                                      "accept",
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                                >
                                  <Check size={14} />
                                  Qəbul et
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    busyKey === `team-player-${invite.id}`
                                  }
                                  onClick={() =>
                                    void respondToTeamPlayerInvite(
                                      invite.id,
                                      "reject",
                                    )
                                  }
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
                  })}
                </div>
              </section>
            ) : null}

            {teamPlayerOutcomes.length > 0 ? (
              <section>
                <h2
                  className={`mb-3 text-xs font-semibold uppercase tracking-wider ${sectionLabel}`}
                >
                  Göndərdiyiniz komanda dəvətləri
                </h2>
                <div className="space-y-3">
                  {teamPlayerOutcomes.map((invite) => {
                    const accepted = invite.status === "ACCEPTED";
                    return (
                      <div
                        key={invite.id}
                        className={`rounded-2xl border p-4 ${card} ${
                          accepted
                            ? "border-emerald-500/20"
                            : "border-rose-500/20"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 rounded-xl p-2 ${
                              accepted
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {accepted ? (
                              <CheckCircle2 size={16} />
                            ) : (
                              <XCircle size={16} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className={`font-semibold ${title}`}>
                              @{invite.invitedUser.username} dəvəti{" "}
                              {accepted ? "qəbul etdi" : "rədd etdi"}
                            </h3>
                            <p className={`mt-1 text-sm ${body}`}>
                              <span className={title}>{invite.team.name}</span>{" "}
                              komandasına oyunçu dəvəti
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {challengeIncoming.length > 0 ? (
              <section>
                <h2
                  className={`mb-3 text-xs font-semibold uppercase tracking-wider ${sectionLabel}`}
                >
                  Gələn challenge sorğuları
                </h2>
                <div className="space-y-3">
                  {challengeIncoming.map((request) => {
                    const pending = request.status === "PENDING";
                    const accepted = request.status === "ACCEPTED";
                    return (
                      <div
                        key={request.id}
                        className={`rounded-2xl border p-4 ${card} ${
                          pending
                            ? pendingBorder
                            : accepted
                              ? "border-emerald-500/20"
                              : "border-rose-500/20"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 rounded-xl p-2 ${
                              pending
                                ? accentIcon
                                : accepted
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            <Swords size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className={`font-semibold ${title}`}>
                              {pending
                                ? "Yeni challenge sorğusu"
                                : accepted
                                  ? "Challenge qəbul edildi"
                                  : request.status === "REJECTED"
                                    ? "Challenge rədd edildi"
                                    : "Başqa rəqib seçildi"}
                            </h3>
                            <p className={`mt-1 text-sm ${body}`}>
                              <span className={title}>{request.team.name}</span>{" "}
                              komandası{" "}
                              <span className={title}>
                                {request.challenge.team.name}
                              </span>{" "}
                              komandasının challenge elanına sorğu göndərib
                              {request.requestedBy?.username
                                ? ` (@${request.requestedBy.username})`
                                : ""}
                              .
                            </p>
                            <div
                              className={`mt-2 flex flex-wrap gap-3 text-xs ${soft}`}
                            >
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {new Date(
                                  request.challenge.scheduledAt,
                                ).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {request.challenge.venue}
                              </span>
                            </div>
                            {request.message ? (
                              <p className={`mt-2 text-xs italic ${soft}`}>
                                “{request.message}”
                              </p>
                            ) : null}
                            {pending ? (
                              <div className="mt-4 flex gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    busyKey === `challenge-${request.id}`
                                  }
                                  onClick={() =>
                                    void respondToChallenge(
                                      request.id,
                                      "accept",
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                                >
                                  <Check size={14} />
                                  Qəbul et
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    busyKey === `challenge-${request.id}`
                                  }
                                  onClick={() =>
                                    void respondToChallenge(
                                      request.id,
                                      "reject",
                                    )
                                  }
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
                  })}
                </div>
              </section>
            ) : null}

            {challengeOutcomes.length > 0 ? (
              <section>
                <h2
                  className={`mb-3 text-xs font-semibold uppercase tracking-wider ${sectionLabel}`}
                >
                  Challenge cavabları
                </h2>
                <div className="space-y-3">
                  {challengeOutcomes.map((request) => {
                    const accepted = request.status === "ACCEPTED";
                    return (
                      <div
                        key={request.id}
                        className={`rounded-2xl border p-4 ${card} ${
                          accepted
                            ? "border-emerald-500/20"
                            : "border-rose-500/20"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 rounded-xl p-2 ${
                              accepted
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {accepted ? (
                              <CheckCircle2 size={16} />
                            ) : (
                              <XCircle size={16} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className={`font-semibold ${title}`}>
                              {accepted
                                ? "Challenge sorğunuz qəbul edildi"
                                : request.status === "REJECTED"
                                  ? "Challenge sorğunuz rədd edildi"
                                  : "Başqa rəqib komanda seçildi"}
                            </h3>
                            <p className={`mt-1 text-sm ${body}`}>
                              <span className={title}>{request.team.name}</span>{" "}
                              vs{" "}
                              <span className={title}>
                                {request.challenge.team.name}
                              </span>
                            </p>
                            <div
                              className={`mt-2 flex flex-wrap gap-3 text-xs ${soft}`}
                            >
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {new Date(
                                  request.challenge.scheduledAt,
                                ).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {request.challenge.venue}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {incoming.length > 0 ? (
              <section>
                <h2
                  className={`mb-3 text-xs font-semibold uppercase tracking-wider ${sectionLabel}`}
                >
                  Oyunçu sorğuları
                </h2>
                <div className="space-y-3">
                  {incoming.map((request) => (
                    <div
                      key={request.id}
                      className={`rounded-2xl border p-4 ${card} ${pendingBorder}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 rounded-xl p-2 ${accentIcon}`}
                        >
                          <UserPlus size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className={`font-semibold ${title}`}>
                            Yeni oyunçu sorğusu
                          </h3>
                          <p className={`mt-1 text-sm ${body}`}>
                            <span className={title}>
                              @{request.user?.username}
                            </span>{" "}
                            <span className={title}>
                              {request.playerSearch.hostTeam.name}
                            </span>{" "}
                            komandasının oyunçu axtarışına qoşulmaq istəyir.
                          </p>
                          <div
                            className={`mt-2 flex flex-wrap gap-3 text-xs ${soft}`}
                          >
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {new Date(
                                request.playerSearch.scheduledAt,
                              ).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {request.playerSearch.venue}
                            </span>
                          </div>
                          {request.message ? (
                            <p className={`mt-2 text-xs italic ${soft}`}>
                              “{request.message}”
                            </p>
                          ) : null}
                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              disabled={busyKey === `player-${request.id}`}
                              onClick={() =>
                                void respondToPlayer(request.id, "accept")
                              }
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              <Check size={14} />
                              Qəbul et
                            </button>
                            <button
                              type="button"
                              disabled={busyKey === `player-${request.id}`}
                              onClick={() =>
                                void respondToPlayer(request.id, "reject")
                              }
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                            >
                              <X size={14} />
                              Rədd et
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {outcomes.length > 0 ? (
              <section>
                <h2
                  className={`mb-3 text-xs font-semibold uppercase tracking-wider ${sectionLabel}`}
                >
                  Sorğularınıza cavablar
                </h2>
                <div className="space-y-3">
                  {outcomes.map((request) => {
                    const accepted = request.status === "ACCEPTED";
                    return (
                      <div
                        key={request.id}
                        className={`rounded-2xl border p-4 ${card} ${
                          accepted
                            ? "border-emerald-500/20"
                            : "border-rose-500/20"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 rounded-xl p-2 ${
                              accepted
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {accepted ? (
                              <CheckCircle2 size={16} />
                            ) : (
                              <XCircle size={16} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className={`font-semibold ${title}`}>
                              {accepted
                                ? "Sorğunuz qəbul edildi"
                                : request.status === "CANCELLED"
                                  ? "Axtarış bağlandı"
                                  : "Sorğunuz rədd edildi"}
                            </h3>
                            <p className={`mt-1 text-sm ${body}`}>
                              <span className={title}>
                                {request.playerSearch.hostTeam.name}
                              </span>{" "}
                              komandasının oyunçu axtarışı.
                            </p>
                            <div
                              className={`mt-2 flex flex-wrap gap-3 text-xs ${soft}`}
                            >
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {new Date(
                                  request.playerSearch.scheduledAt,
                                ).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {request.playerSearch.venue}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {invites.length > 0 ? (
              <section>
                <h2
                  className={`mb-3 text-xs font-semibold uppercase tracking-wider ${sectionLabel}`}
                >
                  Liqa dəvətləri
                </h2>
                <div className="space-y-3">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className={`rounded-2xl border p-4 ${card} ${pendingBorder}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 rounded-xl p-2 ${accentIcon}`}
                        >
                          <Trophy size={16} />
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold ${title}`}>
                            Liqa dəvəti
                          </h3>
                          <p className={`mt-1 text-sm ${body}`}>
                            <span className={title}>{invite.league.name}</span>{" "}
                            liqası{" "}
                            <span className={title}>{invite.team.name}</span>{" "}
                            komandanızı dəvət etdi
                            {invite.league.visibility === "PRIVATE"
                              ? " (özəl liqa)"
                              : " (ictimai liqa)"}
                            .
                          </p>
                          {invite.message ? (
                            <p className={`mt-2 text-xs italic ${soft}`}>
                              “{invite.message}”
                            </p>
                          ) : null}
                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              disabled={busyKey === `invite-${invite.id}`}
                              onClick={() =>
                                void respond(invite.id, "accept")
                              }
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              <Check size={14} />
                              Qəbul et
                            </button>
                            <button
                              type="button"
                              disabled={busyKey === `invite-${invite.id}`}
                              onClick={() =>
                                void respond(invite.id, "reject")
                              }
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                            >
                              <X size={14} />
                              Rədd et
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
