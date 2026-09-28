import type { Tone } from "../theme";
import type { ChampionshipStatus } from "../types/championship";
import type { LeagueStatus } from "../types/league";
import type { MatchStage, MatchStatus } from "../types/match";

// Mirrors frontend/src/lib/competitionStatus.ts — the user-facing lifecycle
// is always one of three phases, whatever the internal status is.
export type CompetitionPhase = "PLANNED" | "ONGOING" | "FINISHED";

export const PHASE_LABEL: Record<CompetitionPhase, string> = {
  PLANNED: "Planlaşdırılır",
  ONGOING: "Davam edir",
  FINISHED: "Başa çatıb",
};

export const PHASE_TONE: Record<CompetitionPhase, Tone> = {
  PLANNED: "orange",
  ONGOING: "lime",
  FINISHED: "gray",
};

export function leaguePhase(status: LeagueStatus): CompetitionPhase {
  if (status === "ACTIVE") return "ONGOING";
  if (status === "FINISHED" || status === "CANCELLED") return "FINISHED";
  return "PLANNED";
}

export function championshipPhase(status: ChampionshipStatus): CompetitionPhase {
  if (status === "COMPLETED" || status === "FINISHED" || status === "CANCELLED") return "FINISHED";
  if (status === "GROUP_STAGE" || status === "PLAYOFF" || status === "REGISTRATION") return "ONGOING";
  return "PLANNED";
}

export function visibilityLabel(visibility: string | null | undefined): string {
  return visibility === "PUBLIC" ? "İctimai" : "Özəl";
}

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: "Planlı",
  LIVE: "Canlı",
  FINISHED: "Bitib",
  CANCELLED: "Ləğv",
  POSTPONED: "Təxirə",
};

export const STAGE_LABEL: Record<MatchStage, string> = {
  GROUP_STAGE: "Qrup mərhələsi",
  PRELIMINARY: "Ön mərhələ",
  ROUND_OF_16: "1/8 final",
  QUARTER_FINAL: "1/4 final",
  SEMI_FINAL: "1/2 final",
  FINAL: "Final",
};

export const PLAYOFF_STAGES: MatchStage[] = [
  "PRELIMINARY",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "FINAL",
];

export function formatLabel(format: string, matchFormat?: string): string {
  const f = format === "PLAYOFF_ONLY" ? "Yalnız pley-off" : "Qrup + pley-off";
  const legs = matchFormat === "HOME_AWAY" ? "Ev-səfər" : "1 oyun";
  return `${f} · ${legs}`;
}

export function isSetupStatus(status: ChampionshipStatus): boolean {
  return status === "DRAFT" || status === "REGISTRATION";
}
