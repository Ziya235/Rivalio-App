import type { LeaguePlayerRow } from "../../../types/league";
import type { Match } from "../../../types/match";

export type { LeagueRoundGroup } from "../../../lib/leagueRounds";
export { buildLeagueRounds, getCurrentRound } from "../../../lib/leagueRounds";

export const MIN_KICKOFF_MS = 60 * 60 * 1000;

export function formatDiff(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "Vaxt təyin edilməyib";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Vaxt təyin edilməyib";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function statusBadgeClass(status: Match["status"]): string {
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

export function leagueFixturePreview(teamCount: number, homeAway: boolean) {
  if (teamCount < 2) return { matches: 0, rounds: 0 };
  const singles = (teamCount * (teamCount - 1)) / 2;
  const slots = teamCount % 2 === 1 ? teamCount + 1 : teamCount;
  const rounds = slots - 1;
  return homeAway
    ? { matches: singles * 2, rounds: rounds * 2 }
    : { matches: singles, rounds };
}

export function playerName(row: LeaguePlayerRow): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

export function isFixtureReady(match: Match): boolean {
  return Boolean(match.scheduledAt && match.venue?.trim());
}

export function canEditSchedule(match: Match): boolean {
  return match.status !== "LIVE" && match.status !== "FINISHED";
}

export function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function minKickoffLocal(): string {
  return toDatetimeLocal(new Date(Date.now() + MIN_KICKOFF_MS).toISOString());
}

export function isKickoffTooSoon(iso: string): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() < Date.now() + MIN_KICKOFF_MS - 1000;
}

function isClosedMatch(match: Match): boolean {
  return match.status === "FINISHED" || match.status === "CANCELLED";
}

export function isUnfinishedMatch(match: Match): boolean {
  return !isClosedMatch(match);
}

export function getUnfinishedMatchesCount(matches: Match[]): number {
  return matches.filter(isUnfinishedMatch).length;
}

export function hasUnfinishedMatches(matches: Match[]): boolean {
  return matches.some(isUnfinishedMatch);
}
