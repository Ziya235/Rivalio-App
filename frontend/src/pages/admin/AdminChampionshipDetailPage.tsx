import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  ChevronRight,
  CircleDot,
  Handshake,
  Medal,
  Pencil,
  Play,
  Plus,
  Radio,
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
  addChampionshipTeam,
  addTeamToGroup,
  ChampApiError,
  createChampionshipGroups,
  deleteChampionshipGroup,
  fetchChampionship,
  fetchChampionshipMatches,
  fetchGroupStandings,
  removeChampionshipTeam,
  removeTeamFromGroup,
  startGroupStage,
  startPlayoff,
  updateChampionshipGroup,
  updateChampionshipMatch,
} from "../../api/championships";
import { fetchTeams, type TeamSummary } from "../../api/teams";
import {
  GROUP_CAPACITY_MAX,
  GROUP_CAPACITY_MIN,
  GROUP_CHAMP_TEAM_MAX,
  GROUP_CHAMP_TEAM_MIN,
  GROUP_COUNT_MAX,
  GROUP_COUNT_MIN,
  validateGroupSlots,
  type SlotMode,
} from "../../lib/championshipGroups";
import { parsePlayoffNotes } from "../../lib/playoffBracket";
import type {
  Championship,
  ChampionshipGroup,
  ChampionshipStatus,
  MatchStage,
  PlayoffTieGroup,
  StandingRow,
} from "../../types/championship";
import type { Match, MatchStatus } from "../../types/match";

const STATUS_LABEL: Record<ChampionshipStatus, string> = {
  DRAFT: "Draft",
  REGISTRATION: "Qeydiyyat",
  GROUP_STAGE: "Qrup mərhələsi",
  PLAYOFF: "Playoff",
  COMPLETED: "Bitib",
  CANCELLED: "Ləğv",
};

const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: "Planlı",
  LIVE: "Canlı",
  FINISHED: "Bitib",
  CANCELLED: "Ləğv",
  POSTPONED: "Təxirə",
};

const STAGE_LABEL: Record<MatchStage, string> = {
  GROUP_STAGE: "Qrup mərhələsi",
  PRELIMINARY: "Ön mərhələ",
  ROUND_OF_16: "1/8 final",
  QUARTER_FINAL: "1/4 final",
  SEMI_FINAL: "Yarımfinal",
  FINAL: "Final",
};

const PLAYOFF_STAGES: MatchStage[] = [
  "PRELIMINARY",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "FINAL",
];

const STAGE_COLUMN_CLASS: Record<MatchStage, string> = {
  GROUP_STAGE: "bg-slate-100 text-slate-700",
  PRELIMINARY: "bg-violet-100 text-violet-800",
  ROUND_OF_16: "bg-indigo-100 text-indigo-800",
  QUARTER_FINAL: "bg-sky-100 text-sky-800",
  SEMI_FINAL: "bg-emerald-100 text-emerald-800",
  FINAL: "bg-amber-100 text-amber-800",
};

type ChampScorerRow = {
  id: number;
  firstName: string;
  lastName: string;
  shirtNumber: number | null;
  photo: string | null;
  teamId: number;
  teamName: string;
  teamLogo: string | null;
  goals: number;
  assists: number;
};

type PlayoffPlaceholder = {
  key: string;
  slot: number;
  homeLabel: string;
  awayLabel: string;
};

function playerDisplayName(row: {
  firstName: string;
  lastName: string;
}): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

function collectChampionshipScorers(matches: Match[]): ChampScorerRow[] {
  const rows = new Map<number, ChampScorerRow>();
  const teamName = (match: Match, teamId: number | null) => {
    if (teamId === match.homeTeamId) return match.homeTeam;
    if (teamId === match.awayTeamId) return match.awayTeam;
    return null;
  };
  const ensure = (
    player: NonNullable<Match["events"]>[number]["player"],
    team: { id: number; name: string; logo: string | null } | null,
  ) => {
    if (!player) return null;
    const existing = rows.get(player.id);
    if (existing) return existing;
    const created: ChampScorerRow = {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      shirtNumber: player.shirtNumber,
      photo: player.photo,
      teamId: player.teamId,
      teamName: team?.name ?? "—",
      teamLogo: team?.logo ?? null,
      goals: 0,
      assists: 0,
    };
    rows.set(player.id, created);
    return created;
  };

  for (const match of matches) {
    for (const event of match.events ?? []) {
      if (event.type === "GOAL" && event.player) {
        const team =
          teamName(match, event.teamId) ??
          teamName(match, event.player.teamId);
        const row = ensure(event.player, team);
        if (row) row.goals += 1;
      }
      if (event.type === "GOAL" && event.assistPlayer) {
        const team = teamName(match, event.assistPlayer.teamId);
        const row = ensure(event.assistPlayer, team);
        if (row) row.assists += 1;
      }
    }
  }
  return [...rows.values()];
}

function playoffPlaceholders(matches: Match[]): Map<MatchStage, PlayoffPlaceholder[]> {
  const map = new Map<MatchStage, PlayoffPlaceholder[]>();
  const existing = new Set(
    matches.map((m) => `${m.stage}:${m.round ?? 1}`),
  );
  const pending = new Map<
    string,
    { stage: MatchStage; slot: number; home?: string; away?: string }
  >();

  for (const match of matches) {
    const meta = parsePlayoffNotes(match.notes);
    const feeds = meta?.feeds;
    if (!feeds?.stage || feeds.slot == null || !feeds.side) continue;
    const round = feeds.slot + 1;
    if (existing.has(`${feeds.stage}:${round}`)) continue;
    const winnerLabel =
      meta?.homeLabel && meta?.awayLabel
        ? `${meta.homeLabel}/${meta.awayLabel} qalibi`
        : `${STAGE_LABEL[match.stage as MatchStage] ?? "Oyun"} qalibi`;
    const key = `${feeds.stage}:${feeds.slot}`;
    const rec = pending.get(key) ?? {
      stage: feeds.stage as MatchStage,
      slot: feeds.slot,
    };
    if (feeds.side === "home") rec.home = winnerLabel;
    else rec.away = winnerLabel;
    pending.set(key, rec);
  }

  for (const rec of pending.values()) {
    const list = map.get(rec.stage) ?? [];
    list.push({
      key: `${rec.stage}-${rec.slot}`,
      slot: rec.slot,
      homeLabel: rec.home ?? "Təyin olunmayıb",
      awayLabel: rec.away ?? "Təyin olunmayıb",
    });
    list.sort((a, b) => a.slot - b.slot);
    map.set(rec.stage, list);
  }
  return map;
}

function statusClass(status: ChampionshipStatus): string {
  switch (status) {
    case "GROUP_STAGE":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
    case "PLAYOFF":
      return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "CANCELLED":
      return "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
    default:
      return "bg-slate-50 text-slate-600 ring-1 ring-slate-200";
  }
}

function matchStatusClass(status: MatchStatus): string {
  switch (status) {
    case "LIVE":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    case "FINISHED":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    default:
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
  }
}

