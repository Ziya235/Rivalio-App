import type { MatchStatus } from "../../../types/match";

export type { RoundStatus } from "../../../lib/leagueRounds";
export { ROUND_STATUS_LABEL } from "../../../lib/leagueRounds";

export type TabId = "standings" | "matches" | "goals" | "assists" | "ga";

export const TABS: { id: TabId; label: string }[] = [
  { id: "standings", label: "Cədvəl" },
  { id: "matches", label: "Oyunlar" },
  { id: "goals", label: "Bombardirlər" },
  { id: "assists", label: "Asistlər" },
  { id: "ga", label: "Qol + Asist" },
];

export const STATUS_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: "Planlı",
  LIVE: "Canlı",
  FINISHED: "Bitib",
  CANCELLED: "Ləğv",
  POSTPONED: "Təxirə",
};
