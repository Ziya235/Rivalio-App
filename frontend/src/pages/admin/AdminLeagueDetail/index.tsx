import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronRight,
  Loader2,
  Play,
  Plus,
  Search,
  Target,
  X,
} from "lucide-react";
import { AdminPageShell } from "../../../components/admin/AdminLayout";
import {
  AdminModal,
  Field,
  ModalCancelButton,
  ModalForm,
  ModalSubmitButton,
  inputClass,
} from "../../../components/admin/AdminModal";
import {
  cancelLeagueInvite,
  deleteTeam,
  fetchLeagueInvites,
  fetchLeagueJoinRequests,
  fetchMyMatches,
  finishLeague,
  inviteTeamToLeague,
  respondJoinRequest,
  startLeague,
  updateMatch,
  type LeagueInvite,
  type LeagueJoinRequest,
} from "../../../api/admin";
import { fetchTeams, type TeamSummary } from "../../../api/teams";
import { mediaUrl } from "../../../api/base";
import { teamInitialTone } from "../../../lib/teamAvatar";
import {
  fetchLeaguePlayers,
  fetchLeagueStandings,
  fetchLeagues,
} from "../../../api/leagues";
import type { League, LeaguePlayerRow, StandingRow } from "../../../types/league";
import type { Match } from "../../../types/match";
import { useSocket } from "../../../context/SocketContext";
import {
  competitionPhaseClass,
  leaguePhase,
  leagueStatusLabel,
} from "../../../lib/competitionStatus";
import { TABS, type TabId } from "./constants";
import {
  canEditSchedule,
  getUnfinishedMatchesCount,
  hasUnfinishedMatches,
  isFixtureReady,
  isKickoffTooSoon,
  leagueFixturePreview,
  minKickoffLocal,
  playerName,
  toDatetimeLocal,
} from "./helpers";
import {
  FinishLeagueModal,
  LeagueMatches,
  LeagueStandings,
  PlayerStatTable,
} from "./components";

