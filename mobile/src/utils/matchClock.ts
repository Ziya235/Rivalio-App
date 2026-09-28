import type { Match } from "../types/match";

// Mirrors backend/utils/matchClock.js: the clock is derived from startedAt, the
// backend auto-finishes a LIVE match after 120 minutes.
export const MATCH_CLOCK_MAX_MINUTES = 120;
export const EVENT_MINUTE_MIN = 1;
export const EVENT_MINUTE_MAX = 180;

export type MatchClock = { minute: number; second: number; elapsedSeconds: number; label: string };

function toMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

export function computeMatchClock(match: Match, nowMs: number): MatchClock {
  const startedMs = toMs(match.startedAt);
  let minute = match.minute ?? 0;
  let second = 0;
  let elapsed = 0;
  if (match.status === "LIVE" && startedMs != null) {
    elapsed = Math.max(0, nowMs - startedMs);
    const capped = Math.min(elapsed, MATCH_CLOCK_MAX_MINUTES * 60_000);
    minute = Math.floor(capped / 60_000);
    second = Math.floor((capped % 60_000) / 1000);
  } else if (match.status === "FINISHED" && startedMs != null) {
    const endMs = toMs(match.finishedAt) ?? nowMs;
    elapsed = Math.max(0, endMs - startedMs);
    minute = Math.min(MATCH_CLOCK_MAX_MINUTES, Math.floor(elapsed / 60_000));
  }
  return {
    minute,
    second,
    elapsedSeconds: Math.floor(elapsed / 1000),
    label: `${minute}:${String(second).padStart(2, "0")}`,
  };
}

/** Difference between server and device clocks, from the `serverNow` field. */
export function serverOffset(match: Match | undefined, fetchedAt: number): number {
  const serverMs = toMs(match?.serverNow);
  return serverMs == null ? 0 : serverMs - fetchedAt;
}

/** The web rounds minute+seconds to suggest the event minute (clamped 1–180). */
export function suggestedEventMinute(clock: MatchClock | null): number {
  if (!clock) return EVENT_MINUTE_MIN;
  const rounded = Math.round(clock.minute + clock.second / 60);
  return Math.min(EVENT_MINUTE_MAX, Math.max(EVENT_MINUTE_MIN, rounded));
}

export function isFixtureReady(match: Match): boolean {
  return Boolean(match.scheduledAt && match.venue?.trim());
}

export function canEditSchedule(match: Match): boolean {
  return match.status !== "LIVE" && match.status !== "FINISHED";
}

export function venueOf(match: Match): string {
  return match.venue || match.location || "Məkan yoxdur";
}

export const MIN_LEAD_MS = 60 * 60 * 1000;
export const TOO_SOON_MSG = "Matç ən azı 1 saat sonra üçün yaradıla bilər";

export function isTooSoon(date: Date): boolean {
  return date.getTime() < Date.now() + MIN_LEAD_MS - 1000;
}

export function defaultKickoff(): Date {
  const d = new Date(Date.now() + MIN_LEAD_MS + 5 * 60_000);
  d.setSeconds(0, 0);
  return d;
}
