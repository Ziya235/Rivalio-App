import { parsePlayoffNotes } from "../../../lib/playoffBracket";
import type { ChampionshipStatus, MatchStage } from "../../../types/championship";
import type { Match, MatchStatus } from "../../../types/match";
import { STAGE_LABEL } from "./constants";
import type { PlayoffPlaceholder } from "./constants";

export function playerDisplayName(row: {
  firstName: string;
  lastName: string;
}): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

export function playoffPlaceholders(matches: Match[]): Map<MatchStage, PlayoffPlaceholder[]> {
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

export function matchStatusClass(status: MatchStatus): string {
  switch (status) {
    case "LIVE":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    case "FINISHED":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    default:
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
  }
}

export const MIN_KICKOFF_MS = 60 * 60 * 1000;

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "Vaxt təyin edilməyib";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Vaxt təyin edilməyib";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatCompactDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function formatCompactWhen(iso: string | null | undefined): string {
  if (!iso) return "Vaxt yoxdur";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Vaxt yoxdur";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${formatCompactDate(iso)} • ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function minKickoffLocal(): string {
  return toDatetimeLocal(new Date(Date.now() + MIN_KICKOFF_MS).toISOString());
}

export function isKickoffTooSoon(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return true;
  return d.getTime() < Date.now() + MIN_KICKOFF_MS;
}

export function isFixtureReady(match: Match): boolean {
  return Boolean(match.scheduledAt && match.venue?.trim());
}

export function canEditSchedule(match: Match): boolean {
  return match.status !== "LIVE" && match.status !== "FINISHED";
}

export function formatDiff(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

export function isSetupStatus(status: ChampionshipStatus): boolean {
  return status === "DRAFT" || status === "REGISTRATION";
}
