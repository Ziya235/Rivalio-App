import type { MatchStage } from "../../../types/championship";
import type { MatchStatus } from "../../../types/match";

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
  SEMI_FINAL: "Yarımfinal",
  FINAL: "Final",
};

export const PLAYOFF_STAGES: MatchStage[] = [
  "PRELIMINARY",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "FINAL",
];

export const STAGE_COLUMN_CLASS: Record<MatchStage, string> = {
  GROUP_STAGE: "bg-slate-100 text-slate-700",
  PRELIMINARY: "bg-violet-100 text-violet-800",
  ROUND_OF_16: "bg-indigo-100 text-indigo-800",
  QUARTER_FINAL: "bg-sky-100 text-sky-800",
  SEMI_FINAL: "bg-emerald-100 text-emerald-800",
  FINAL: "bg-amber-100 text-amber-800",
};

export type ChampScorerRow = {
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

export type PlayoffPlaceholder = {
  key: string;
  slot: number;
  homeLabel: string;
  awayLabel: string;
};

export type PlayoffBoardTab = "overview" | MatchStage;

export type ManagementTabId = "overview" | "groups" | "matches" | "playoff" | "stats";

export const MANAGEMENT_TABS: { id: ManagementTabId; label: string }[] = [
  { id: "overview", label: "İcmal" },
  { id: "groups", label: "Qruplar" },
  { id: "matches", label: "Bütün oyunlar" },
  { id: "playoff", label: "Pley-off" },
  { id: "stats", label: "Statistika" },
];