const AZ_MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avqust",
  "sentyabr",
  "oktyabr",
  "noyabr",
  "dekabr",
];

const MIN_KICKOFF_MS = 60 * 60 * 1000;

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "Vaxt təyin edilməyib";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Vaxt təyin edilməyib";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()} ${AZ_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatCompactDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function formatCompactWhen(iso: string | null | undefined): string {
  if (!iso) return "Vaxt yoxdur";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Vaxt yoxdur";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${formatCompactDate(iso)} • ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function teamGroupCaption(
  groups: ChampionshipGroup[],
  teamId: number,
): string | null {
  for (const group of groups) {
    const row = group.teams.find((t) => t.teamId === teamId);
    if (!row) continue;
    const letter =
      group.name.match(/\b([A-Da-d])\b/)?.[1]?.toUpperCase() ??
      group.name.replace(/^qrup\s+/i, "").slice(0, 1).toUpperCase();
    return `${letter}${row.seed}`;
  }
  return null;
}

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
  return d.getTime() < Date.now() + MIN_KICKOFF_MS;
}

function isFixtureReady(match: Match): boolean {
  return Boolean(match.scheduledAt && match.venue?.trim());
}

function formatDiff(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

function isSetupStatus(status: ChampionshipStatus): boolean {
  return status === "DRAFT" || status === "REGISTRATION";
}

function TeamMark({
  name,
  logo,
  align = "left",
  size = "md",
  badge,
}: {
  name: string;
  logo: string | null;
  align?: "left" | "right";
  size?: "sm" | "md";
  badge?: string | null;
}) {
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs";
  const mark = logo ? (
    <img src={logo} alt="" className={`${dim} rounded-full object-cover`} />
  ) : (
    <span
      className={`flex ${dim} items-center justify-center rounded-full bg-brand-soft font-bold text-brand`}
    >
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
      {badge ? (
        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded bg-slate-800 px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
      <span className="truncate font-semibold text-ink">{name}</span>
    </div>
  );
}

function StandingsTable({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500">
        Cədvəl hələ boşdur.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="px-4 py-2.5">#</th>
            <th className="px-4 py-2.5">Komanda</th>
            <th className="px-2 py-2.5 text-center">O</th>
            <th className="px-2 py-2.5 text-center">Q</th>
            <th className="px-2 py-2.5 text-center">He</th>
            <th className="px-2 py-2.5 text-center">M</th>
            <th className="px-2 py-2.5 text-center">Qol</th>
            <th className="px-2 py-2.5 text-center">+</th>
            <th className="px-4 py-2.5 text-center">Xal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((row) => (
            <tr key={row.teamId} className="hover:bg-slate-50/60">
              <td className="px-4 py-2.5 font-bold tabular-nums text-slate-500">
                {row.rank}
              </td>
              <td className="px-4 py-2.5">
                <TeamMark
                  name={row.team.name}
                  logo={row.team.logo}
                  size="sm"
                />
              </td>
              <td className="px-2 py-2.5 text-center tabular-nums">{row.played}</td>
              <td className="px-2 py-2.5 text-center tabular-nums">{row.won}</td>
              <td className="px-2 py-2.5 text-center tabular-nums">{row.drawn}</td>
              <td className="px-2 py-2.5 text-center tabular-nums">{row.lost}</td>
              <td className="px-2 py-2.5 text-center tabular-nums">
                {row.goalsFor}:{row.goalsAgainst}
              </td>
              <td className="px-2 py-2.5 text-center tabular-nums">
                {formatDiff(row.goalDiff)}
              </td>
              <td className="px-4 py-2.5 text-center font-bold tabular-nums text-ink">
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchListSection({
  title,
  matches,
  onSelect,
  onEnter,
  hideHeader = false,
  compact = false,
}: {
  title: string;
  matches: Match[];
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
  hideHeader?: boolean;
  compact?: boolean;
}) {
  return (
    <section
      className={
        hideHeader
          ? "min-h-0"
          : "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      }
    >
      {!hideHeader ? (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          <span className="text-xs font-semibold text-slate-400">
            {matches.length}
          </span>
        </div>
      ) : null}
      {matches.length === 0 ? (
        <p
          className={`text-center text-sm text-slate-500 ${
            compact ? "px-3 py-10" : "px-4 py-8"
          }`}
        >
          Oyun yoxdur.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {matches.map((match) => {
            const meta = parsePlayoffNotes(match.notes);
            return (
            <li key={match.id}>
              <div
                className={`flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 ${
                  compact ? "px-3 py-3" : "gap-3 px-4 py-4 sm:gap-4"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(match)}
                  className="flex min-w-0 flex-1 flex-col gap-2 text-left transition hover:opacity-90 sm:flex-row sm:items-center sm:gap-3"
                >
                  <div
                    className={`flex shrink-0 items-center gap-2 text-xs text-slate-500 ${
                      compact
                        ? "w-full sm:w-auto"
                        : "w-full sm:w-52 sm:flex-col sm:items-start sm:gap-1"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatWhen(match.scheduledAt)}
                    </span>
                    <span
                      className={`truncate ${
                        match.venue ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      {match.venue || "Məkan təyin edilməyib"}
                    </span>
                  </div>
                  <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
                    <TeamMark
                      name={match.homeTeam.name}
                      logo={match.homeTeam.logo}
                      align="right"
                      badge={meta?.homeLabel}
                    />
                    <div className="min-w-[3.5rem] text-center sm:min-w-[4.5rem]">
                      {match.status === "SCHEDULED" ||
                      match.status === "POSTPONED" ? (
                        <span className="text-lg font-bold tracking-wide text-slate-300">
                          vs
                        </span>
                      ) : (
                        <span className="text-lg font-black tabular-nums text-ink sm:text-xl">
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
                    <TeamMark
                      name={match.awayTeam.name}
                      logo={match.awayTeam.logo}
                      badge={meta?.awayLabel}
                    />
                  </div>
                </button>
                <div className="flex items-center justify-end gap-1">
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${matchStatusClass(
                      match.status,
                    )}`}
                  >
                    {MATCH_STATUS_LABEL[match.status]}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelect(match)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink"
                    title="Vaxt və məkan"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!isFixtureReady(match)}
                    onClick={() => onEnter(match)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                    title={
                      isFixtureReady(match)
                        ? "Oyuna gir"
                        : "Əvvəlcə vaxt və məkan seçin"
                    }
                  >
                    Oyuna gir
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

type GroupMatchTab = "live" | "upcoming" | "finished";

function GroupMatchesTabs({
  liveMatches,
  upcomingMatches,
  finishedMatches,
  onSelect,
  onEnter,
}: {
  liveMatches: Match[];
  upcomingMatches: Match[];
  finishedMatches: Match[];
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
}) {
  const [tab, setTab] = useState<GroupMatchTab>("live");

  const tabs: {
    id: GroupMatchTab;
    label: string;
    count: number;
    matches: Match[];
  }[] = [
    {
      id: "live",
      label: "Canlı",
      count: liveMatches.length,
      matches: liveMatches,
    },
    {
      id: "upcoming",
      label: "Növbəti oyunlar",
      count: upcomingMatches.length,
      matches: upcomingMatches,
    },
    {
      id: "finished",
      label: "Bitmiş",
      count: finishedMatches.length,
      matches: finishedMatches,
    },
  ];

  const active = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-2 pt-2 sm:px-3">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-brand text-ink shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.id === "live" ? (
                  <Radio
                    className={`h-3.5 w-3.5 ${
                      liveMatches.length > 0
                        ? isActive
                          ? "animate-pulse text-rose-600"
                          : "text-rose-500"
                        : "text-slate-400"
                    }`}
                  />
                ) : null}
                <span>{t.label}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                    isActive ? "bg-white/60 text-ink" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="max-h-[min(420px,55vh)] overflow-y-auto">
        <MatchListSection
          title={active.label}
          matches={active.matches}
          onSelect={onSelect}
          onEnter={onEnter}
          hideHeader
          compact
        />
      </div>
    </section>
  );
}

function PlayoffTeamRow({
  name,
  logo,
  badge,
  align = "left",
}: {
  name: string;
  logo?: string | null;
  badge?: string | null;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {logo ? (
        <img src={logo} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
        {badge ? (
          <p className="text-[11px] font-semibold text-slate-400">{badge}</p>
        ) : null}
      </div>
    </div>
  );
}

function PlayoffMatchCard({
  match,
  onSelect,
  onEnter,
}: {
  match: Match;
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
}) {
  const meta = parsePlayoffNotes(match.notes);
  const ready = isFixtureReady(match);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium text-slate-500">
          {formatCompactWhen(match.scheduledAt)}
        </span>
        <span
          className={`inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${matchStatusClass(
            match.status,
          )}`}
        >
          {match.status === "SCHEDULED" ? "Planlanıb" : MATCH_STATUS_LABEL[match.status]}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onSelect(match)}
        className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 text-left"
      >
        <PlayoffTeamRow
          name={match.homeTeam.name}
          logo={match.homeTeam.logo}
          badge={meta?.homeLabel}
          align="right"
        />
        <div className="min-w-[2.75rem] text-center">
          {match.status === "SCHEDULED" || match.status === "POSTPONED" ? (
            <span className="text-sm font-bold text-slate-300">vs</span>
          ) : (
            <span className="text-base font-black tabular-nums text-ink">
              {match.homeScore}:{match.awayScore}
            </span>
          )}
        </div>
        <PlayoffTeamRow
          name={match.awayTeam.name}
          logo={match.awayTeam.logo}
          badge={meta?.awayLabel}
        />
      </button>
      <div className="mt-2 flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => onSelect(match)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-ink"
          title="Vaxt və məkan"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => onEnter(match)}
          className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          title={ready ? "Oyuna gir" : "Əvvəlcə vaxt və məkan seçin"}
        >
          Oyuna gir
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function PlayoffPlaceholderCard({ item }: { item: PlayoffPlaceholder }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3">
      <p className="mb-2 text-[11px] font-medium text-slate-400">Gözlənilir</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <p className="truncate text-right text-xs font-semibold text-slate-500">
          {item.homeLabel}
        </p>
        <span className="text-sm font-bold text-slate-300">vs</span>
        <p className="truncate text-xs font-semibold text-slate-500">
          {item.awayLabel}
        </p>
      </div>
    </div>
  );
}

function ChampionshipScorerTable({
  rows,
}: {
  rows: ChampScorerRow[];
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <CircleDot className="h-4 w-4 text-emerald-600" />
        <Handshake className="h-4 w-4 text-sky-600" />
        <h3 className="text-sm font-bold text-ink">Qol və asist bombardirləri</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">
          Hələ qol və ya asist yoxdur.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2.5 text-center">#</th>
                <th className="px-3 py-2.5">Oyunçu</th>
                <th className="px-3 py-2.5">Komanda</th>
                <th className="px-3 py-2.5 text-center">Qol</th>
                <th className="px-3 py-2.5 text-center">Asist</th>
                <th className="px-3 py-2.5 text-center">Q+A</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2.5 text-center font-bold tabular-nums text-slate-400">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {row.photo ? (
                        <img
                          src={row.photo}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                          {playerDisplayName(row).slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span>
                        <span className="block font-semibold text-ink">
                          {playerDisplayName(row)}
                        </span>
                        {row.shirtNumber != null ? (
                          <span className="text-xs text-slate-400">
                            #{row.shirtNumber}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {row.teamLogo ? (
                        <img
                          src={row.teamLogo}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      ) : null}
                      <span className="truncate text-slate-600">
                        {row.teamName}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center text-base font-black tabular-nums text-ink">
                    {row.goals}
                  </td>
                  <td className="px-3 py-2.5 text-center text-base font-black tabular-nums text-ink">
                    {row.assists}
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold tabular-nums text-slate-500">
                    {row.goals + row.assists}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

type PlayoffBoardTab = "overview" | MatchStage;

function PlayoffStageColumn({
  stage,
  matches,
  placeholders,
  onSelect,
  onEnter,
  showConnector,
}: {
  stage: MatchStage;
  matches: Match[];
  placeholders: PlayoffPlaceholder[];
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
  showConnector: boolean;
}) {
  return (
    <div className="flex min-w-[16.5rem] flex-1">
      <div className="flex w-full min-w-[16.5rem] flex-col">
        <div
          className={`mb-3 rounded-lg px-3 py-2 text-center text-sm font-bold shadow-sm ${STAGE_COLUMN_CLASS[stage]}`}
        >
          {STAGE_LABEL[stage]}
        </div>
        <div className="flex flex-1 flex-col justify-around gap-3">
          {matches.map((match) => (
            <PlayoffMatchCard
              key={match.id}
              match={match}
              onSelect={onSelect}
              onEnter={onEnter}
            />
          ))}
          {placeholders.map((item) => (
            <PlayoffPlaceholderCard key={item.key} item={item} />
          ))}
        </div>
      </div>
      {showConnector ? (
        <div className="mx-1 hidden w-5 shrink-0 self-stretch sm:block" aria-hidden>
          <div className="mt-[2.6rem] h-[calc(100%-2.6rem)] w-full border-t border-r border-slate-200/90" />
        </div>
      ) : null}
    </div>
  );
}

export function AdminChampionshipDetailPage() {
  const { championshipId: idParam } = useParams();
  const championshipId = Number(idParam);
  const navigate = useNavigate();

  const [championship, setChampionship] = useState<Championship | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [allTeams, setAllTeams] = useState<TeamSummary[]>([]);
  const [teamSearch, setTeamSearch] = useState("");

  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);

  const [scheduleMatch, setScheduleMatch] = useState<Match | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduleVenue, setScheduleVenue] = useState("");
  const [playoffView, setPlayoffView] = useState<"playoff" | "groups">("playoff");
  const [playoffBoardTab, setPlayoffBoardTab] = useState<PlayoffBoardTab>("overview");
  const [tieGroups, setTieGroups] = useState<PlayoffTieGroup[] | null>(null);
  const [tieOrders, setTieOrders] = useState<Record<string, number[]>>({});

  const [groupsModalOpen, setGroupsModalOpen] = useState(false);
  const [addTeamModalOpen, setAddTeamModalOpen] = useState(false);
  const [addToGroupModal, setAddToGroupModal] = useState<ChampionshipGroup | null>(
    null,
  );
  const [editGroupModal, setEditGroupModal] = useState<ChampionshipGroup | null>(
    null,
  );

  const [groupCount, setGroupCount] = useState("2");
  const [slotMode, setSlotMode] = useState<SlotMode>("same");
  const [sameSlots, setSameSlots] = useState("4");
  const [perGroupSlots, setPerGroupSlots] = useState<string[]>(["4", "4"]);
  const [autoAssign, setAutoAssign] = useState(true);

  const [pickerTeamId, setPickerTeamId] = useState<number | "">("");
  const [addToGroupTeamId, setAddToGroupTeamId] = useState<number | "">("");

  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupSlots, setEditGroupSlots] = useState("");

  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isInteger(championshipId) || championshipId <= 0) {
      setError("Yanlis cempionat");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [champ, matchList] = await Promise.all([
        fetchChampionship(championshipId),
        fetchChampionshipMatches(championshipId),
      ]);
      setChampionship(champ);
      setMatches(matchList);
      if (champ.groups.length > 0) {
        setActiveGroupId((prev) => {
          if (prev && champ.groups.some((g) => g.id === prev)) return prev;
          return champ.groups[0].id;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yuklenmedi");
      setChampionship(null);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [championshipId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!activeGroupId) {
      setStandings([]);
      return;
    }
    let cancelled = false;
    setStandingsLoading(true);
    fetchGroupStandings(activeGroupId)
      .then((rows) => {
        if (!cancelled) setStandings(rows);
      })
      .catch(() => {
        if (!cancelled) setStandings([]);
      })
      .finally(() => {
        if (!cancelled) setStandingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeGroupId, matches]);

  useEffect(() => {
    const n = Number(groupCount) || 2;
    setPerGroupSlots((prev) => {
      const next = [...prev];
      while (next.length < n) next.push("4");
      return next.slice(0, n);
    });
  }, [groupCount]);

  const loadTeamPicker = useCallback(async (q?: string) => {
    try {
      const teams = await fetchTeams({ q: q || undefined });
      setAllTeams(teams);
    } catch {
      setAllTeams([]);
    }
  }, []);

  useEffect(() => {
    if (addTeamModalOpen || addToGroupModal) {
      void loadTeamPicker(teamSearch);
    }
  }, [addTeamModalOpen, addToGroupModal, teamSearch, loadTeamPicker]);

  const enrolledTeamIds = useMemo(
    () => new Set(championship?.teams.map((t) => t.teamId) ?? []),
    [championship?.teams],
  );

  const availablePickerTeams = useMemo(
    () => allTeams.filter((t) => !enrolledTeamIds.has(t.id)),
    [allTeams, enrolledTeamIds],
  );

  const teamsInGroups = useMemo(() => {
    const ids = new Set<number>();
    championship?.groups.forEach((g) =>
      g.teams.forEach((gt) => ids.add(gt.teamId)),
    );
    return ids;
  }, [championship?.groups]);

  const unassignedChampTeams = useMemo(
    () =>
      championship?.teams.filter((t) => !teamsInGroups.has(t.teamId)) ?? [],
    [championship?.teams, teamsInGroups],
  );

  const activeGroup = useMemo(
    () => championship?.groups.find((g) => g.id === activeGroupId) ?? null,
    [championship?.groups, activeGroupId],
  );

  const groupMatches = useMemo(() => {
    if (!activeGroupId) return [];
    return matches.filter(
      (m) => m.groupId === activeGroupId && m.stage === "GROUP_STAGE",
    );
  }, [matches, activeGroupId]);

  const liveMatches = useMemo(
    () => groupMatches.filter((m) => m.status === "LIVE"),
    [groupMatches],
  );
  const upcomingMatches = useMemo(
    () =>
      groupMatches.filter(
        (m) => m.status === "SCHEDULED" || m.status === "POSTPONED",
      ),
    [groupMatches],
  );
  const finishedMatches = useMemo(
    () =>
      groupMatches.filter(
        (m) => m.status === "FINISHED" || m.status === "CANCELLED",
      ),
    [groupMatches],
  );

  const playoffMatches = useMemo(
    () => matches.filter((m) => m.stage && m.stage !== "GROUP_STAGE"),
    [matches],
  );

  const playoffByStage = useMemo(() => {
    const map = new Map<MatchStage, Match[]>();
    for (const stage of PLAYOFF_STAGES) map.set(stage, []);
    for (const m of playoffMatches) {
      const stage = m.stage as MatchStage;
      if (map.has(stage)) map.get(stage)!.push(m);
    }
    for (const [stage, rows] of map) {
      rows.sort((a, b) => (a.round ?? 0) - (b.round ?? 0) || a.id - b.id);
      map.set(stage, rows);
    }
    return map;
  }, [playoffMatches]);

  const playoffPlaceholderMap = useMemo(
    () => playoffPlaceholders(playoffMatches),
    [playoffMatches],
  );

  const visiblePlayoffStages = useMemo(
    () =>
      PLAYOFF_STAGES.filter(
        (stage) =>
          (playoffByStage.get(stage)?.length ?? 0) > 0 ||
          (playoffPlaceholderMap.get(stage)?.length ?? 0) > 0,
      ),
    [playoffByStage, playoffPlaceholderMap],
  );

  const scorerRows = useMemo(() => {
    const rows = collectChampionshipScorers(matches);
    return rows
      .filter((row) => row.goals > 0 || row.assists > 0)
      .sort(
        (a, b) =>
          b.goals - a.goals ||
          b.assists - a.assists ||
          b.goals + b.assists - (a.goals + a.assists) ||
          playerDisplayName(a).localeCompare(playerDisplayName(b), "az"),
      );
  }, [matches]);

  const unfinishedGroupMatches = useMemo(
    () =>
      matches.filter(
        (m) =>
          m.stage === "GROUP_STAGE" &&
          m.status !== "FINISHED" &&
          m.status !== "CANCELLED",
      ).length,
    [matches],
  );

  const parsedGroupCount = Number(groupCount);
  const resolvedSlots = useMemo(() => {
    const count = Number.isInteger(parsedGroupCount) ? parsedGroupCount : 0;
    if (slotMode === "perGroup") {
      return perGroupSlots.slice(0, count).map((s) => {
        const n = Number(s);
        return Number.isInteger(n) ? n : NaN;
      });
    }
    const n = Number(sameSlots);
    return Array.from({ length: count }, () =>
      Number.isInteger(n) ? n : NaN,
    );
  }, [parsedGroupCount, slotMode, sameSlots, perGroupSlots]);

  const groupsSlotError = useMemo(() => {
    const teamCount = championship?.teams.length ?? 0;
    if (teamCount < GROUP_CHAMP_TEAM_MIN) {
      return `Qrup yaratmaq ucun en azi ${GROUP_CHAMP_TEAM_MIN} komanda lazimdir`;
    }
    if (teamCount > GROUP_CHAMP_TEAM_MAX) {
      return `Maksimum ${GROUP_CHAMP_TEAM_MAX} komanda ola biler`;
    }
    const count = Number(groupCount);
    const slots = resolvedSlots.map((s) => (Number.isInteger(s) ? s : null));
    return validateGroupSlots({
      teamCount,
      groupCount: count,
      slots,
      slotMode,
    });
  }, [championship?.teams.length, groupCount, resolvedSlots, slotMode]);

  const runAction = async (fn: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Emeliyyat ugursuz oldu",
      );
    } finally {
      setBusy(false);
    }
  };

  const openSchedule = (match: Match) => {
    setScheduleMatch(match);
    setScheduleAt(toDatetimeLocal(match.scheduledAt));
    setScheduleVenue(match.venue ?? "");
    setModalError(null);
  };

  const enterMatch = (match: Match) => {
    navigate(`/admin/football/matches/${match.id}`);
  };

  const handleSaveSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!scheduleMatch) return;
    if (!scheduleAt) {
      setModalError("Oyun vaxtı mütləqdir");
      return;
    }
    if (!scheduleVenue.trim()) {
      setModalError("Məkan mütləqdir");
      return;
    }
    if (isKickoffTooSoon(scheduleAt)) {
      setModalError(
        "Oyun vaxtı keçmişdə ola bilməz. Ən azı 1 saat sonra seçin.",
      );
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      const updated = await updateChampionshipMatch(scheduleMatch.id, {
        scheduledAt: new Date(scheduleAt).toISOString(),
        venue: scheduleVenue.trim(),
      });
      setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setScheduleMatch(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Yenilenmedi");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleAddTeam = async (e: FormEvent) => {
    e.preventDefault();
    if (!pickerTeamId) {
      setModalError("Komanda secin");
      return;
    }
    if (
      championship &&
      championship.format !== "PLAYOFF_ONLY" &&
      championship.teams.length >= GROUP_CHAMP_TEAM_MAX
    ) {
      setModalError(`Maksimum ${GROUP_CHAMP_TEAM_MAX} komanda ola biler`);
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      const updated = await addChampionshipTeam(championshipId, pickerTeamId);
      setChampionship(updated);
      setAddTeamModalOpen(false);
      setPickerTeamId("");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Elave edilmedi");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleRemoveTeam = async (teamId: number) => {
    if (!window.confirm("Komandani cempionatdan cixarmaq isteyirsiniz?")) return;
    await runAction(async () => {
      const updated = await removeChampionshipTeam(championshipId, teamId);
      setChampionship(updated);
    });
  };

  const handleCreateGroups = async (e: FormEvent) => {
    e.preventDefault();
    const count = Number(groupCount);
    if (groupsSlotError) {
      setModalError(groupsSlotError);
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      const payload: Parameters<typeof createChampionshipGroups>[1] =
        slotMode === "perGroup"
          ? {
              groupCount: count,
              perGroupSlots: resolvedSlots,
              autoAssign,
            }
          : {
              groupCount: count,
              teamSlots: Number(sameSlots),
              autoAssign,
            };
      await createChampionshipGroups(championshipId, payload);
      setGroupsModalOpen(false);
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Qruplar yaradilmadi");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleStartGroupStage = () => {
    void runAction(async () => {
      const updated = await startGroupStage(championshipId);
      setChampionship(updated);
      await load();
    });
  };

  const handleStartPlayoff = (playoffOnly = false, tieBreakTeamIds?: number[]) => {
    const msg = playoffOnly
      ? "Playoff merhelesini baslatmaq isteyirsiniz? Komanda sayina uygun bracket yaradilacaq."
      : "Qrup merhelesini bitirib playoff baslatmaq isteyirsiniz?";
    if (!tieBreakTeamIds && !window.confirm(msg)) return;
    void runAction(async () => {
      try {
        await startPlayoff(championshipId, { playoffOnly, tieBreakTeamIds });
        setTieGroups(null);
        setPlayoffView("playoff");
        setScheduleMatch(null);
        await load();
      } catch (err) {
        if (err instanceof ChampApiError && err.code === "PLAYOFF_TIE" && err.ties?.length) {
          setTieGroups(err.ties);
          setTieOrders(
            Object.fromEntries(
              err.ties.map((g) => [g.id, g.teams.map((t) => t.teamId)]),
            ),
          );
          setActionError(err.message);
          return;
        }
        throw err;
      }
    });
  };

  const submitTieBreak = () => {
    if (!tieGroups) return;
    const ids = tieGroups.flatMap((g) => tieOrders[g.id] ?? g.teams.map((t) => t.teamId));
    handleStartPlayoff(false, ids);
  };

  const moveTieTeam = (groupId: string, index: number, dir: -1 | 1) => {
    setTieOrders((prev) => {
      const list = [...(prev[groupId] ?? [])];
      const next = index + dir;
      if (next < 0 || next >= list.length) return prev;
      [list[index], list[next]] = [list[next], list[index]];
      return { ...prev, [groupId]: list };
    });
  };

  const handleAddToGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!addToGroupModal || !addToGroupTeamId) {
      setModalError("Komanda secin");
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      await addTeamToGroup(addToGroupModal.id, addToGroupTeamId);
      setAddToGroupModal(null);
      setAddToGroupTeamId("");
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Elave edilmedi");
    } finally {
      setModalSubmitting(false);
    }
  };

  const openEditGroup = (group: ChampionshipGroup) => {
    setEditGroupModal(group);
    setEditGroupName(group.name);
    setEditGroupSlots(
      group.teamSlots != null
        ? String(group.teamSlots)
        : String(GROUP_CAPACITY_MIN),
    );
    setModalError(null);
  };

  const handleEditGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!editGroupModal) return;
    setModalSubmitting(true);
    setModalError(null);
    try {
      await updateChampionshipGroup(editGroupModal.id, {
        name: editGroupName.trim(),
        teamSlots: Number(editGroupSlots),
      });
      setEditGroupModal(null);
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Yenilenmedi");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!window.confirm("Qrupu silmek isteyirsiniz?")) return;
    await runAction(async () => {
      await deleteChampionshipGroup(groupId);
      await load();
    });
  };

  const handleRemoveFromGroup = async (groupId: number, teamId: number) => {
    await runAction(async () => {
      await removeTeamFromGroup(groupId, teamId);
      await load();
    });
  };

  if (!Number.isInteger(championshipId) || championshipId <= 0) {
    return (
      <AdminPageShell title="Cempionat">
        <p className="text-sm text-rose-600">Yanlis cempionat ID.</p>
        <Link
          to="/admin/football/championships"
          className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Siyahiya qayit
        </Link>
      </AdminPageShell>
    );
  }

  if (loading) {
    return (
      <AdminPageShell title="Cempionat">
        <p className="py-16 text-center text-sm text-slate-500">Yuklenir...</p>
      </AdminPageShell>
    );
  }

  if (error || !championship) {
    return (
      <AdminPageShell title="Cempionat">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error ?? "Cempionat tapilmadi"}
        </div>
        <Link
          to="/admin/football/championships"
          className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Siyahiya qayit
        </Link>
      </AdminPageShell>
    );
  }

  const isSetup = isSetupStatus(championship.status);
  const isGroupStage = championship.status === "GROUP_STAGE";
  const isPlayoff =
    championship.status === "PLAYOFF" || championship.status === "COMPLETED";
  const isPlayoffOnlyFormat = championship.format === "PLAYOFF_ONLY";
  const playoffReady =
    isPlayoffOnlyFormat &&
    championship.maxTeams != null &&
    championship.teams.length === championship.maxTeams;
  const playoffStageTabs: PlayoffBoardTab[] = [
    "overview",
    ...visiblePlayoffStages,
  ];
  const activePlayoffTab =
    playoffBoardTab === "overview" ||
    visiblePlayoffStages.includes(playoffBoardTab)
      ? playoffBoardTab
      : "overview";
  const playoffStatCards = [
    {
      icon: Users,
      value: String(championship.teams.length),
      label: "Komanda",
    },
    {
      icon: Radio,
      value: String(playoffMatches.length),
      label: "Oyun",
    },
    {
      icon: Medal,
      value: String(visiblePlayoffStages.length),
      label: "Mərhələ",
    },
    {
      icon: Trophy,
      value: String(
        playoffByStage.get("FINAL")?.length ??
          playoffPlaceholderMap.get("FINAL")?.length ??
          0,
      ),
      label: "Final",
    },
    {
      icon: Calendar,
      value: formatCompactDate(championship.startDate),
      label: "Başlanğıc",
    },
  ];
  const focusedPlayoffMatches =
    activePlayoffTab === "overview"
      ? []
      : (playoffByStage.get(activePlayoffTab) ?? []);
  const focusedPlayoffPlaceholders =
    activePlayoffTab === "overview"
      ? []
      : (playoffPlaceholderMap.get(activePlayoffTab) ?? []);

  return (
    <AdminPageShell
      title={championship.name}
      subtitle={
        championship.description ||
        `${championship.format === "PLAYOFF_ONLY" ? "Yalniz Playoff" : "Qrup + Playoff"} · ${championship.matchFormat === "HOME_AWAY" ? "Ev-sefer" : "1 oyun"} · ${championship.teamCount} komanda · ${championship.matchCount} oyun`
      }
      action={
        <Link
          to="/admin/football/championships"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Siyahı
        </Link>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${statusClass(
            championship.status,
          )}`}
        >
          {STATUS_LABEL[championship.status]}
        </span>
        <span className="text-xs text-slate-400">
          {championship.sport?.name ?? "Futbol"}
        </span>
      </div>

      {actionError ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {actionError}
        </div>
      ) : null}

      {isSetup ? (
        <div
          className={`grid gap-6 ${
            isPlayoffOnlyFormat ? "" : "lg:grid-cols-2"
          }`}
        >
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brand" />
                <h2 className="text-sm font-bold text-ink">Komandalar</h2>
                <span className="text-xs text-slate-400">
                  {championship.teams.length}
                  {isPlayoffOnlyFormat
                    ? championship.maxTeams
                      ? ` / ${championship.maxTeams}`
                      : ""
                    : ` / ${GROUP_CHAMP_TEAM_MAX}`}
                </span>
              </div>
              <button
                type="button"
                disabled={
                  busy ||
                  (isPlayoffOnlyFormat
                    ? championship.maxTeams != null &&
                      championship.teams.length >= championship.maxTeams
                    : championship.teams.length >= GROUP_CHAMP_TEAM_MAX)
                }
                onClick={() => {
                  setPickerTeamId("");
                  setModalError(null);
                  setAddTeamModalOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-brand-dark disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Elave et
              </button>
            </div>
            {isPlayoffOnlyFormat ? (
              <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
                Yalniz playoff · {championship.maxTeams ?? "—"} komanda lazimdir
                (4 / 8 / 16). Sonra Pleyoff basla.
              </p>
            ) : (
              <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
                {GROUP_CHAMP_TEAM_MIN}–{GROUP_CHAMP_TEAM_MAX} komanda. Baslatmaq
                ucun minimum {GROUP_CHAMP_TEAM_MIN} komanda lazimdir.
              </p>
            )}
            {championship.teams.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                Hele komanda yoxdur. Sistemden komanda elave edin.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {championship.teams.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <TeamMark name={row.team.name} logo={row.team.logo} />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleRemoveTeam(row.teamId)}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      title="Cixart"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!isPlayoffOnlyFormat ? (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-brand" />
                  <h2 className="text-sm font-bold text-ink">Qruplar</h2>
                  <span className="text-xs text-slate-400">
                    {championship.groups.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setSlotMode("same");
                    setGroupCount("2");
                    setSameSlots("4");
                    setAutoAssign(true);
                    setGroupsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Qrup yarat
                </button>
              </div>

              {championship.groups.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-500">
                  Qruplar hele yaradilmayib. &quot;Qrup yarat&quot; duymesine basin.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {championship.groups.map((group) => (
                    <li key={group.id} className="px-4 py-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-ink">{group.name}</p>
                          <p className="text-xs text-slate-500">
                            {group.teams.length}
                            {group.teamSlots != null
                              ? ` / ${group.teamSlots}`
                              : ""}{" "}
                            komanda
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            disabled={
                              group.teams.length >=
                              (group.teamSlots ?? GROUP_CAPACITY_MAX)
                            }
                            onClick={() => {
                              setAddToGroupTeamId("");
                              setModalError(null);
                              setAddToGroupModal(group);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink disabled:opacity-40"
                            title="Komanda elave et"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditGroup(group)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink"
                            title="Redakte"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleDeleteGroup(group.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {group.teams.length === 0 ? (
                        <p className="text-xs text-slate-400">Komanda yoxdur</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {group.teams.map((gt) => (
                            <li
                              key={gt.id}
                              className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5"
                            >
                              <TeamMark
                                name={gt.team.name}
                                logo={gt.team.logo}
                                size="sm"
                              />
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void handleRemoveFromGroup(group.id, gt.teamId)
                                }
                                className="text-slate-300 hover:text-rose-600 disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          <div
            className={`${
              isPlayoffOnlyFormat ? "" : "lg:col-span-2"
            } flex flex-wrap gap-3`}
          >
            {isPlayoffOnlyFormat ? (
              <button
                type="button"
                disabled={busy || !playoffReady}
                onClick={() => handleStartPlayoff(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Pleyoff basla
                {!playoffReady && championship.maxTeams
                  ? ` (${championship.teams.length}/${championship.maxTeams})`
                  : ""}
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  busy ||
                  championship.groups.length === 0 ||
                  championship.teams.length < GROUP_CHAMP_TEAM_MIN
                }
                onClick={handleStartGroupStage}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-brand-dark disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Cempionati baslat
              </button>
            )}
            {!isPlayoffOnlyFormat &&
            championship.teams.length < GROUP_CHAMP_TEAM_MIN ? (
              <p className="w-full text-xs text-slate-500">
                Baslatmaq ucun en azi {GROUP_CHAMP_TEAM_MIN} komanda elave edin
                ({championship.teams.length}/{GROUP_CHAMP_TEAM_MIN}).
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {isGroupStage ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {championship.groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveGroupId(g.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    activeGroupId === g.id
                      ? "bg-brand text-ink shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || unfinishedGroupMatches > 0}
                onClick={() => handleStartPlayoff(false)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                title={
                  unfinishedGroupMatches > 0
                    ? "Əvvəlcə bütün qrup oyunlarını bitirin"
                    : "Playoff mərhələsini başlat"
                }
              >
                <Trophy className="h-4 w-4" />
                Pley-off
              </button>
            </div>
          </div>

          <div className="space-y-4">
          
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-bold text-ink">
                  {activeGroup?.name ?? "Qrup"} — Cedvel
                </h3>
              </div>
              {standingsLoading ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  Cedvel yuklenir...
                </p>
              ) : (
                <StandingsTable rows={standings} />
              )}
            </section>

            <GroupMatchesTabs
              key={activeGroupId ?? "none"}
              liveMatches={liveMatches}
              upcomingMatches={upcomingMatches}
              finishedMatches={finishedMatches}
              onSelect={openSchedule}
              onEnter={enterMatch}
            />

            <ChampionshipScorerTable rows={scorerRows} />
          </div>
        </div>
      ) : null}

      {isPlayoff ? (
        <div className="space-y-6">
          {championship.groups.length > 0 ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPlayoffView("playoff")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  playoffView === "playoff"
                    ? "bg-brand text-ink"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                Playoff
              </button>
              <button
                type="button"
                onClick={() => setPlayoffView("groups")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  playoffView === "groups"
                    ? "bg-brand text-ink"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                Qrup merhelesine qayit
              </button>
            </div>
          ) : null}

          {playoffView === "groups" && championship.groups.length > 0 ? (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                {championship.groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setActiveGroupId(g.id)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      activeGroupId === g.id
                        ? "bg-brand text-ink shadow-sm"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h3 className="text-sm font-bold text-ink">
                    {activeGroup?.name ?? "Qrup"} — Cedvel
                  </h3>
                </div>
                {standingsLoading ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">
                    Cedvel yuklenir...
                  </p>
                ) : (
                  <StandingsTable rows={standings} />
                )}
              </section>
              <MatchListSection
                title="Bitmis oyunlar"
                matches={finishedMatches}
                onSelect={openSchedule}
                onEnter={enterMatch}
              />
              <ChampionshipScorerTable rows={scorerRows} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {playoffStatCards.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                      <stat.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-lg font-black tabular-nums text-ink">
                        {stat.value}
                      </p>
                      <p className="text-xs font-semibold text-slate-400">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                {playoffStageTabs.map((tab) => {
                  const active = activePlayoffTab === tab;
                  const label =
                    tab === "overview" ? "Ümumi baxış" : STAGE_LABEL[tab];
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPlayoffBoardTab(tab)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-violet-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {tab === "overview" ? (
                        <Trophy className="h-3.5 w-3.5" />
                      ) : null}
                      {label}
                    </button>
                  );
                })}
              </div>

              {playoffMatches.length === 0 &&
              visiblePlayoffStages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                  <Trophy className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-sm text-slate-500">Playoff oyunu yoxdur.</p>
                </div>
              ) : activePlayoffTab === "overview" ? (
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <h3 className="text-sm font-bold text-ink">
                      Turnir mərhələləri
                    </h3>
                  </div>
                  <div className="overflow-x-auto px-4 py-5">
                    <div className="flex min-w-max items-stretch gap-1">
                      {visiblePlayoffStages.map((stage, index) => (
                        <PlayoffStageColumn
                          key={stage}
                          stage={stage}
                          matches={playoffByStage.get(stage) ?? []}
                          placeholders={
                            playoffPlaceholderMap.get(stage) ?? []
                          }
                          onSelect={openSchedule}
                          onEnter={enterMatch}
                          showConnector={
                            index < visiblePlayoffStages.length - 1
                          }
                        />
                      ))}
                    </div>
                  </div>
                </section>
              ) : (
                <section className="space-y-3">
                  {focusedPlayoffMatches.map((match) => (
                    <PlayoffMatchCard
                      key={match.id}
                      match={match}
                      onSelect={openSchedule}
                      onEnter={enterMatch}
                    />
                  ))}
                  {focusedPlayoffPlaceholders.map((item) => (
                    <PlayoffPlaceholderCard key={item.key} item={item} />
                  ))}
                </section>
              )}

              {championship.teams.length > 0 ? (
                <section>
                  <h3 className="mb-3 text-sm font-bold text-ink">
                    İştirak edən komandalar
                  </h3>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {championship.teams.map((row) => {
                      const badge = teamGroupCaption(
                        championship.groups,
                        row.teamId,
                      );
                      return (
                        <div
                          key={row.id}
                          className="flex min-w-[9.5rem] items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                        >
                          {row.team.logo ? (
                            <img
                              src={row.team.logo}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                              {row.team.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">
                              {row.team.name}
                            </p>
                            {badge ? (
                              <p className="text-[11px] font-semibold text-slate-400">
                                {badge} qrupu
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <ChampionshipScorerTable rows={scorerRows} />
            </div>
          )}
        </div>
      ) : null}

      <AdminModal
        open={scheduleMatch != null}
        title="Oyun vaxtı və məkan"
        onClose={() => setScheduleMatch(null)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setScheduleMatch(null)}
              disabled={modalSubmitting}
            />
            {scheduleMatch ? (
              <button
                type="button"
                disabled={!isFixtureReady(scheduleMatch)}
                onClick={() => enterMatch(scheduleMatch)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                title={
                  isFixtureReady(scheduleMatch)
                    ? "Oyuna gir"
                    : "Əvvəlcə vaxt və məkanı yadda saxlayın"
                }
              >
                Oyuna gir
              </button>
            ) : null}
            <ModalSubmitButton
              label="Yadda saxla"
              loading={modalSubmitting}
              formId="schedule-match"
            />
          </>
        }
      >
        <ModalForm id="schedule-match" onSubmit={(e) => void handleSaveSchedule(e)}>
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
          {modalError ? (
            <p className="text-sm font-medium text-rose-600">{modalError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>

      <AdminModal
        open={addTeamModalOpen}
        title="Komanda elave et"
        onClose={() => setAddTeamModalOpen(false)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setAddTeamModalOpen(false)}
              disabled={modalSubmitting}
            />
            <ModalSubmitButton
              label="Elave et"
              loading={modalSubmitting}
              formId="add-champ-team"
            />
          </>
        }
      >
        <ModalForm id="add-champ-team" onSubmit={handleAddTeam}>
          <Field label="Axtar">
            <input
              className={inputClass}
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Komanda adi..."
            />
          </Field>
          <Field label="Komanda" required>
            <select
              className={inputClass}
              value={pickerTeamId}
              onChange={(e) =>
                setPickerTeamId(e.target.value ? Number(e.target.value) : "")
              }
              required
            >
              <option value="">Secin...</option>
              {availablePickerTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          {modalError ? (
            <p className="text-sm font-medium text-rose-600">{modalError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>

      <AdminModal
        open={groupsModalOpen}
        title="Qrup yarat"
        onClose={() => setGroupsModalOpen(false)}
        size="lg"
        footer={
          <>
            <ModalCancelButton
              onClick={() => setGroupsModalOpen(false)}
              disabled={modalSubmitting}
            />
            <ModalSubmitButton
              label="Yarat"
              loading={modalSubmitting}
              formId="create-groups"
            />
          </>
        }
      >
        <ModalForm id="create-groups" onSubmit={handleCreateGroups}>
          <p className="mb-3 text-xs text-slate-500">
            Komanda sayi: {championship.teams.length}. Qrup sayi 2–4, tutum 3–7.
          </p>
          <Field label="Qrup sayi" required>
            <select
              className={inputClass}
              value={groupCount}
              onChange={(e) => setGroupCount(e.target.value)}
              required
            >
              {Array.from(
                { length: GROUP_COUNT_MAX - GROUP_COUNT_MIN + 1 },
                (_, i) => GROUP_COUNT_MIN + i,
              ).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Slot rejimi">
            <select
              className={inputClass}
              value={slotMode}
              onChange={(e) => setSlotMode(e.target.value as SlotMode)}
            >
              <option value="same">Eyni her qrupda (same)</option>
              <option value="perGroup">Qrup uzre (perGroup)</option>
            </select>
          </Field>
          {slotMode === "same" ? (
            <Field label="Qrup tutumu" required>
              <select
                className={inputClass}
                value={sameSlots}
                onChange={(e) => setSameSlots(e.target.value)}
              >
                {Array.from(
                  { length: GROUP_CAPACITY_MAX - GROUP_CAPACITY_MIN + 1 },
                  (_, i) => GROUP_CAPACITY_MIN + i,
                ).map((n) => (
                  <option key={n} value={n}>
                    {n} komanda
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {slotMode === "perGroup" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {perGroupSlots.map((val, i) => (
                <Field
                  key={i}
                  label={`Qrup ${String.fromCharCode(65 + i)} tutumu`}
                  required
                >
                  <select
                    className={inputClass}
                    value={val}
                    onChange={(e) => {
                      const next = [...perGroupSlots];
                      next[i] = e.target.value;
                      setPerGroupSlots(next);
                    }}
                  >
                    {Array.from(
                      { length: GROUP_CAPACITY_MAX - GROUP_CAPACITY_MIN + 1 },
                      (_, i2) => GROUP_CAPACITY_MIN + i2,
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n} komanda
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={autoAssign}
              onChange={(e) => setAutoAssign(e.target.checked)}
              className="rounded border-slate-300"
            />
            Komandalari avtomatik payla
          </label>
          {groupsSlotError ? (
            <p className="text-sm font-medium text-rose-600">{groupsSlotError}</p>
          ) : null}
          {modalError && modalError !== groupsSlotError ? (
            <p className="text-sm font-medium text-rose-600">{modalError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>

      <AdminModal
        open={addToGroupModal != null}
        title={`${addToGroupModal?.name ?? "Qrup"} — komanda elave et`}
        onClose={() => setAddToGroupModal(null)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setAddToGroupModal(null)}
              disabled={modalSubmitting}
            />
            <ModalSubmitButton
              label="Elave et"
              loading={modalSubmitting}
              formId="add-to-group"
            />
          </>
        }
      >
        <ModalForm id="add-to-group" onSubmit={handleAddToGroup}>
          <Field label="Komanda" required>
            <select
              className={inputClass}
              value={addToGroupTeamId}
              onChange={(e) =>
                setAddToGroupTeamId(
                  e.target.value ? Number(e.target.value) : "",
                )
              }
              required
            >
              <option value="">Secin...</option>
              {unassignedChampTeams.map((row) => (
                <option key={row.teamId} value={row.teamId}>
                  {row.team.name}
                </option>
              ))}
            </select>
          </Field>
          {unassignedChampTeams.length === 0 ? (
            <p className="text-sm text-slate-500">
              Butun cempionat komandalari artiq qruplardadir ve ya siyahı bosdur.
            </p>
          ) : null}
          {modalError ? (
            <p className="text-sm font-medium text-rose-600">{modalError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>

      <AdminModal
        open={editGroupModal != null}
        title="Qrupu redakte et"
        onClose={() => setEditGroupModal(null)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setEditGroupModal(null)}
              disabled={modalSubmitting}
            />
            <ModalSubmitButton
              label="Yadda saxla"
              loading={modalSubmitting}
              formId="edit-group"
            />
          </>
        }
      >
        <ModalForm id="edit-group" onSubmit={handleEditGroup}>
          <Field label="Ad" required>
            <input
              className={inputClass}
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              required
            />
          </Field>
          <Field label="Qrup tutumu" required>
            <select
              className={inputClass}
              value={editGroupSlots}
              onChange={(e) => setEditGroupSlots(e.target.value)}
              required
            >
              {Array.from(
                { length: GROUP_CAPACITY_MAX - GROUP_CAPACITY_MIN + 1 },
                (_, i) => GROUP_CAPACITY_MIN + i,
              ).map((n) => (
                <option key={n} value={n}>
                  {n} komanda
                </option>
              ))}
            </select>
          </Field>
          {modalError ? (
            <p className="text-sm font-medium text-rose-600">{modalError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>

      <AdminModal
        open={tieGroups != null}
        title="Playoff bərabərliyi"
        onClose={() => setTieGroups(null)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setTieGroups(null)}
              disabled={busy}
            />
            <button
              type="button"
              disabled={busy}
              onClick={submitTieBreak}
              className="inline-flex items-center rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              Sıralamanı təsdiq et
            </button>
          </>
        }
      >
        <p className="mb-4 text-sm text-slate-600">
          Bütün statistikalar eynidir. Yuxarıdakı komanda daha yüksək seed alır.
        </p>
        {tieGroups?.map((group) => {
          const order = tieOrders[group.id] ?? group.teams.map((t) => t.teamId);
          return (
            <div key={group.id} className="mb-4">
              <p className="mb-2 text-sm font-bold text-ink">{group.title}</p>
              <ul className="space-y-1.5">
                {order.map((teamId, index) => {
                  const team = group.teams.find((t) => t.teamId === teamId);
                  if (!team) return null;
                  return (
                    <li
                      key={teamId}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {index + 1}. {team.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {team.points} xal · TF {team.goalDiff} ·{" "}
                          {team.goalsFor} qol · {team.won} qələbə
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveTieTeam(group.id, index, -1)}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === order.length - 1}
                          onClick={() => moveTieTeam(group.id, index, 1)}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </AdminModal>
    </AdminPageShell>
  );
}
