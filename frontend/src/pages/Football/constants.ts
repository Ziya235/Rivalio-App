export const TABS = [
  "Komanda profilim",
  "Oyunçu axtarışı",
  "Oyun təklifləri",
  "Liqalar",
  "Çempionatlar",
] as const;

export type Tab = (typeof TABS)[number];

export const TAB_SLUG: Record<Tab, string> = {
  "Komanda profilim": "team",
  "Oyunçu axtarışı": "players",
  "Oyun təklifləri": "challenge",
  Liqalar: "all-leagues",
  Çempionatlar: "championships",
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
export const TOO_SOON_MSG = "Matç ən azı 1 saat sonra üçün yaradıla bilər";
