import type { League } from "../../types/league";

export const TABS = [
  "Komanda profilim",
  "Oyunçu axtarışı",
  "Challenge",
  "Liqalar",
  "Çempionatlar",
] as const;

export type Tab = (typeof TABS)[number];

export const TAB_SLUG: Record<Tab, string> = {
  "Komanda profilim": "team",
  "Oyunçu axtarışı": "players",
  Challenge: "challenge",
  Liqalar: "all-leagues",
  Çempionatlar: "championships",
};

export const LEAGUE_STATUS_LABEL: Record<League["status"], string> = {
  DRAFT: "Qaralama",
  ACTIVE: "Aktiv",
  FINISHED: "Bitib",
  CANCELLED: "Ləğv",
};

export const SLUG_TAB = {
  ...Object.fromEntries(
    Object.entries(TAB_SLUG).map(([label, slug]) => [slug, label]),
  ),
  leagues: "Liqalar",
  "public-championships": "Çempionatlar",
} as Record<string, Tab>;

export type ModalKind = "team" | "playerSearch" | "challenge" | null;

export const MIN_MATCH_LEAD_MS = 60 * 60 * 1000;
export const TOO_SOON_MSG = "Matç ən azı 1 saat sonra yaradıla bilər";
