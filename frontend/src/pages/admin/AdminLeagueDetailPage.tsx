import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Calendar,
  Check,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Radio,
  Search,
  Target,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { AdminPageShell } from "../../components/admin/AdminLayout";
import {
  AdminModal,
  Field,
  ModalCancelButton,
  ModalForm,
  ModalSubmitButton,
  inputClass,
} from "../../components/admin/AdminModal";
import {
  deleteTeam,
  fetchLeagueInvites,
  fetchLeagueJoinRequests,
  fetchMyMatches,
  generateLeagueMatches,
  inviteTeamToLeague,
  respondJoinRequest,
  updateMatch,
  type LeagueInvite,
  type LeagueJoinRequest,
} from "../../api/admin";
import { fetchTeams, type TeamSummary } from "../../api/teams";
import { mediaUrl } from "../../api/base";
import { teamInitialTone } from "../../lib/teamAvatar";
import {
  fetchLeaguePlayers,
  fetchLeagueStandings,
  fetchLeagues,
} from "../../api/leagues";
import type { League, LeaguePlayerRow, StandingRow } from "../../types/league";
import type { Match, MatchStatus } from "../../types/match";

type TabId = "standings" | "matches" | "goals" | "assists" | "ga";

const TABS: { id: TabId; label: string }[] = [
  { id: "standings", label: "Cədvəl" },
  { id: "matches", label: "Oyunlar" },
  { id: "goals", label: "Bombardirlər" },
  { id: "assists", label: "Asistlər" },
  { id: "ga", label: "Qol + Asist" },
];

const STATUS_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: "Planlı",
  LIVE: "Canlı",
  FINISHED: "Bitib",
  CANCELLED: "Ləğv",
  POSTPONED: "Təxirə",
};

function formatDiff(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "Vaxt təyin edilməyib";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Vaxt təyin edilməyib";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusBadgeClass(status: MatchStatus): string {
  switch (status) {
    case "LIVE":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    case "FINISHED":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "CANCELLED":
    case "POSTPONED":
      return "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
    default:
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
  }
}

function leagueFixturePreview(teamCount: number, homeAway: boolean) {
  if (teamCount < 2) return { matches: 0, rounds: 0 };
  const singles = (teamCount * (teamCount - 1)) / 2;
  const slots = teamCount % 2 === 1 ? teamCount + 1 : teamCount;
  const rounds = slots - 1;
  return homeAway
    ? { matches: singles * 2, rounds: rounds * 2 }
    : { matches: singles, rounds };
}

function playerName(row: LeaguePlayerRow): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

