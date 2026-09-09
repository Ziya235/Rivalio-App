export const MATCH_CLOCK_MAX_MINUTES = 180;
export const MATCH_EDIT_WINDOW_MS = 6 * 60 * 60 * 1000;

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
  editUntil?: string | null;
  clockFrozen?: boolean;
  isLocked?: boolean;
  canReopen?: boolean;
  serverNow?: string;
};

export type MatchClockView = {
  minute: number;
  second: number;
  frozen: boolean;
  locked: boolean;
  canReopen: boolean;
  label: string;
};

function resolveEditUntilMs(match: MatchClockFields): number | null {
  const stored = toMs(match.editUntil);
  if (stored != null) return stored;
  if (match.status === "FINISHED" && match.finishedAt) {
    return (toMs(match.finishedAt) ?? 0) + MATCH_EDIT_WINDOW_MS;
  }
  if (match.startedAt) {
    return (toMs(match.startedAt) ?? 0) + MATCH_EDIT_WINDOW_MS;
  }
  return null;
}

export function computeMatchClock(
  match: MatchClockFields,
  nowMs = Date.now(),
): MatchClockView {
  const startedMs = toMs(match.startedAt);
  const finishedMs = toMs(match.finishedAt);
  const lockedMs = toMs(match.lockedAt);
  const reopenedMs = toMs(match.reopenedAt);
  const editUntilMs = resolveEditUntilMs(match);
  const deadlinePassed = editUntilMs != null && nowMs >= editUntilMs;
  const locked = Boolean(lockedMs) || Boolean(match.isLocked) || deadlinePassed;
  const frozen =
    match.status === "LIVE" &&
    (Boolean(reopenedMs) || match.clockFrozen === true);

  const canReopen =
    match.status === "FINISHED" &&
    !lockedMs &&
    !reopenedMs &&
    !deadlinePassed &&
    editUntilMs != null &&
    nowMs < editUntilMs;

  let minute = match.minute ?? 0;
  let second = 0;

  if (match.status === "LIVE") {
    if (frozen) {
      minute = MATCH_CLOCK_MAX_MINUTES;
      second = 0;
    } else if (startedMs != null) {
      const elapsedMs = Math.max(0, nowMs - startedMs);
      const cappedMs = Math.min(
        elapsedMs,
        MATCH_CLOCK_MAX_MINUTES * 60 * 1000,
      );
      minute = Math.floor(cappedMs / 60000);
      second = Math.floor((cappedMs % 60000) / 1000);
    } else {
      minute = 0;
      second = 0;
    }
  } else if (match.status === "FINISHED" && minute == null && startedMs != null) {
    const endMs = finishedMs ?? nowMs;
    minute = Math.min(
      MATCH_CLOCK_MAX_MINUTES,
      Math.max(0, Math.floor((endMs - startedMs) / 60000)),
    );
  }

  return {
    minute,
    second,
    frozen,
    locked,
    canReopen,
    label: `${minute}:${String(second).padStart(2, "0")}`,
  };
}

export function serverAlignedNow(serverNow?: string | null, fetchedAt = Date.now()) {
  const serverMs = toMs(serverNow);
  if (serverMs == null) return Date.now();
  return Date.now() + (serverMs - fetchedAt);
}
