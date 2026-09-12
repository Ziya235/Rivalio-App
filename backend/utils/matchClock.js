import { prisma } from "../config/db.js";
import { applyGamesPlayedForMatch } from "./userStats.js";
import {
  MATCH_CLOCK_MAX_MINUTES,
  MATCH_CLOCK_MAX_MS,
  MATCH_ERRORS,
  canEditCompetitionMatch,
  canEditFinishedMatch,
  canMutateMatchEvents,
  championshipWinnerId,
  elapsedMs,
  isLiveMatchExpired,
  isStageLocked,
  matchEditBlockReason,
  toMs,
} from "./matchEditPolicy.js";

export { MATCH_CLOCK_MAX_MINUTES, MATCH_CLOCK_MAX_MS };
export { championshipWinnerId } from "./matchEditPolicy.js";

export class MatchClockError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const TX_OPTIONS = { maxWait: 15000, timeout: 30000 };

export function computeMatchClock(match, now = new Date()) {
  const nowMs = now.getTime();
  const startedMs = toMs(match.startedAt);
  const finishedMs = toMs(match.finishedAt);
  const locked = Boolean(match.lockedAt) || Boolean(match.isLocked);

  let minute = match.minute ?? null;
  let second = 0;
  let elapsed = 0;

  if (match.status === "LIVE" && startedMs != null) {
    elapsed = Math.max(0, nowMs - startedMs);
    const cappedMs = Math.min(elapsed, MATCH_CLOCK_MAX_MS);
    minute = Math.floor(cappedMs / 60000);
    second = Math.floor((cappedMs % 60000) / 1000);
  } else if (match.status === "FINISHED") {
    if (startedMs != null) {
      const endMs = finishedMs ?? nowMs;
      elapsed = Math.max(0, endMs - startedMs);
      minute = Math.min(
        MATCH_CLOCK_MAX_MINUTES,
        Math.max(0, Math.floor(elapsed / 60000)),
      );
    }
    second = 0;
  }

  return {
    minute,
    second,
    elapsedSeconds: Math.floor(elapsed / 1000),
    frozen: false,
    locked,
    canReopen: false,
    canEdit: Boolean(match.canEdit),
  };
}

export function withMatchClock(match, now = new Date()) {
  if (!match) return match;
  const clock = computeMatchClock(match, now);
  return {
    ...match,
    minute: clock.minute,
    clockSecond: clock.second,
    elapsedSeconds: clock.elapsedSeconds,
    clockFrozen: clock.frozen,
    isLocked: clock.locked,
    canReopen: false,
    canEdit: clock.canEdit,
    eventsWritable: Boolean(match.eventsWritable),
    stageLocked: Boolean(match.stageLocked),
    serverNow: now.toISOString(),
  };
}

export function withMatchClockList(matches, now = new Date()) {
  return (matches ?? []).map((m) => withMatchClock(m, now));
}

export function attachMatchPolicy(match, ctx = {}, now = new Date()) {
  if (!match) return match;
  const canEditComp = canEditCompetitionMatch(match, ctx);
  return withMatchClock(
    {
      ...match,
      canEdit: canEditFinishedMatch(match, ctx),
      eventsWritable: canMutateMatchEvents(match, ctx, now),
      stageLocked: Boolean(
        match.championshipId &&
          match.stage &&
          isStageLocked(match.stage, ctx),
      ),
      isLocked: !canEditComp && match.status === "FINISHED",
    },
    now,
  );
}

export function buildStatusUpdate(
  existing,
  nextStatus,
  now = new Date(),
  scores = {},
) {
  const homeScore =
    scores.homeScore != null ? Number(scores.homeScore) : existing.homeScore;
  const awayScore =
    scores.awayScore != null ? Number(scores.awayScore) : existing.awayScore;

  if (nextStatus === "LIVE") {
    if (existing.status === "SCHEDULED") {
      return {
        status: "LIVE",
        startedAt: now,
        finishedAt: null,
        lockedAt: null,
        reopenedAt: null,
        minute: 0,
      };
    }
    throw new MatchClockError("This match cannot be started again.");
  }

  if (nextStatus === "FINISHED") {
    if (existing.status !== "LIVE") {
      throw new MatchClockError(MATCH_ERRORS.MATCH_NOT_LIVE);
    }
    const elapsed = elapsedMs(existing.startedAt, now);
    const minute = Math.min(
      MATCH_CLOCK_MAX_MINUTES,
      Math.max(0, Math.floor(elapsed / 60000)),
    );
    const data = {
      status: "FINISHED",
      finishedAt: now,
      minute,
    };
    const winnerTeamId = championshipWinnerId(existing, homeScore, awayScore);
    if (winnerTeamId !== undefined) data.winnerTeamId = winnerTeamId;
    return data;
  }

  if (nextStatus === "SCHEDULED") {
    throw new MatchClockError("Başlamış oyunu planlaşdırılmışa qaytarmaq olmaz");
  }

  return { status: nextStatus };
}

export function assertMatchEventsWritable(match, ctx = {}, now = new Date()) {
  if (canMutateMatchEvents(match, ctx, now)) return;
  const reason = matchEditBlockReason(match, ctx);
  if (reason) {
    throw new MatchClockError(reason);
  }
  if (match.status !== "LIVE" && match.status !== "FINISHED") {
    throw new MatchClockError(MATCH_ERRORS.MATCH_EVENTS_NOT_WRITABLE);
  }
  throw new MatchClockError(MATCH_ERRORS.MATCH_EVENTS_NOT_WRITABLE);
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
  if (!match || match.status !== "LIVE") {
    return { changed: false, championshipFinished: false };
  }
  if (!isLiveMatchExpired(match, now)) {
    return { changed: false, championshipFinished: false };
  }

  const startedMs = toMs(match.startedAt);
  const finishedAt =
    startedMs != null
      ? new Date(startedMs + MATCH_CLOCK_MAX_MS)
      : now;
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
        finishedAt,
        minute: MATCH_CLOCK_MAX_MINUTES,
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
