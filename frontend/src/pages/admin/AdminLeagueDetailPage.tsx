import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Calendar,
  Check,
  ChevronRight,
  Plus,
  Radio,
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
  inviteTeamToLeague,
  respondJoinRequest,
  type LeagueInvite,
  type LeagueJoinRequest,
} from "../../api/admin";
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
  return new Date(iso).toLocaleString("az-AZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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
    <img src={logo} alt="" className="h-8 w-8 rounded-full object-cover" />
  ) : (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
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

function MatchRow({ match }: { match: Match }) {
  return (
    <li>
      <Link
        to={`/admin/football/matches/${match.id}`}
        className="flex flex-col gap-3 px-4 py-4 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="flex w-full shrink-0 items-center gap-2 text-xs text-slate-500 sm:w-36 sm:flex-col sm:items-start sm:gap-1">
          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
            <Calendar className="h-3.5 w-3.5" />
            {formatWhen(match.scheduledAt)}
          </span>
          <span className="truncate">
            {match.round ? `${match.round}-ci tur` : match.venue || "Meydan yoxdur"}
          </span>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamMark
            name={match.homeTeam.name}
            logo={match.homeTeam.logo}
            align="right"
          />
          <div className="min-w-[4.5rem] text-center">
            {match.status === "SCHEDULED" ? (
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
        <div className="flex items-center justify-between gap-2 sm:w-28 sm:justify-end">
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(
              match.status,
            )}`}
          >
            {STATUS_LABEL[match.status]}
          </span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </div>
      </Link>
    </li>
  );
}

function MatchGroup({
  title,
  rows,
}: {
  title: string;
  rows: Match[];
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
            <MatchRow key={match.id} match={match} />
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
                          src={row.photo}
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
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const [teamName, setTeamName] = useState("");
  const [message, setMessage] = useState("");

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
    setTeamName("");
    setMessage("");
    setFormError(null);
  };

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setFormError("Komanda adı mütləqdir");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await inviteTeamToLeague(leagueId, {
        teamName: teamName.trim(),
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

  const handleDelete = async (teamId: number, name: string) => {
    if (
      !window.confirm(
        `"${name}" komandasını liqadan çıxarmaq istəyirsiniz? Komanda silinməyəcək.`,
      )
    ) {
      return;
    }
    setDeletingId(teamId);
    try {
      await deleteTeam(leagueId, teamId);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silinmədi");
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
                              src={row.logo}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">
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
                            onClick={() =>
                              void handleDelete(row.teamId, row.teamName)
                            }
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
          <MatchGroup title="Canlı" rows={liveMatches} />
          <MatchGroup title="Planlı" rows={scheduledMatches} />
          <MatchGroup title="Bitmiş" rows={finishedMatches} />
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
        onClose={() => !submitting && setModalOpen(false)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setModalOpen(false)}
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
            Mövcud komandanın unikal adını yazın. Dəvət komanda kapitanına
            gedəcək.
          </p>
          <Field label="Komanda adı" required>
            <input
              className={inputClass}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="məs. Bakı Strikerlər"
              required
            />
          </Field>
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
    </AdminPageShell>
  );
}
