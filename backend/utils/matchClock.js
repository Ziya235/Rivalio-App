import { prisma } from "../config/db.js";
import { applyGamesPlayedForMatch } from "./userStats.js";

export const MATCH_CLOCK_MAX_MINUTES = 180;
export const MATCH_EDIT_WINDOW_MS = 6 * 60 * 60 * 1000;

export class MatchClockError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const TX_OPTIONS = { maxWait: 15000, timeout: 30000 };

function toMs(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

export function resolveEditUntilMs(match) {
  const stored = toMs(match.editUntil);
  if (stored != null) return stored;
  if (match.status === "FINISHED" && match.finishedAt) {
    return toMs(match.finishedAt) + MATCH_EDIT_WINDOW_MS;
  }
  if (match.startedAt) {
    return toMs(match.startedAt) + MATCH_EDIT_WINDOW_MS;
  }
  return null;
}

export function computeMatchClock(match, now = new Date()) {
  const nowMs = now.getTime();
  const startedMs = toMs(match.startedAt);
  const finishedMs = toMs(match.finishedAt);
  const lockedMs = toMs(match.lockedAt);
  const reopenedMs = toMs(match.reopenedAt);
  const editUntilMs = resolveEditUntilMs(match);
  const deadlinePassed = editUntilMs != null && nowMs >= editUntilMs;

  const locked = Boolean(lockedMs) || deadlinePassed;
  const frozen =
    match.status === "LIVE" && (Boolean(reopenedMs) || match.clockFrozen === true);

  const canReopen =
    match.status === "FINISHED" &&
    !lockedMs &&
    !reopenedMs &&
    !deadlinePassed &&
    editUntilMs != null &&
    nowMs < editUntilMs;

  let minute = match.minute ?? null;
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
  } else if (match.status === "FINISHED") {
    if (minute == null && startedMs != null) {
      const endMs = finishedMs ?? nowMs;
      minute = Math.min(
        MATCH_CLOCK_MAX_MINUTES,
        Math.max(0, Math.floor((endMs - startedMs) / 60000)),
      );
    }
    second = 0;
  }

  return {
    minute,
    second,
    frozen,
    locked,
    canReopen,
    editUntilMs,
  };
}

export function withMatchClock(match, now = new Date()) {
  if (!match) return match;
  const clock = computeMatchClock(match, now);
  return {
    ...match,
    minute: clock.minute,
    clockSecond: clock.second,
    clockFrozen: clock.frozen,
    isLocked: clock.locked,
    canReopen: clock.canReopen,
    serverNow: now.toISOString(),
  };
}

export function withMatchClockList(matches, now = new Date()) {
  return (matches ?? []).map((m) => withMatchClock(m, now));
}

export function championshipWinnerId(match, homeScore, awayScore) {
  if (!match.championshipId) return undefined;
  if (homeScore > awayScore) return match.homeTeamId;
  if (awayScore > homeScore) return match.awayTeamId;
  return null;
}

export function buildStatusUpdate(
  existing,
  nextStatus,
  now = new Date(),
  scores = {},
) {
  const clock = computeMatchClock(existing, now);
  const homeScore =
    scores.homeScore != null ? Number(scores.homeScore) : existing.homeScore;
  const awayScore =
    scores.awayScore != null ? Number(scores.awayScore) : existing.awayScore;

  if (clock.locked && nextStatus !== existing.status) {
    throw new MatchClockError(
      "Oyun kilidlənib. Daha dəyişiklik etmək olmaz.",
    );
  }

  if (nextStatus === "LIVE") {
    if (existing.status === "SCHEDULED") {
      return {
        status: "LIVE",
        startedAt: now,
        finishedAt: null,
        lockedAt: null,
        reopenedAt: null,
        editUntil: new Date(now.getTime() + MATCH_EDIT_WINDOW_MS),
        minute: 0,
      };
    }

    if (existing.status === "FINISHED") {
      if (!clock.canReopen) {
        throw new MatchClockError(
          "Oyunu yalnız bitirdikdən sonra 6 saat ərzində 1 dəfə yenidən başlatmaq olar.",
        );
      }
      return {
        status: "LIVE",
        reopenedAt: now,
        finishedAt: null,
        minute: MATCH_CLOCK_MAX_MINUTES,
      };
    }

    throw new MatchClockError("Oyun artıq canlıdır");
  }

  if (nextStatus === "FINISHED") {
    if (existing.status !== "LIVE") {
      throw new MatchClockError("Yalnız canlı oyunu bitirmək olar");
    }
    const data = {
      status: "FINISHED",
      finishedAt: now,
      minute: clock.minute ?? MATCH_CLOCK_MAX_MINUTES,
    };
    if (existing.reopenedAt) {
      data.lockedAt = now;
    } else {
      data.editUntil = new Date(now.getTime() + MATCH_EDIT_WINDOW_MS);
    }
    const winnerTeamId = championshipWinnerId(existing, homeScore, awayScore);
    if (winnerTeamId !== undefined) data.winnerTeamId = winnerTeamId;
    return data;
  }

  if (nextStatus === "SCHEDULED") {
    throw new MatchClockError("Başlamış oyunu planlaşdırılmışa qaytarmaq olmaz");
  }

  return { status: nextStatus };
}

export function assertMatchEventsWritable(match, now = new Date()) {
  const clock = computeMatchClock(match, now);
  if (clock.locked || match.lockedAt) {
    throw new MatchClockError(
      "Oyun kilidlənib. Hadisə əlavə etmək və ya silmək olmaz.",
    );
  }
  if (match.status !== "LIVE") {
    throw new MatchClockError("Əvvəlcə oyun başladılmalıdır");
  }
}

export function assertEventMinute(minute) {
  const minuteValue = Number(minute);
  if (
    !Number.isInteger(minuteValue) ||
    minuteValue < 0 ||
    minuteValue > MATCH_CLOCK_MAX_MINUTES
  ) {
    throw new MatchClockError(
      `Dəqiqə 0–${MATCH_CLOCK_MAX_MINUTES} arası olmalıdır`,
    );
  }
  return minuteValue;
}

export async function persistIfClockExpired(match, now = new Date()) {
  if (!match || match.lockedAt) {
    return { changed: false, championshipFinished: false };
  }

  const clock = computeMatchClock(match, now);
  if (!clock.locked) {
    return { changed: false, championshipFinished: false };
  }

  if (match.status === "LIVE") {
    const winnerTeamId = championshipWinnerId(
      match,
      match.homeScore,
      match.awayScore,
    );
    await prisma.$transaction(async (tx) => {
      const updated = await tx.match.update({
        where: { id: match.id },
        data: {
          status: "FINISHED",
          finishedAt: now,
          lockedAt: now,
          minute: clock.minute ?? MATCH_CLOCK_MAX_MINUTES,
          ...(winnerTeamId !== undefined ? { winnerTeamId } : {}),
        },
        select: {
          id: true,
          status: true,
          homeTeamId: true,
          awayTeamId: true,
          statsApplied: true,
        },
      });
      await applyGamesPlayedForMatch(tx, updated);
    }, TX_OPTIONS);

    return {
      changed: true,
      championshipFinished: Boolean(match.championshipId),
    };
  }

  if (match.status === "FINISHED") {
    await prisma.match.update({
      where: { id: match.id },
      data: { lockedAt: now },
    });
    return { changed: true, championshipFinished: false };
  }

  return { changed: false, championshipFinished: false };
}
