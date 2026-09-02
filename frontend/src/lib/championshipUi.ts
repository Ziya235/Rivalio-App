import type {
  ChampionshipFormat,
  ChampionshipStatus,
  MatchStage,
  UserFacingChampStatus,
} from "../types/championship";
import type { Match, MatchStatus } from "../types/match";
import { parsePlayoffNotes } from "./playoffBracket";

export const STAGE_LABEL: Record<MatchStage, string> = {
  GROUP_STAGE: "Qrup mərhələsi",
  PRELIMINARY: "Ön mərhələ",
  ROUND_OF_16: "1/8 Final",
  QUARTER_FINAL: "1/4 Final",
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

export const FORMAT_LABEL: Record<ChampionshipFormat, string> = {
  GROUP_AND_PLAYOFF: "Group Stage + Playoff",
  PLAYOFF_ONLY: "Playoff",
};

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: "Planlı",
  LIVE: "Canlı",
  FINISHED: "Bitib",
  CANCELLED: "Ləğv",
  POSTPONED: "Təxirə",
};

export function toUserFacingStatus(
  status: ChampionshipStatus,
): UserFacingChampStatus {
  if (status === "COMPLETED") return "Finished";
  if (status === "GROUP_STAGE" || status === "PLAYOFF") return "Active";
  return "Upcoming";
}

export function currentStageLabel(
  status: ChampionshipStatus,
  currentStage: MatchStage | null | undefined,
): string | null {
  if (status === "REGISTRATION" || status === "DRAFT") return null;
  if (currentStage && STAGE_LABEL[currentStage]) return STAGE_LABEL[currentStage];
  if (status === "GROUP_STAGE") return STAGE_LABEL.GROUP_STAGE;
  if (status === "PLAYOFF") return "Playoff";
  if (status === "COMPLETED") return STAGE_LABEL.FINAL;
  return null;
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

export function formatChampDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${AZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatChampWhen(iso: string | null | undefined): string {
  if (!iso) return "Vaxt təyin edilməyib";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Vaxt təyin edilməyib";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()} ${AZ_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatChampTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatCountdown(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return null;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days} gün ${hours} saat`;
  if (hours > 0) return `${hours} saat ${minutes} dəq`;
  return `${minutes} dəq`;
}

export function playerFullName(row: {
  firstName: string;
  lastName: string;
}): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

export type PlayoffPlaceholder = {
  key: string;
  slot: number;
  homeLabel: string;
  awayLabel: string;
};

export function playoffPlaceholders(
  matches: Match[],
): Map<MatchStage, PlayoffPlaceholder[]> {
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

export function venueOf(match: Match): string {
  return match.venue || match.location || "Məkan yoxdur";
}
