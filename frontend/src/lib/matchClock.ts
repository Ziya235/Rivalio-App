export const MATCH_CLOCK_MAX_MINUTES = 120;

function toMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

export type MatchClockFields = {
  status: string;
  minute: number | null;
  startedAt: string | null;
  finishedAt?: string | null;
  reopenedAt?: string | null;
  lockedAt?: string | null;
  clockFrozen?: boolean;
  isLocked?: boolean;
  canEdit?: boolean;
  eventsWritable?: boolean;
  stageLocked?: boolean;
  elapsedSeconds?: number;
  serverNow?: string;
};

export type MatchClockView = {
  minute: number;
  second: number;
  elapsedSeconds: number;
  frozen: boolean;
  locked: boolean;
  canReopen: boolean;
  canEdit: boolean;
  label: string;
};

export function computeMatchClock(
  match: MatchClockFields,
  nowMs = Date.now(),
): MatchClockView {
  const startedMs = toMs(match.startedAt);
  const finishedMs = toMs(match.finishedAt);
  const locked = Boolean(match.lockedAt) || Boolean(match.isLocked);

  let minute = match.minute ?? 0;
  let second = 0;
  let elapsed = 0;

  if (match.status === "LIVE" && startedMs != null) {
    elapsed = Math.max(0, nowMs - startedMs);
    const cappedMs = Math.min(
      elapsed,
      MATCH_CLOCK_MAX_MINUTES * 60 * 1000,
    );
    minute = Math.floor(cappedMs / 60000);
    second = Math.floor((cappedMs % 60000) / 1000);
  } else if (match.status === "FINISHED" && startedMs != null) {
    const endMs = finishedMs ?? nowMs;
    elapsed = Math.max(0, endMs - startedMs);
    minute = Math.min(
      MATCH_CLOCK_MAX_MINUTES,
      Math.max(0, Math.floor(elapsed / 60000)),
    );
  }

  return {
    minute,
    second,
    elapsedSeconds: Math.floor(elapsed / 1000),
    frozen: false,
    locked,
    canReopen: false,
    canEdit: Boolean(match.canEdit),
    label: `${minute}:${String(second).padStart(2, "0")}`,
  };
}

export function serverAlignedNow(serverNow?: string | null, fetchedAt = Date.now()) {
  const serverMs = toMs(serverNow);
  if (serverMs == null) return Date.now();
  return Date.now() + (serverMs - fetchedAt);
}
