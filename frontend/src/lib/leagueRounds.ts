import { groupMatchesByRound } from "./championshipUi";
import type { Match } from "../types/match";

const MONTHS = [
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
] as const;

export type RoundStatus = "completed" | "current" | "upcoming";

export const ROUND_STATUS_LABEL: Record<RoundStatus, string> = {
  completed: "Tamamlanıb",
  current: "Cari tur",
  upcoming: "Qarşıdadır",
};

export type LeagueRoundGroup = {
  key: string;
  round: number | null;
  label: string;
  matches: Match[];
  status: RoundStatus;
  dateLabel: string | null;
};

function azOrdinalSuffix(value: number): "ci" | "cı" | "cu" | "cü" {
  const abs = Math.abs(Math.trunc(value));
  const last = abs % 10;
  const lastTwo = abs % 100;

  if (lastTwo === 0) {
    return abs % 1000 === 0 ? "ci" : "cü";
  }
  if (last === 0) {
    const tens = Math.floor(lastTwo / 10);
    if (tens === 1 || tens === 3) return "cu";
    if (tens === 4 || tens === 6 || tens === 9) return "cı";
    return "ci";
  }
  if (last === 3 || last === 4) return "cü";
  if (last === 6) return "cı";
  if (last === 9) return "cu";
  return "ci";
}

function roundLabelAz(round: number | null | undefined): string | null {
  if (round == null || !Number.isFinite(round) || round < 1) return null;
  return `${round}-${azOrdinalSuffix(round)} tur`;
}

function isClosedMatch(match: Match): boolean {
  return match.status === "FINISHED" || match.status === "CANCELLED";
}

function roundIsComplete(matches: Match[]): boolean {
  return matches.length > 0 && matches.every(isClosedMatch);
}

function formatDayMonth(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function formatRoundDateRange(matches: Match[]): string | null {
  const dates = matches
    .map((match) => (match.scheduledAt ? new Date(match.scheduledAt) : null))
    .filter((date): date is Date => date != null && !Number.isNaN(date.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());
  if (dates.length === 0) return null;

  const start = dates[0];
  const end = dates[dates.length - 1];
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) return formatDayMonth(start);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS[start.getMonth()]}`;
  }
  return `${formatDayMonth(start)} – ${formatDayMonth(end)}`;
}

export function buildLeagueRounds(matches: Match[]): LeagueRoundGroup[] {
  const groups = groupMatchesByRound(matches);
  const currentIndex = groups.findIndex((group) => !roundIsComplete(group.matches));

  return groups.map((group, index) => {
    const round = group.matches[0]?.round ?? null;
    const status: RoundStatus =
      currentIndex === -1
        ? "completed"
        : index < currentIndex
          ? "completed"
          : index === currentIndex
            ? "current"
            : "upcoming";

    return {
      key: group.key,
      round: round != null && round >= 1 ? round : null,
      label: roundLabelAz(round) ?? group.label ?? "Oyunlar",
      matches: group.matches,
      status,
      dateLabel: formatRoundDateRange(group.matches),
    };
  });
}

export function getCurrentRound(groups: LeagueRoundGroup[]): LeagueRoundGroup | null {
  if (groups.length === 0) return null;
  return groups.find((group) => group.status === "current") ?? groups[groups.length - 1];
}
