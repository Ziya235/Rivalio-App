import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Calendar, Lock, Radio, Target, Trophy } from "lucide-react";
import { Badge, Button } from "../components/ui";
import {
  fetchLeagueMatches,
  fetchLeaguePlayers,
  fetchLeagueStandings,
  fetchLeagues,
} from "../api/leagues";
import type { League, LeaguePlayerRow, StandingRow } from "../types/league";
import type { Match, MatchStatus } from "../types/match";
import type { AppOutletContext } from "../App";

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

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("az-AZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function playerName(row: LeaguePlayerRow): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

export default function LeagueDetailPage() {
  const { leagueId: leagueIdParam } = useParams();
  const leagueId = Number(leagueIdParam);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDarkMode } = useOutletContext<AppOutletContext>();
  const light = !isDarkMode;
  const bg = light
    ? "[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]"
    : "bg-[#08080e]";
  const card = light
    ? "bg-white/70 backdrop-blur-sm border-gray-200"
    : "border-white/10 bg-[#101017]";
  const muted = light ? "text-gray-500" : "text-white/45";
  const ink = light ? "text-gray-900" : "text-white";
  const soft = light ? "text-gray-600" : "text-white/70";
  const rowHover = light
    ? "border-gray-100 hover:bg-gray-50/70"
    : "border-white/5 hover:bg-white/[0.03]";
  const divide = light ? "divide-gray-100" : "divide-white/5";
  const borderSoft = light ? "border-gray-200" : "border-white/10";

  const tabParam = searchParams.get("tab");
  const activeTab: TabId = TABS.some((t) => t.id === tabParam)
    ? (tabParam as TabId)
    : "standings";

  const [league, setLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<LeaguePlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isInteger(leagueId) || leagueId <= 0) {
      setError("Yanlış liqa");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [leagues, standingsRes, matchRows, playerRows] = await Promise.all([
        fetchLeagues(),
        fetchLeagueStandings(leagueId),
        fetchLeagueMatches(leagueId),
        fetchLeaguePlayers(leagueId),
      ]);
      const found = leagues.find((l) => l.id === leagueId) || null;
      if (!found) {
        setError("Liqa tapılmadı və ya giriş yoxdur");
        setLeague(null);
        setStandings([]);
        setMatches([]);
        setPlayers([]);
      } else {
        setLeague(found);
        setStandings(standingsRes.standings);
        setMatches(matchRows);
        setPlayers(playerRows);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklənmədi");
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
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
        ),
    [matches],
  );
  const scheduledMatches = useMemo(
    () =>
      matches
        .filter((m) => m.status === "SCHEDULED")
        .sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
        ),
    [matches],
  );
  const finishedMatches = useMemo(
    () =>
      matches
        .filter((m) => m.status === "FINISHED")
        .sort(
          (a, b) =>
            new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
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

  const statusBadgeClass = (status: MatchStatus) => {
    if (light) {
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
    switch (status) {
      case "LIVE":
        return "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30";
      case "FINISHED":
        return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
      case "CANCELLED":
      case "POSTPONED":
        return "bg-white/5 text-white/40 ring-1 ring-white/10";
      default:
        return "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30";
    }
  };

  if (loading) {
    return (
      <p
        className={`min-h-screen pt-24 text-center ${bg} ${light ? "text-gray-400" : "text-white/40"}`}
      >
        Yüklənir...
      </p>
    );
  }

  if (error || !league) {
    return (
      <div className={`min-h-screen pt-24 text-center ${bg}`}>
        <p className="mb-4 text-rose-400">{error || "Tapılmadı"}</p>
        <Button onClick={() => navigate("/sports/football")} variant="outline">
          Geri
        </Button>
      </div>
    );
  }

  const renderMatchGroup = (title: string, rows: Match[]) => (
    <section className={`overflow-hidden rounded-2xl border ${card}`}>
      <div
        className={`flex items-center justify-between border-b px-4 py-3 ${borderSoft}`}
      >
        <h3 className={`text-sm font-bold ${ink}`}>{title}</h3>
        <span className={`text-xs font-semibold ${muted}`}>{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className={`px-4 py-8 text-center text-sm ${muted}`}>
          Bu bölmədə oyun yoxdur.
        </p>
      ) : (
        <ul className={`divide-y ${divide}`}>
          {rows.map((match) => (
            <li
              key={match.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4"
            >
              <div
                className={`flex w-full shrink-0 items-center gap-2 text-xs sm:w-36 sm:flex-col sm:items-start sm:gap-1 ${muted}`}
              >
                <span
                  className={`inline-flex items-center gap-1 font-medium ${soft}`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {formatWhen(match.scheduledAt)}
                </span>
                <span className="truncate">
                  {match.round
                    ? `${match.round}-ci tur`
                    : match.venue || "Meydan yoxdur"}
                </span>
              </div>
              <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="flex min-w-0 flex-row-reverse items-center gap-2 text-right">
                  {match.homeTeam.logo ? (
                    <img
                      src={match.homeTeam.logo}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        light
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-white/10 text-[#c5f135]"
                      }`}
                    >
                      {match.homeTeam.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className={`truncate font-semibold ${ink}`}>
                    {match.homeTeam.name}
                  </span>
                </div>
                <div className="min-w-[4.5rem] text-center">
                  {match.status === "SCHEDULED" ? (
                    <span
                      className={`text-lg font-bold tracking-wide ${light ? "text-gray-300" : "text-white/25"}`}
                    >
                      vs
                    </span>
                  ) : (
                    <span
                      className={`text-xl font-black tabular-nums ${ink}`}
                    >
                      {match.homeScore}:{match.awayScore}
                    </span>
                  )}
                  {match.status === "LIVE" && match.minute != null ? (
                    <span className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-500">
                      <Radio className="h-3 w-3 animate-pulse" />
                      {match.minute}&apos;
                    </span>
                  ) : null}
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  {match.awayTeam.logo ? (
                    <img
                      src={match.awayTeam.logo}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        light
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-white/10 text-[#c5f135]"
                      }`}
                    >
                      {match.awayTeam.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className={`truncate font-semibold ${ink}`}>
                    {match.awayTeam.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end sm:w-28">
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(match.status)}`}
                >
                  {STATUS_LABEL[match.status]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const renderPlayerTable = (
    rows: LeaguePlayerRow[],
    empty: string,
    columns: "goals" | "assists" | "ga",
  ) => (
    <div className={`overflow-hidden rounded-2xl border ${card}`}>
      {rows.length === 0 ? (
        <p className={`px-4 py-12 text-center text-sm ${muted}`}>{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr
                className={`border-b text-xs font-semibold uppercase tracking-wide ${borderSoft} ${muted}`}
              >
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
                <tr key={row.id} className={`border-b ${rowHover}`}>
                  <td className={`px-3 py-3 text-center font-medium ${muted}`}>
                    {index + 1}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      to={`/players/${row.id}`}
                      className="group flex items-center gap-2.5"
                    >
                      {row.photo ? (
                        <img
                          src={row.photo}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            light
                              ? "bg-gray-100 text-gray-500"
                              : "bg-white/10 text-white/50"
                          }`}
                        >
                          {playerName(row).slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span>
                        <span
                          className={`block font-semibold ${ink} ${
                            light
                              ? "group-hover:text-emerald-600"
                              : "group-hover:text-[#c5f135]"
                          }`}
                        >
                          {playerName(row)}
                        </span>
                        {row.shirtNumber != null ? (
                          <span className={`text-xs ${muted}`}>
                            #{row.shirtNumber}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </td>
                  <td className={`px-3 py-3 ${soft}`}>{row.team.name}</td>
                  <td className={`px-2 py-3 text-center ${soft}`}>
                    {row.matchesPlayed}
                  </td>
                  {columns === "goals" || columns === "ga" ? (
                    <td className={`px-2 py-3 text-center font-bold ${ink}`}>
                      {row.goals}
                    </td>
                  ) : null}
                  {columns === "assists" || columns === "ga" ? (
                    <td className={`px-2 py-3 text-center font-bold ${ink}`}>
                      {row.assists}
                    </td>
                  ) : null}
                  {columns === "ga" ? (
                    <td
                      className={`px-2 py-3 text-center font-extrabold ${ink}`}
                    >
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

  return (
    <div className={`min-h-screen pt-24 pb-20 ${bg}`}>
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6">
        <div className="mb-6">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className={`font-display text-4xl font-bold ${ink}`}>
              {league.name}
            </h1>
            <Badge
              variant={league.visibility === "PUBLIC" ? "public" : "private"}
            >
              {league.visibility === "PUBLIC" ? (
                "Public"
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Lock size={10} /> Private
                </span>
              )}
            </Badge>
          </div>
          <p className={`text-sm ${muted}`}>
            {league.season || "Mövsüm yoxdur"}
            {league.description ? ` · ${league.description}` : ""}
          </p>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? light
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-900"
                  : light
                    ? "bg-white/80 text-gray-600 ring-1 ring-gray-200 hover:bg-white"
                    : "bg-white/5 text-white/60 ring-1 ring-white/10 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "standings" ? (
          <div className={`overflow-hidden rounded-2xl border ${card}`}>
            <div
              className={`flex items-center gap-2 border-b px-4 py-3 ${borderSoft}`}
            >
              <Trophy
                size={16}
                className={light ? "text-emerald-500" : "text-[#c5f135]"}
              />
              <h2 className={`font-semibold ${ink}`}>Turnir cədvəli</h2>
            </div>
            {standings.length === 0 ? (
              <p className={`px-4 py-10 text-center text-sm ${muted}`}>
                Hələ komanda yoxdur
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className={`border-b text-xs uppercase ${borderSoft} ${muted}`}
                    >
                      <th className="px-3 py-3 text-center">#</th>
                      <th className="px-3 py-3 text-left">Komanda</th>
                      <th className="px-2 py-3 text-center">O</th>
                      <th className="px-2 py-3 text-center">Q</th>
                      <th className="px-2 py-3 text-center">H</th>
                      <th className="px-2 py-3 text-center">M</th>
                      <th className="px-2 py-3 text-center">TF</th>
                      <th className="px-2 py-3 text-center">X</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, i) => (
                      <tr
                        key={row.teamId}
                        role="link"
                        tabIndex={0}
                        onClick={() => navigate(`/teams/${row.teamId}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/teams/${row.teamId}`);
                          }
                        }}
                        className={`cursor-pointer border-b ${rowHover}`}
                      >
                        <td className={`px-3 py-3 text-center ${muted}`}>
                          {i + 1}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`flex items-center gap-2.5 font-medium ${ink}`}
                          >
                            {row.logo ? (
                              <img
                                src={row.logo}
                                alt=""
                                className="h-7 w-7 rounded-full object-cover"
                              />
                            ) : (
                              <span
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                                  light
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-white/10 text-[#c5f135]"
                                }`}
                              >
                                {row.teamName.slice(0, 1)}
                              </span>
                            )}
                            <span
                              className={
                                light
                                  ? "hover:text-emerald-600"
                                  : "hover:text-[#c5f135]"
                              }
                            >
                              {row.teamName}
                            </span>
                          </span>
                        </td>
                        <td className={`px-2 py-3 text-center ${soft}`}>
                          {row.played}
                        </td>
                        <td className={`px-2 py-3 text-center ${soft}`}>
                          {row.wins}
                        </td>
                        <td className={`px-2 py-3 text-center ${soft}`}>
                          {row.draws}
                        </td>
                        <td className={`px-2 py-3 text-center ${soft}`}>
                          {row.losses}
                        </td>
                        <td className={`px-2 py-3 text-center ${soft}`}>
                          {formatDiff(row.goalDifference)}
                        </td>
                        <td
                          className={`px-2 py-3 text-center font-bold ${ink}`}
                        >
                          {row.points}
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
            {renderMatchGroup("Canlı", liveMatches)}
            {renderMatchGroup("Planlı", scheduledMatches)}
            {renderMatchGroup("Bitmiş", finishedMatches)}
          </div>
        ) : null}

        {activeTab === "goals" ? (
          <div>
            <div
              className={`mb-3 flex items-center gap-2 text-sm font-semibold ${soft}`}
            >
              <Target
                className={`h-4 w-4 ${light ? "text-emerald-500" : "text-[#c5f135]"}`}
              />
              Qol cədvəli
            </div>
            {renderPlayerTable(goalTable, "Hələ qol yoxdur.", "goals")}
          </div>
        ) : null}

        {activeTab === "assists" ? (
          renderPlayerTable(assistTable, "Hələ asist yoxdur.", "assists")
        ) : null}

        {activeTab === "ga" ? (
          renderPlayerTable(
            gaTable,
            "Hələ qol və ya asist yoxdur.",
            "ga",
          )
        ) : null}
      </div>
    </div>
  );
}