function TeamMark({
  name,
  logo,
  align = "left",
}: {
  name: string;
  logo: string | null;
  align?: "left" | "right";
}) {
  const mark = logo ? (
    <img src={mediaUrl(logo)} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
  ) : (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${teamInitialTone(name)}`}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );

  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {mark}
      <span className="truncate font-semibold text-ink">{name}</span>
    </div>
  );
}

function isFixtureReady(match: Match): boolean {
  return Boolean(match.scheduledAt && match.venue?.trim());
}

function canEditSchedule(match: Match): boolean {
  return match.status !== "LIVE" && match.status !== "FINISHED";
}

const MIN_KICKOFF_MS = 60 * 60 * 1000;

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function minKickoffLocal(): string {
  return toDatetimeLocal(new Date(Date.now() + MIN_KICKOFF_MS).toISOString());
}

function isKickoffTooSoon(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return true;
  return d.getTime() < Date.now() + MIN_KICKOFF_MS - 1000;
}

function MatchRow({
  match,
  onSelect,
  onEnter,
}: {
  match: Match;
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
}) {
  const ready = isFixtureReady(match);
  const editable = canEditSchedule(match);
  return (
    <li>
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          onClick={() => (ready || !editable ? onEnter(match) : onSelect(match))}
          className="flex min-w-0 flex-1 flex-col gap-2 text-left transition hover:opacity-90 sm:flex-row sm:items-center sm:gap-4"
        >
          <div className="flex w-full shrink-0 items-center gap-2 text-xs text-slate-500 sm:w-52 sm:flex-col sm:items-start sm:gap-1">
            <span className="inline-flex items-center gap-1 font-medium text-slate-600">
              <Calendar className="h-3.5 w-3.5" />
              {formatWhen(match.scheduledAt)}
            </span>
            <span
              className={`truncate ${
                match.venue ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {match.round ? `${match.round}-ci tur · ` : ""}
              {match.venue || "Məkan təyin edilməyib"}
            </span>
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
            <TeamMark
              name={match.homeTeam.name}
              logo={match.homeTeam.logo}
              align="right"
            />
            <div className="min-w-[4.5rem] text-center">
              {match.status === "SCHEDULED" || match.status === "POSTPONED" ? (
                <span className="text-lg font-bold tracking-wide text-slate-300">
                  vs
                </span>
              ) : (
                <span className="text-xl font-black tabular-nums text-ink">
                  {match.homeScore}:{match.awayScore}
                </span>
              )}
              {match.status === "LIVE" && match.minute != null ? (
                <span className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-600">
                  <Radio className="h-3 w-3 animate-pulse" />
                  {match.minute}&apos;
                </span>
              ) : null}
            </div>
            <TeamMark name={match.awayTeam.name} logo={match.awayTeam.logo} />
          </div>
        </button>
        <div className="flex items-center justify-end gap-1">
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(
              match.status,
            )}`}
          >
            {STATUS_LABEL[match.status]}
          </span>
          {editable ? (
            <button
              type="button"
              onClick={() => onSelect(match)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink"
              title="Vaxt və məkan"
            >
              <Pencil className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            disabled={!ready}
            onClick={() => onEnter(match)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            title={ready ? "Oyuna gir" : "Əvvəlcə vaxt və məkan seçin"}
          >
            Oyuna gir
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </button>
        </div>
      </div>
    </li>
  );
}

function MatchGroup({
  title,
  rows,
  onSelect,
  onEnter,
}: {
  title: string;
  rows: Match[];
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-ink">{title}</h3>
        <span className="text-xs font-semibold text-slate-400">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">
          Bu bölmədə oyun yoxdur.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              onSelect={onSelect}
              onEnter={onEnter}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function PlayerStatTable({
  rows,
  empty,
  columns,
}: {
  rows: LeaguePlayerRow[];
  empty: string;
  columns: "goals" | "assists" | "ga";
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {rows.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3 text-center">#</th>
                <th className="px-3 py-3">Oyunçu</th>
                <th className="px-3 py-3">Komanda</th>
                <th className="px-2 py-3 text-center">O</th>
                {columns === "goals" || columns === "ga" ? (
                  <th className="px-2 py-3 text-center">Qol</th>
                ) : null}
                {columns === "assists" || columns === "ga" ? (
                  <th className="px-2 py-3 text-center">Asist</th>
                ) : null}
                {columns === "ga" ? (
                  <th className="px-2 py-3 text-center">Cəmi</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-50 hover:bg-slate-50/80"
                >
                  <td className="px-3 py-3 text-center font-medium text-slate-500">
                    {index + 1}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      {row.photo ? (
                        <img
                          src={mediaUrl(row.photo)}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                          {playerName(row).slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span>
                        <span className="block font-semibold text-ink">
                          {playerName(row)}
                        </span>
                        {row.shirtNumber != null ? (
                          <span className="text-xs text-slate-400">
                            #{row.shirtNumber}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{row.team.name}</td>
                  <td className="px-2 py-3 text-center text-slate-600">
                    {row.matchesPlayed}
                  </td>
                  {columns === "goals" || columns === "ga" ? (
                    <td className="px-2 py-3 text-center font-bold text-ink">
                      {row.goals}
                    </td>
                  ) : null}
                  {columns === "assists" || columns === "ga" ? (
                    <td className="px-2 py-3 text-center font-bold text-ink">
                      {row.assists}
                    </td>
                  ) : null}
                  {columns === "ga" ? (
                    <td className="px-2 py-3 text-center font-extrabold text-ink">
                      {row.goals + row.assists}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminLeagueDetailPage() {
  const { leagueId: leagueIdParam } = useParams();
  const leagueId = Number(leagueIdParam);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: TabId = TABS.some((t) => t.id === tabParam)
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

  const [teamSearch, setTeamSearch] = useState("");
  const [allTeams, setAllTeams] = useState<TeamSummary[]>([]);
  const [teamSearchLoading, setTeamSearchLoading] = useState(false);
  const [pickerTeamId, setPickerTeamId] = useState<number | "">("");
  const [message, setMessage] = useState("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateHomeAway, setGenerateHomeAway] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [scheduleMatch, setScheduleMatch] = useState<Match | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduleVenue, setScheduleVenue] = useState("");
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isInteger(leagueId) || leagueId <= 0) {
      setError("Yanlış liqa");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
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
      const found = leagues.find((l) => l.id === leagueId) || null;
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Məlumat yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const liveMatches = useMemo(
    () =>
      matches
        .filter((m) => m.status === "LIVE")
        .sort(
          (a, b) =>
            new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime(),
        ),
    [matches],
  );
  const scheduledMatches = useMemo(
    () =>
      matches
        .filter((m) => m.status === "SCHEDULED")
        .sort(
          (a, b) =>
            new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime(),
        ),
    [matches],
  );
  const finishedMatches = useMemo(
    () =>
      matches
        .filter((m) => m.status === "FINISHED")
        .sort(
          (a, b) =>
            new Date(b.scheduledAt ?? 0).getTime() - new Date(a.scheduledAt ?? 0).getTime(),
        ),
    [matches],
  );

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

  useEffect(() => {
    if (!modalOpen) return;

    const q = teamSearch.trim();
    if (q.length < 1) {
      setAllTeams([]);
      setTeamSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setTeamSearchLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const teams = await fetchTeams({ q }, controller.signal);
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
        .filter((p) => p.goals > 0)
        .sort(
          (a, b) =>
            b.goals - a.goals ||
            b.assists - a.assists ||
            playerName(a).localeCompare(playerName(b), "az"),
        ),
    [players],
  );

  const assistTable = useMemo(
    () =>
      [...players]
        .filter((p) => p.assists > 0)
        .sort(
          (a, b) =>
            b.assists - a.assists ||
            b.goals - a.goals ||
            playerName(a).localeCompare(playerName(b), "az"),
        ),
    [players],
  );

  const gaTable = useMemo(
    () =>
      [...players]
        .filter((p) => p.goals + p.assists > 0)
        .sort(
          (a, b) =>
            b.goals + b.assists - (a.goals + a.assists) ||
            b.goals - a.goals ||
            playerName(a).localeCompare(playerName(b), "az"),
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

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
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
      setFormError(
        err instanceof Error ? err.message : "Dəvət göndərilmədi",
      );
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

  const handleJoinRespond = async (
    requestId: number,
    action: "accept" | "reject",
  ) => {
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

  const closeGenerateModal = () => {
    if (generating) return;
    setGenerateOpen(false);
    setGenerateError(null);
  };

  const openSchedule = (match: Match) => {
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

  const handleSaveSchedule = async (e: FormEvent) => {
    e.preventDefault();
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
      setScheduleError(
        "Oyun vaxtı keçmişdə ola bilməz. Ən azı 1 saat sonra seçin.",
      );
      return;
    }
    setScheduleSubmitting(true);
    setScheduleError(null);
    try {
      const updated = await updateMatch(scheduleMatch.id, {
        scheduledAt: new Date(scheduleAt).toISOString(),
        venue: scheduleVenue.trim(),
      });
      setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setScheduleMatch(null);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : "Yenilənmədi");
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const handleGenerateMatches = async () => {
    if (standings.length < 2) {
      setGenerateError("Oyun yaratmaq üçün ən azı 2 komanda lazımdır");
      return;
    }
    const started = matches.some(
      (m) => m.status === "LIVE" || m.status === "FINISHED",
    );
    if (started) {
      setGenerateError(
        "Liqada artıq başlamış və ya bitmiş oyun var. Cədvəli yenidən yaratmaq olmaz.",
      );
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      await generateLeagueMatches(leagueId, { homeAway: generateHomeAway });
      setGenerateOpen(false);
      await load();
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Oyunlar yaradılmadı",
      );
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">Yüklənir...</p>
    );
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

  const pendingInvites = invites.filter((i) => i.status === "PENDING");
  const pendingJoins = joinRequests.filter((r) => r.status === "PENDING");

  return (
    <AdminPageShell
      title={league.name}
      subtitle={`${
        league.visibility === "PUBLIC" ? "İctimai" : "Özəl"
      } · Turnir cədvəli, oyunlar və statistika`}
      action={
        <button
          type="button"
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          Komanda dəvət et
        </button>
      }
    >
      <nav className="mb-5 flex items-center gap-1.5 text-sm text-slate-500">
        <Link to="/admin/football/leagues" className="hover:text-brand">
          Liqalar
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-ink">{league.name}</span>
      </nav>

      {pendingJoins.length > 0 ? (
        <div className="mb-6 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50 shadow-sm">
          <div className="border-b border-amber-100 px-4 py-3">
            <h2 className="text-base font-bold text-ink">
              Qoşulma sorğuları ({pendingJoins.length})
            </h2>
            <p className="text-xs text-slate-500">
              Public liqaya komanda kapitanlarından gələn sorğular
            </p>
          </div>
          <ul className="divide-y divide-amber-100">
            {pendingJoins.map((req) => (
              <li
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-ink">{req.team.name}</p>
                  <p className="text-xs text-slate-500">
                    @{req.requestedBy.username} ·{" "}
                    {req.team.city || "Şəhər yoxdur"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={respondingId === req.id}
                    onClick={() => void handleJoinRespond(req.id, "accept")}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Qəbul
                  </button>
                  <button
                    type="button"
                    disabled={respondingId === req.id}
                    onClick={() => void handleJoinRespond(req.id, "reject")}
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

      {pendingInvites.length > 0 ? (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <span className="font-semibold text-ink">Gözləyən dəvətlər: </span>
          {pendingInvites.map((i) => i.team.name).join(", ")}
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <Trophy className="h-4 w-4 text-brand" />
            <h2 className="text-base font-bold text-ink">Turnir cədvəli</h2>
          </div>
          {standings.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              Hələ komanda yoxdur. Mövcud komandanı dəvət edin.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3 text-center">#</th>
                    <th className="px-3 py-3">Komanda</th>
                    <th className="px-2 py-3 text-center">O</th>
                    <th className="px-2 py-3 text-center">Q</th>
                    <th className="px-2 py-3 text-center">H</th>
                    <th className="px-2 py-3 text-center">M</th>
                    <th className="px-2 py-3 text-center" title="Vurulan qollar">
                      V
                    </th>
                    <th className="px-2 py-3 text-center" title="Buraxılan qollar">
                      B
                    </th>
                    <th className="px-2 py-3 text-center">TF</th>
                    <th className="px-2 py-3 text-center">X</th>
                    <th className="px-3 py-3 text-right">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, index) => (
                    <tr
                      key={row.teamId}
                      className="border-b border-slate-50 hover:bg-slate-50/80"
                    >
                      <td className="px-3 py-3 text-center font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          to={`/admin/football/leagues/${leagueId}/teams/${row.teamId}`}
                          className="flex items-center gap-2.5 font-semibold text-ink hover:text-brand"
                        >
                          {row.logo ? (
                            <img
                              src={mediaUrl(row.logo)}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : (
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${teamInitialTone(row.teamName)}`}>
                              {row.teamName.slice(0, 1)}
                            </span>
                          )}
                          {row.teamName}
                        </Link>
                      </td>
                      <td className="px-2 py-3 text-center text-slate-600">
                        {row.played}
                      </td>
                      <td className="px-2 py-3 text-center text-slate-600">
                        {row.wins}
                      </td>
                      <td className="px-2 py-3 text-center text-slate-600">
                        {row.draws}
                      </td>
                      <td className="px-2 py-3 text-center text-slate-600">
                        {row.losses}
                      </td>
                      <td className="px-2 py-3 text-center text-slate-600">
                        {row.goalsFor}
                      </td>
                      <td className="px-2 py-3 text-center text-slate-600">
                        {row.goalsAgainst}
                      </td>
                      <td className="px-2 py-3 text-center text-slate-600">
                        {formatDiff(row.goalDifference)}
                      </td>
                      <td className="px-2 py-3 text-center font-bold text-ink">
                        {row.points}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/admin/football/leagues/${leagueId}/teams/${row.teamId}`}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand hover:bg-brand-soft"
                          >
                            <Users className="h-3.5 w-3.5" />
                            Oyunçular
                          </Link>
                          <button
                            type="button"
                            disabled={deletingId === row.teamId}
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget({
                                teamId: row.teamId,
                                name: row.teamName,
                              });
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            title="Liqadan çıxar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "matches" ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {standings.length} komanda · {matches.length} oyun
            </p>
            <button
              type="button"
              disabled={standings.length < 2}
              onClick={() => {
                setGenerateError(null);
                setGenerateHomeAway(false);
                setGenerateOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-brand-dark disabled:opacity-50"
              title={
                standings.length < 2
                  ? "Ən azı 2 komanda lazımdır"
                  : "Liqa komandaları üçün oyun cədvəli yarat"
              }
            >
              <Plus className="h-4 w-4" />
              Oyunları yarat
            </button>
          </div>
          <MatchGroup
            title="Canlı"
            rows={liveMatches}
            onSelect={openSchedule}
            onEnter={enterMatch}
          />
          <MatchGroup
            title="Planlı"
            rows={scheduledMatches}
            onSelect={openSchedule}
            onEnter={enterMatch}
          />
          <MatchGroup
            title="Bitmiş"
            rows={finishedMatches}
            onSelect={openSchedule}
            onEnter={enterMatch}
          />
        </div>
      ) : null}

      {activeTab === "goals" ? (
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Target className="h-4 w-4 text-brand" />
            Qol cədvəli
          </div>
          <PlayerStatTable
            rows={goalTable}
            columns="goals"
            empty="Hələ qol yoxdur."
          />
        </div>
      ) : null}

      {activeTab === "assists" ? (
        <PlayerStatTable
          rows={assistTable}
          columns="assists"
          empty="Hələ asist yoxdur."
        />
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
            <ModalCancelButton
              onClick={closeInviteModal}
              disabled={submitting}
            />
            <ModalSubmitButton
              formId="invite-team-form"
              label="Dəvət göndər"
              loading={submitting}
            />
          </>
        }
      >
        <ModalForm id="invite-team-form" onSubmit={handleInvite}>
          <p className="mb-3 text-sm text-slate-500">
            Dəvət komandanın kapitanına gedəcək.
          </p>
          <div className="mb-4">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Komanda <span className="text-rose-500">*</span>
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-9 pr-9`}
                value={teamSearch}
                onChange={(e) => {
                  setTeamSearch(e.target.value);
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
              <p className="mt-2 text-xs text-slate-400">
                Hərf yazdıqca komandalar axtarılacaq
              </p>
            ) : (
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
                {teamSearchLoading && allTeams.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Axtarılır...
                  </div>
                ) : allTeams.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-slate-400">
                    Nəticə tapılmadı
                  </p>
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
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${teamInitialTone(team.name)}`}>
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
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Liqamıza qoşulun..."
            />
          </Field>
          {formError ? (
            <p className="mb-2 text-sm text-rose-600">{formError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>

      <AdminModal
        open={deleteTarget != null}
        title="Komandanı sil"
        onClose={closeDeleteModal}
        footer={
          <>
            <ModalCancelButton
              onClick={closeDeleteModal}
              disabled={deletingId != null}
            />
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
          <span className="font-semibold text-ink">{deleteTarget?.name}</span>{" "}
          komandasını silməyə əminsiniz?
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
        title="Oyunları yarat"
        onClose={closeGenerateModal}
        footer={
          <>
            <ModalCancelButton
              onClick={closeGenerateModal}
              disabled={generating}
            />
            <button
              type="button"
              disabled={generating || standings.length < 2}
              onClick={() => void handleGenerateMatches()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-brand-dark disabled:opacity-60"
            >
              {generating ? "Yaradılır..." : "Yarat"}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm leading-relaxed text-slate-700">
          Liqadakı{" "}
          <span className="font-semibold text-ink">{standings.length}</span>{" "}
          komanda üçün turnir cədvəli yaradılacaq.
        </p>
        <Field label="Format">
          <select
            className={inputClass}
            value={generateHomeAway ? "HOME_AWAY" : "SINGLE"}
            onChange={(e) => setGenerateHomeAway(e.target.value === "HOME_AWAY")}
          >
            <option value="SINGLE">1 oyun (hər cüt bir dəfə)</option>
            <option value="HOME_AWAY">Ev-səfər (iki oyun)</option>
          </select>
        </Field>
        <p className="mb-2 text-xs text-slate-500">
          {leagueFixturePreview(standings.length, generateHomeAway).rounds} tur ·{" "}
          {leagueFixturePreview(standings.length, generateHomeAway).matches} oyun
        </p>
        {matches.some(
          (m) => m.status === "SCHEDULED" || m.status === "POSTPONED",
        ) ? (
          <p className="mb-2 text-xs font-medium text-amber-600">
            Mövcud planlı oyunlar silinib yeniləri ilə əvəz olunacaq.
          </p>
        ) : null}
        {matches.some(
          (m) => m.status === "LIVE" || m.status === "FINISHED",
        ) ? (
          <p className="mb-2 text-xs font-medium text-rose-600">
            Başlamış və ya bitmiş oyun olduğu üçün cədvəli yenidən yaratmaq olmaz.
          </p>
        ) : null}
        {generateError ? (
          <p className="text-sm font-medium text-rose-600">{generateError}</p>
        ) : null}
      </AdminModal>

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
        <ModalForm
          id="schedule-league-match"
          onSubmit={(e) => void handleSaveSchedule(e)}
        >
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
              onChange={(e) => setScheduleAt(e.target.value)}
              required
            />
          </Field>
          <Field label="Stadion / məkan" required>
            <input
              className={inputClass}
              value={scheduleVenue}
              onChange={(e) => setScheduleVenue(e.target.value)}
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