export function AdminLeagueDetailPage() {
  const { leagueId: leagueIdParam } = useParams();
  const leagueId = Number(leagueIdParam);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: TabId = TABS.some((tab) => tab.id === tabParam)
    ? (tabParam as TabId)
    : "standings";

  const [league, setLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<LeaguePlayerRow[]>([]);
  const [invites, setInvites] = useState<LeagueInvite[]>([]);
  const [joinRequests, setJoinRequests] = useState<LeagueJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    teamId: number;
    name: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [cancellingInviteId, setCancellingInviteId] = useState<number | null>(null);

  const [teamSearch, setTeamSearch] = useState("");
  const [allTeams, setAllTeams] = useState<TeamSummary[]>([]);
  const [teamSearchLoading, setTeamSearchLoading] = useState(false);
  const [pickerTeamId, setPickerTeamId] = useState<number | "">("");
  const [message, setMessage] = useState("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateHomeAway, setGenerateHomeAway] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [scheduleMatch, setScheduleMatch] = useState<Match | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduleVenue, setScheduleVenue] = useState("");
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const { notifications } = useSocket();
  const leagueNoticeSignature = notifications
    .filter((item) => item.type === "JOIN_REQUEST" || item.type === "LEAGUE_INVITE")
    .map(
      (item) =>
        `${item.id}:${item.joinRequestStatus ?? ""}:${item.leagueInviteStatus ?? ""}`,
    )
    .join("|");
  const skipNoticeReload = useRef(true);
  const finishLock = useRef(false);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!Number.isInteger(leagueId) || leagueId <= 0) {
        setError("Yanlış liqa");
        setLoading(false);
        return;
      }
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const [leagues, standingsRes, inviteRes, joinRes, matchRows, playerRows] =
          await Promise.all([
            fetchLeagues(),
            fetchLeagueStandings(leagueId),
            fetchLeagueInvites(leagueId),
            fetchLeagueJoinRequests(leagueId),
            fetchMyMatches({ leagueId }),
            fetchLeaguePlayers(leagueId),
          ]);
        const found = leagues.find((item) => item.id === leagueId) || null;
        if (!found) {
          setError("Liqa tapılmadı və ya giriş icazəniz yoxdur");
          setLeague(null);
          setStandings([]);
          setMatches([]);
          setPlayers([]);
          setInvites([]);
          setJoinRequests([]);
        } else {
          setLeague(found);
          setStandings(standingsRes.standings);
          setMatches(matchRows);
          setPlayers(playerRows);
          setInvites(inviteRes);
          setJoinRequests(joinRes);
          if (opts?.silent) setError(null);
        }
      } catch (err) {
        if (!opts?.silent) {
          setError(err instanceof Error ? err.message : "Məlumat yüklənmədi");
        }
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [leagueId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (skipNoticeReload.current) {
      skipNoticeReload.current = false;
      return;
    }
    void load({ silent: true });
  }, [leagueNoticeSignature, load]);

  const enrolledTeamIds = useMemo(
    () => new Set(standings.map((row) => row.teamId)),
    [standings],
  );

  const pendingTeamIds = useMemo(
    () =>
      new Set(
        invites
          .filter((invite) => invite.status === "PENDING")
          .map((invite) => invite.team.id),
      ),
    [invites],
  );

  const unfinishedCount = useMemo(() => getUnfinishedMatchesCount(matches), [matches]);

  useEffect(() => {
    if (!modalOpen) return;

    const query = teamSearch.trim();
    if (query.length < 1) {
      setAllTeams([]);
      setTeamSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setTeamSearchLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const teams = await fetchTeams({ q: query }, controller.signal);
        if (controller.signal.aborted) return;
        setAllTeams(teams);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setAllTeams([]);
      } finally {
        if (!controller.signal.aborted) setTeamSearchLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [modalOpen, teamSearch]);

  const goalTable = useMemo(
    () =>
      [...players]
        .filter((player) => player.goals > 0)
        .sort(
          (left, right) =>
            right.goals - left.goals ||
            right.assists - left.assists ||
            playerName(left).localeCompare(playerName(right), "az"),
        ),
    [players],
  );

  const assistTable = useMemo(
    () =>
      [...players]
        .filter((player) => player.assists > 0)
        .sort(
          (left, right) =>
            right.assists - left.assists ||
            right.goals - left.goals ||
            playerName(left).localeCompare(playerName(right), "az"),
        ),
    [players],
  );

  const gaTable = useMemo(
    () =>
      [...players]
        .filter((player) => player.goals + player.assists > 0)
        .sort(
          (left, right) =>
            right.goals + right.assists - (left.goals + left.assists) ||
            right.goals - left.goals ||
            playerName(left).localeCompare(playerName(right), "az"),
        ),
    [players],
  );

  const setTab = (id: TabId) => {
    setSearchParams({ tab: id }, { replace: true });
  };

  const resetForm = () => {
    setTeamSearch("");
    setPickerTeamId("");
    setAllTeams([]);
    setTeamSearchLoading(false);
    setMessage("");
    setFormError(null);
  };

  const closeInviteModal = () => {
    if (submitting) return;
    setModalOpen(false);
    resetForm();
  };

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!pickerTeamId) {
      setFormError("Komanda seçin");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await inviteTeamToLeague(leagueId, {
        teamId: pickerTeamId,
        message: message.trim() || undefined,
      });
      setModalOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Dəvət göndərilmədi");
    } finally {
      setSubmitting(false);
    }
  };

  const closeDeleteModal = () => {
    if (deletingId != null) return;
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.teamId);
    setDeleteError(null);
    try {
      await deleteTeam(leagueId, deleteTarget.teamId);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Silinmədi");
    } finally {
      setDeletingId(null);
    }
  };

  const handleJoinRespond = async (requestId: number, action: "accept" | "reject") => {
    setRespondingId(requestId);
    try {
      await respondJoinRequest(requestId, action);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Əməliyyat alınmadı");
    } finally {
      setRespondingId(null);
    }
  };

  const handleCancelInvite = async (inviteId: number) => {
    setCancellingInviteId(inviteId);
    try {
      await cancelLeagueInvite(leagueId, inviteId);
      await load({ silent: true });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Dəvət ləğv olunmadı");
    } finally {
      setCancellingInviteId(null);
    }
  };

  const closeGenerateModal = () => {
    if (generating) return;
    setGenerateOpen(false);
    setGenerateError(null);
  };

  const openSchedule = (match: Match) => {
    if (league?.status === "FINISHED") return;
    if (!canEditSchedule(match)) return;
    setScheduleMatch(match);
    setScheduleAt(toDatetimeLocal(match.scheduledAt));
    setScheduleVenue(match.venue ?? "");
    setScheduleError(null);
  };

  const enterMatch = (match: Match) => {
    if (canEditSchedule(match) && !isFixtureReady(match)) return;
    navigate(`/admin/football/matches/${match.id}`);
  };

  const handleSaveSchedule = async (event: FormEvent) => {
    event.preventDefault();
    if (!scheduleMatch || !canEditSchedule(scheduleMatch)) return;
    if (!scheduleAt) {
      setScheduleError("Oyun vaxtı mütləqdir");
      return;
    }
    if (!scheduleVenue.trim()) {
      setScheduleError("Məkan mütləqdir");
      return;
    }
    if (isKickoffTooSoon(scheduleAt)) {
      setScheduleError("Oyun vaxtı keçmişdə ola bilməz. Ən azı 1 saat sonra seçin.");
      return;
    }
    setScheduleSubmitting(true);
    setScheduleError(null);
    try {
      const updated = await updateMatch(scheduleMatch.id, {
        scheduledAt: new Date(scheduleAt).toISOString(),
        venue: scheduleVenue.trim(),
      });
      setMatches((prev) => prev.map((match) => (match.id === updated.id ? updated : match)));
      setScheduleMatch(null);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : "Yenilənmədi");
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const handleStartLeague = async () => {
    const stillPending = invites.filter((invite) => invite.status === "PENDING");
    if (stillPending.length > 0) {
      setGenerateError(
        "Gözləyən dəvətlər var. Əvvəlcə dəvətlər qəbul olunmalı və ya ləğv edilməlidir.",
      );
      return;
    }
    if (standings.length < 2) {
      setGenerateError("Liqanı başlatmaq üçün ən azı 2 komanda lazımdır");
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      await startLeague(leagueId, {
        matchFormat: generateHomeAway ? "HOME_AWAY" : "SINGLE",
      });
      setGenerateOpen(false);
      await load();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Liqa başladılmadı");
    } finally {
      setGenerating(false);
    }
  };

  const handleFinishLeague = async () => {
    if (finishLock.current || hasUnfinishedMatches(matches)) return;
    finishLock.current = true;
    setFinishing(true);
    setFinishError(null);
    try {
      await finishLeague(leagueId);
      setFinishOpen(false);
      await load();
    } catch (err) {
      setFinishError(err instanceof Error ? err.message : "Liqa bitirilmədi");
    } finally {
      finishLock.current = false;
      setFinishing(false);
    }
  };

  if (loading) {
    return <p className="py-16 text-center text-sm text-slate-500">Yüklənir...</p>;
  }

  if (error || !league) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-rose-600">{error || "Liqa tapılmadı"}</p>
        <Link to="/admin/football/leagues" className="text-sm font-semibold text-brand">
          ← Liqalara qayıt
        </Link>
      </div>
    );
  }

  const pendingInvites = invites.filter((invite) => invite.status === "PENDING");
  const pendingJoins = joinRequests.filter((request) => request.status === "PENDING");
  const fixturePreview = leagueFixturePreview(standings.length, generateHomeAway);

  return (
    <AdminPageShell
      title={league.name}
      subtitle={`${
        league.visibility === "PUBLIC" ? "İctimai" : "Özəl"
      } · Turnir cədvəli, oyunlar və statistika`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {league.status === "DRAFT" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Komanda dəvət et
              </button>
              <button
                type="button"
                disabled={standings.length < 2 || pendingInvites.length > 0}
                onClick={() => {
                  setGenerateError(null);
                  setGenerateHomeAway(league.matchFormat === "HOME_AWAY");
                  setGenerateOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-brand-dark disabled:opacity-50"
                title={
                  pendingInvites.length > 0
                    ? "Gözləyən dəvətlər var. Əvvəlcə dəvətlər qəbul olunmalı və ya ləğv edilməlidir."
                    : undefined
                }
              >
                <Play className="h-4 w-4" />
                Liqanı başlat
              </button>
            </>
          ) : null}
          {league.status === "ACTIVE" ? (
            <button
              type="button"
              onClick={() => {
                setFinishError(null);
                setFinishOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Liqanı bitir
            </button>
          ) : null}
        </div>
      }
    >
      <nav className="mb-5 flex items-center gap-1.5 text-sm text-slate-500">
        <Link to="/admin/football/leagues" className="hover:text-brand">
          Liqalar
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-ink">{league.name}</span>
        <span
          className={`ml-1 inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${competitionPhaseClass(leaguePhase(league.status))}`}
        >
          {leagueStatusLabel(league.status)}
        </span>
      </nav>

      {pendingJoins.length > 0 && league.status === "DRAFT" ? (
        <div className="mb-6 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50 shadow-sm">
          <div className="border-b border-amber-100 px-4 py-3">
            <h2 className="text-base font-bold text-ink">
              Qoşulma sorğuları ({pendingJoins.length})
            </h2>
            <p className="text-xs text-slate-500">
              Planlaşdırılan liqaya komanda kapitanlarından gələn sorğular
            </p>
          </div>
          <ul className="divide-y divide-amber-100">
            {pendingJoins.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-ink">{request.team.name}</p>
                  <p className="text-xs text-slate-500">
                    @{request.requestedBy.username} · {request.team.city || "Şəhər yoxdur"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={respondingId === request.id}
                    onClick={() => void handleJoinRespond(request.id, "accept")}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Qəbul
                  </button>
                  <button
                    type="button"
                    disabled={respondingId === request.id}
                    onClick={() => void handleJoinRespond(request.id, "reject")}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Rədd
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pendingInvites.length > 0 && league.status === "DRAFT" ? (
        <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-base font-bold text-ink">
              Gözləyən dəvətlər ({pendingInvites.length})
            </h2>
            <p className="text-xs text-slate-500">
              Kapitanın təsdiqini gözləyən dəvətlər. Ləğv etsəniz, komanda artıq qəbul edə
              bilməz. Liqa bu dəvətlər qəbul olunmadan və ya ləğv edilmədən başladılmır.
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{invite.team.name}</p>
                  <p className="text-xs font-medium text-amber-600">
                    Kapitanın təsdiqi gözlənilir
                  </p>
                </div>
                <button
                  type="button"
                  disabled={cancellingInviteId === invite.id}
                  onClick={() => void handleCancelInvite(invite.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  title="Dəvəti ləğv et"
                >
                  <X className="h-3.5 w-3.5" />
                  Ləğv et
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-ink text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "standings" ? (
        <LeagueStandings
          leagueId={leagueId}
          leagueStatus={league.status}
          standings={standings}
          deletingId={deletingId}
          onRemove={(team) => {
            setDeleteError(null);
            setDeleteTarget(team);
          }}
        />
      ) : null}

      {activeTab === "matches" ? (
        <LeagueMatches
          leagueId={leagueId}
          matches={matches}
          teamCount={standings.length}
          readOnly={league.status === "FINISHED"}
          onSelect={openSchedule}
          onEnter={enterMatch}
        />
      ) : null}

      {activeTab === "goals" ? (
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Target className="h-4 w-4 text-brand" />
            Qol cədvəli
          </div>
          <PlayerStatTable rows={goalTable} columns="goals" empty="Hələ qol yoxdur." />
        </div>
      ) : null}

      {activeTab === "assists" ? (
        <PlayerStatTable rows={assistTable} columns="assists" empty="Hələ asist yoxdur." />
      ) : null}

      {activeTab === "ga" ? (
        <PlayerStatTable
          rows={gaTable}
          columns="ga"
          empty="Hələ qol və ya asist yoxdur."
        />
      ) : null}

      <AdminModal
        open={modalOpen}
        title="Komandanı liqaya dəvət et"
        onClose={closeInviteModal}
        footer={
          <>
            <ModalCancelButton onClick={closeInviteModal} disabled={submitting} />
            <ModalSubmitButton
              formId="invite-team-form"
              label="Dəvət göndər"
              loading={submitting}
            />
          </>
        }
      >
        <ModalForm id="invite-team-form" onSubmit={handleInvite}>
          <p className="mb-3 text-sm text-slate-500">Dəvət komandanın kapitanına gedəcək.</p>
          <div className="mb-4">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Komanda <span className="text-rose-500">*</span>
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-9 pr-9`}
                value={teamSearch}
                onChange={(event) => {
                  setTeamSearch(event.target.value);
                  setPickerTeamId("");
                  setFormError(null);
                }}
                placeholder="Komanda adını yazın..."
                autoComplete="off"
                autoFocus
              />
              {teamSearchLoading ? (
                <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
              ) : teamSearch ? (
                <button
                  type="button"
                  aria-label="Təmizlə"
                  onClick={() => {
                    setTeamSearch("");
                    setPickerTeamId("");
                    setAllTeams([]);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {teamSearch.trim().length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">Hərf yazdıqca komandalar axtarılacaq</p>
            ) : (
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
                {teamSearchLoading && allTeams.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Axtarılır...
                  </div>
                ) : allTeams.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-slate-400">Nəticə tapılmadı</p>
                ) : (
                  <ul className="max-h-64 overflow-y-auto py-1">
                    {allTeams.map((team) => {
                      const enrolled = enrolledTeamIds.has(team.id);
                      const pending = pendingTeamIds.has(team.id);
                      const unavailable = enrolled || pending;
                      const selected = pickerTeamId === team.id;
                      const subtitle = [
                        team.city,
                        team.captain ? `@${team.captain.username}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      const statusNote = enrolled
                        ? "Bu komanda artıq liqadadır"
                        : pending
                          ? "Bu komanda dəvət gözləyir"
                          : null;
                      const rowClass = `flex w-full items-center gap-3 px-3 py-2.5 text-left ${
                        unavailable
                          ? "cursor-default opacity-70"
                          : selected
                            ? "bg-brand/20"
                            : "hover:bg-slate-50"
                      }`;
                      const content = (
                        <>
                          {team.logo ? (
                            <img
                              src={mediaUrl(team.logo)}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${teamInitialTone(team.name)}`}
                            >
                              {team.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">
                              {team.name}
                            </span>
                            {subtitle ? (
                              <span className="block truncate text-xs text-slate-500">
                                {subtitle}
                              </span>
                            ) : null}
                            {statusNote ? (
                              <span className="mt-0.5 block text-[11px] font-medium text-amber-600">
                                {statusNote}
                              </span>
                            ) : null}
                          </span>
                          {selected && !unavailable ? (
                            <Check className="h-4 w-4 shrink-0 text-brand-dark" />
                          ) : null}
                        </>
                      );
                      return (
                        <li key={team.id}>
                          {unavailable ? (
                            <div className={rowClass}>{content}</div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setPickerTeamId(team.id);
                                setFormError(null);
                              }}
                              className={`${rowClass} transition`}
                            >
                              {content}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
          <Field label="Mesaj (istəyə bağlı)">
            <input
              className={inputClass}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Liqamıza qoşulun..."
            />
          </Field>
          {formError ? <p className="mb-2 text-sm text-rose-600">{formError}</p> : null}
        </ModalForm>
      </AdminModal>

      <AdminModal
        open={deleteTarget != null}
        title="Komandanı sil"
        onClose={closeDeleteModal}
        footer={
          <>
            <ModalCancelButton onClick={closeDeleteModal} disabled={deletingId != null} />
            <button
              type="button"
              disabled={deletingId != null}
              onClick={() => void handleDelete()}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
            >
              {deletingId != null ? "Gözləyin..." : "Sil"}
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-700">
          <span className="font-semibold text-ink">{deleteTarget?.name}</span> komandasını
          silməyə əminsiniz?
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Komanda liqadan çıxarılacaq, sistemdən silinməyəcək.
        </p>
        {deleteError ? (
          <p className="mt-3 text-sm font-medium text-rose-600">{deleteError}</p>
        ) : null}
      </AdminModal>

      <AdminModal
        open={generateOpen}
        title="Liqanı başlat"
        onClose={closeGenerateModal}
        footer={
          <>
            <ModalCancelButton onClick={closeGenerateModal} disabled={generating} />
            <button
              type="button"
              disabled={generating || standings.length < 2 || pendingInvites.length > 0}
              onClick={() => void handleStartLeague()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-brand-dark disabled:opacity-60"
            >
              {generating ? "Başladılır..." : "Başlat"}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm leading-relaxed text-slate-700">
          Liqa başladıqdan sonra yeni komanda əlavə etmək mümkün olmayacaq. İştirakçı
          komandalar kilidlənəcək və oyunlar avtomatik yaranacaq.
        </p>
        <p className="mb-3 text-sm leading-relaxed text-slate-700">
          Liqadakı <span className="font-semibold text-ink">{standings.length}</span> komanda
          üçün turnir cədvəli yaradılacaq.
        </p>
        <Field label="Format">
          <select
            className={inputClass}
            value={generateHomeAway ? "HOME_AWAY" : "SINGLE"}
            onChange={(event) => setGenerateHomeAway(event.target.value === "HOME_AWAY")}
          >
            <option value="SINGLE">1 oyun (hər cüt bir dəfə)</option>
            <option value="HOME_AWAY">Ev-səfər (iki oyun)</option>
          </select>
        </Field>
        <p className="mb-2 text-xs text-slate-500">
          {fixturePreview.rounds} tur · {fixturePreview.matches} oyun
        </p>
        {generateError ? (
          <p className="text-sm font-medium text-rose-600">{generateError}</p>
        ) : null}
      </AdminModal>

      <FinishLeagueModal
        open={finishOpen}
        finishing={finishing}
        error={finishError}
        unfinishedCount={unfinishedCount}
        onClose={() => setFinishOpen(false)}
        onConfirm={() => void handleFinishLeague()}
      />

      <AdminModal
        open={scheduleMatch != null}
        title="Oyun vaxtı və məkan"
        onClose={() => !scheduleSubmitting && setScheduleMatch(null)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setScheduleMatch(null)}
              disabled={scheduleSubmitting}
            />
            <ModalSubmitButton
              label="Yadda saxla"
              loading={scheduleSubmitting}
              formId="schedule-league-match"
              disabled={!scheduleAt.trim() || !scheduleVenue.trim()}
            />
          </>
        }
      >
        <ModalForm id="schedule-league-match" onSubmit={(event) => void handleSaveSchedule(event)}>
          {scheduleMatch ? (
            <p className="mb-3 text-sm font-semibold text-ink">
              {scheduleMatch.homeTeam.name} — {scheduleMatch.awayTeam.name}
            </p>
          ) : null}
          <Field label="Oyun vaxtı" required>
            <input
              type="datetime-local"
              className={inputClass}
              value={scheduleAt}
              min={minKickoffLocal()}
              onChange={(event) => setScheduleAt(event.target.value)}
              required
            />
          </Field>
          <Field label="Stadion / məkan" required>
            <input
              className={inputClass}
              value={scheduleVenue}
              onChange={(event) => setScheduleVenue(event.target.value)}
              placeholder="Tofiq Bəhramov stadionu"
              required
            />
          </Field>
          {scheduleError ? (
            <p className="text-sm font-medium text-rose-600">{scheduleError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>
    </AdminPageShell>
  );
}
