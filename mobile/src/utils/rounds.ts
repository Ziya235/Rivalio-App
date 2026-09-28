import type { ChampionshipStatus } from "../types/championship";
import type { Match, MatchStage } from "../types/match";
import { formatDayMonth, monthName, roundLabel } from "./format";
import { PLAYOFF_STAGES, STAGE_LABEL } from "./status";

// Ported from frontend/src/lib/leagueRounds.ts + championshipRounds.ts (pure
// presentation grouping; no business rule decided here).

export type RoundStatus = "completed" | "current" | "upcoming";

export const ROUND_STATUS_LABEL: Record<RoundStatus, string> = {
  completed: "Tamamlanıb",
  current: "Cari tur",
  upcoming: "Qarşıdadır",
};

export type RoundGroup = {
  key: string;
  label: string;
  matches: Match[];
  status: RoundStatus;
  dateLabel: string | null;
};

const isClosed = (m: Match) => m.status === "FINISHED" || m.status === "CANCELLED";
const isGroupMatch = (m: Match) => !m.stage || m.stage === "GROUP_STAGE";

function stageRank(stage?: MatchStage | null): number {
  if (!stage || stage === "GROUP_STAGE") return 0;
  const i = PLAYOFF_STAGES.indexOf(stage);
  return i >= 0 ? i + 1 : 99;
}

function sortByRound(matches: Match[]): Match[] {
  return [...matches].sort(
    (a, b) =>
      stageRank(a.stage) - stageRank(b.stage) ||
      (a.round ?? Number.MAX_SAFE_INTEGER) - (b.round ?? Number.MAX_SAFE_INTEGER) ||
      (a.groupId ?? 0) - (b.groupId ?? 0) ||
      a.id - b.id,
  );
}

function dateRange(matches: Match[]): string | null {
  const dates = matches
    .map((m) => (m.scheduledAt ? new Date(m.scheduledAt) : null))
    .filter((d): d is Date => d != null && !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return null;
  const start = dates[0];
  const end = dates[dates.length - 1];
  if (start.toDateString() === end.toDateString()) return formatDayMonth(start);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${end.getDate()} ${monthName(start.getMonth())}`;
  }
  return `${formatDayMonth(start)} – ${formatDayMonth(end)}`;
}

/** Groups matches by round (group stage) or stage (playoff), marking the current one. */
export function buildRounds(matches: Match[]): RoundGroup[] {
  const groups: Array<{ key: string; label: string; matches: Match[] }> = [];
  for (const match of sortByRound(matches)) {
    const grouped = isGroupMatch(match);
    const key = grouped ? `round-${match.round ?? "none"}` : `stage-${match.stage}`;
    const label = grouped
      ? roundLabel(match.round) ?? "Oyunlar"
      : STAGE_LABEL[match.stage as MatchStage] ?? "Oyunlar";
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.matches.push(match);
    else groups.push({ key, label, matches: [match] });
  }
  const currentIndex = groups.findIndex((g) => !g.matches.every(isClosed));
  return groups.map((g, index) => ({
    ...g,
    dateLabel: dateRange(g.matches),
    status:
      currentIndex === -1 || index < currentIndex
        ? "completed"
        : index === currentIndex
          ? "current"
          : "upcoming",
  }));
}

export function currentRoundIndex(rounds: RoundGroup[]): number {
  const i = rounds.findIndex((r) => r.status === "current");
  return i >= 0 ? i : Math.max(0, rounds.length - 1);
}

export function groupStageRounds(matches: Match[]): RoundGroup[] {
  return buildRounds(matches.filter(isGroupMatch));
}

export function isGroupStageComplete(matches: Match[]): boolean {
  const rounds = groupStageRounds(matches);
  return rounds.length > 0 && rounds.every((r) => r.status === "completed");
}

export type PlayoffColumn = { stage: MatchStage; label: string; matches: Match[]; current: boolean };

/** Playoff stages that exist, in bracket order, with the active stage marked. */
export function playoffColumns(
  matches: Match[],
  status: ChampionshipStatus,
  currentStage?: MatchStage | null,
): PlayoffColumn[] {
  const columns = PLAYOFF_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABEL[stage],
    matches: matches.filter((m) => m.stage === stage).sort((a, b) => (a.round ?? 0) - (b.round ?? 0) || a.id - b.id),
    current: false,
  })).filter((c) => c.matches.length > 0);

  let active: MatchStage | null =
    currentStage && currentStage !== "GROUP_STAGE" ? currentStage : null;
  if (!active && status === "PLAYOFF") {
    active = columns.find((c) => c.matches.some((m) => !isClosed(m)))?.stage ?? null;
  }
  return columns.map((c) => ({ ...c, current: c.stage === active }));
}

export function hasUnfinished(matches: Match[]): number {
  return matches.filter((m) => !isClosed(m)).length;
}

/** Round-robin fixture preview shown before starting a league (web helpers.ts). */
export function leagueFixturePreview(teamCount: number, homeAway: boolean) {
  if (teamCount < 2) return { matches: 0, rounds: 0 };
  const singles = (teamCount * (teamCount - 1)) / 2;
  const rounds = (teamCount % 2 === 1 ? teamCount + 1 : teamCount) - 1;
  return homeAway ? { matches: singles * 2, rounds: rounds * 2 } : { matches: singles, rounds };
}
