import type { ChampionshipStatus } from "../types/championship";
import type { League } from "../types/league";

export type CompetitionPhase = "PLANNED" | "ONGOING" | "FINISHED";

export const COMPETITION_PHASE_LABEL: Record<CompetitionPhase, string> = {
  PLANNED: "Planlaşdırılır",
  ONGOING: "Davam edir",
  FINISHED: "Başa çatıb",
};

export function championshipPhase(status: ChampionshipStatus): CompetitionPhase {
  if (status === "COMPLETED" || status === "FINISHED" || status === "CANCELLED") {
    return "FINISHED";
  }
  if (status === "GROUP_STAGE" || status === "PLAYOFF" || status === "REGISTRATION") {
    return "ONGOING";
  }
  return "PLANNED";
}

export function leaguePhase(status: League["status"]): CompetitionPhase {
  if (status === "ACTIVE") return "ONGOING";
  if (status === "FINISHED" || status === "CANCELLED") return "FINISHED";
  return "PLANNED";
}

export function championshipStatusLabel(status: ChampionshipStatus): string {
  return COMPETITION_PHASE_LABEL[championshipPhase(status)];
}

export function leagueStatusLabel(status: League["status"]): string {
  return COMPETITION_PHASE_LABEL[leaguePhase(status)];
}

export function competitionPhaseClass(phase: CompetitionPhase): string {
  if (phase === "ONGOING") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }
  if (phase === "FINISHED") {
    return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
  }
  return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
}

export function competitionPhaseBadgeClass(phase: CompetitionPhase, light: boolean): string {
  if (phase === "ONGOING") {
    return light
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-emerald-400/30 bg-emerald-500/15 text-emerald-300";
  }
  if (phase === "FINISHED") {
    return light
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-sky-400/30 bg-sky-500/15 text-sky-300";
  }
  return light
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : "border-amber-300/30 bg-amber-400/15 text-amber-200";
}

export function visibilityLabel(visibility: string | null | undefined): string {
  return visibility === "PUBLIC" ? "İctimai" : "Özəl";
}

export function visibilityBadgeClass(visibility: string | null | undefined, light: boolean): string {
  if (visibility === "PUBLIC") {
    return light
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-sky-400/30 bg-sky-500/15 text-sky-300";
  }
  return light
    ? "border-violet-200 bg-violet-50 text-violet-700"
    : "border-violet-400/30 bg-violet-500/15 text-violet-300";
}
