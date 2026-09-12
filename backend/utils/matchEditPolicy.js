export const MATCH_CLOCK_MAX_MINUTES = 120;
export const MATCH_CLOCK_MAX_MS = MATCH_CLOCK_MAX_MINUTES * 60 * 1000;

export const STAGE_LOCK_ORDER = [
  "GROUP_STAGE",
  "PRELIMINARY",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "FINAL",
];

export const MATCH_ERRORS = {
  LEAGUE_NOT_ACCEPTING_REQUESTS:
    "This league is no longer accepting team requests.",
  LEAGUE_NOT_ACCEPTING_INVITES:
    "This league is no longer accepting team invitations.",
  LEAGUE_TEAMS_LOCKED: "Teams cannot be added after the league has started.",
  LEAGUE_TEAMS_LOCKED_REMOVE:
    "Teams cannot be removed after the league has started.",
  LEAGUE_MIN_TEAMS: "At least 2 teams are required to start the league.",
  LEAGUE_NOT_DRAFT: "Only a draft league can be started.",
  LEAGUE_NOT_ACTIVE: "Only an active league can be finished.",
  LEAGUE_FINISHED_IMMUTABLE:
    "This league is finished and can no longer be changed.",
  LEAGUE_ALREADY_ACTIVE: "This league has already started.",
  MATCH_NOT_EDITABLE_LEAGUE:
    "This match can no longer be edited because the league is finished.",
  MATCH_STAGE_LOCKED:
    "This match can no longer be edited because the next championship stage has already started.",
  MATCH_CHAMPIONSHIP_FINISHED:
    "This championship is finished and matches can no longer be edited.",
  MATCH_EVENTS_NOT_WRITABLE:
    "Events can only be added while the match is live or being edited.",
  MATCH_NOT_SCHEDULED: "Only a scheduled match can be started.",
  MATCH_NOT_LIVE: "Only a live match can be finished.",
  MATCH_NEED_KICKOFF:
    "Set the match date, time, and location before starting it.",
  CHAMPIONSHIP_FINISH_NEED_FINAL:
    "Finish the final match before finishing the championship.",
  CHAMPIONSHIP_ALREADY_FINISHED: "This championship is already finished.",
  CHAMPIONSHIP_CANNOT_REOPEN: "A finished championship cannot be reopened.",
  CHAMPIONSHIP_NOT_PLAYOFF:
    "Championship can only be finished after the playoff stage.",
};

export function isChampionshipFinished(status) {
  return status === "COMPLETED" || status === "FINISHED";
}

export function isLeagueAcceptingTeams(status) {
  return status === "DRAFT";
}

export function toMs(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

export function elapsedMs(startedAt, now = new Date()) {
  const startedMs = toMs(startedAt);
  if (startedMs == null) return 0;
  return Math.max(0, now.getTime() - startedMs);
}

export function elapsedSeconds(startedAt, now = new Date()) {
  return Math.floor(elapsedMs(startedAt, now) / 1000);
}

export function isLiveMatchExpired(match, now = new Date()) {
  if (!match || match.status !== "LIVE" || !match.startedAt) return false;
  return elapsedMs(match.startedAt, now) >= MATCH_CLOCK_MAX_MS;
}

export function matchHasStarted(match) {
  if (!match) return false;
  return Boolean(match.startedAt) || match.status === "LIVE";
}

export function existingStages(matches = []) {
  const present = new Set(
    (matches ?? []).map((m) => m.stage).filter(Boolean),
  );
  return STAGE_LOCK_ORDER.filter((stage) => present.has(stage));
}

export function nextExistingStage(stage, matches = []) {
  if (!stage) return null;
  const present = existingStages(matches);
  const presentIdx = present.indexOf(stage);
  if (presentIdx >= 0) {
    return present[presentIdx + 1] ?? null;
  }
  const orderIdx = STAGE_LOCK_ORDER.indexOf(stage);
  if (orderIdx < 0) return null;
  for (const candidate of STAGE_LOCK_ORDER.slice(orderIdx + 1)) {
    if (present.includes(candidate)) return candidate;
  }
  return null;
}

export function isStageLocked(stage, ctx = {}) {
  if (isChampionshipFinished(ctx.championshipStatus)) return true;
  if (!stage) return false;
  const next = nextExistingStage(stage, ctx.matches ?? []);
  if (!next) return isChampionshipFinished(ctx.championshipStatus);
  return (ctx.matches ?? []).some(
    (match) => match.stage === next && matchHasStarted(match),
  );
}

export function canEditCompetitionMatch(match, ctx = {}) {
  if (!match) return false;

  if (match.leagueId || ctx.kind === "league") {
    const status = ctx.leagueStatus;
    if (status === "FINISHED" || status === "CANCELLED") return false;
    return status === "ACTIVE";
  }

  if (match.championshipId || ctx.kind === "championship") {
    if (isChampionshipFinished(ctx.championshipStatus)) return false;
    if (!match.stage) return true;
    return !isStageLocked(match.stage, ctx);
  }

  return false;
}

export function canMutateMatchEvents(match, ctx = {}, now = new Date()) {
  if (!match) return false;
  const effective = { ...match };
  if (isLiveMatchExpired(match, now)) {
    effective.status = "FINISHED";
  }
  if (!canEditCompetitionMatch(effective, ctx)) return false;
  return effective.status === "LIVE" || effective.status === "FINISHED";
}

export function canStartMatch(match, ctx = {}) {
  if (!match || match.status !== "SCHEDULED") return false;
  if (match.leagueId || ctx.kind === "league") {
    return ctx.leagueStatus === "ACTIVE";
  }
  if (match.championshipId || ctx.kind === "championship") {
    if (isChampionshipFinished(ctx.championshipStatus)) return false;
    if (match.stage && isStageLocked(match.stage, ctx)) return false;
    return true;
  }
  return false;
}

export function canFinishLiveMatch(match, ctx = {}) {
  if (!match || match.status !== "LIVE") return false;
  return canEditCompetitionMatch(match, ctx);
}

export function canEditFinishedMatch(match, ctx = {}) {
  if (!match || match.status !== "FINISHED") return false;
  return canEditCompetitionMatch(match, ctx);
}

export function matchEditBlockReason(match, ctx = {}) {
  if (!match) return MATCH_ERRORS.MATCH_EVENTS_NOT_WRITABLE;

  if (match.leagueId || ctx.kind === "league") {
    if (ctx.leagueStatus === "FINISHED" || ctx.leagueStatus === "CANCELLED") {
      return MATCH_ERRORS.MATCH_NOT_EDITABLE_LEAGUE;
    }
    if (ctx.leagueStatus !== "ACTIVE") {
      return MATCH_ERRORS.LEAGUE_FINISHED_IMMUTABLE;
    }
    return null;
  }

  if (match.championshipId || ctx.kind === "championship") {
    if (isChampionshipFinished(ctx.championshipStatus)) {
      return MATCH_ERRORS.MATCH_CHAMPIONSHIP_FINISHED;
    }
    if (match.stage && isStageLocked(match.stage, ctx)) {
      return MATCH_ERRORS.MATCH_STAGE_LOCKED;
    }
    return null;
  }

  return MATCH_ERRORS.MATCH_EVENTS_NOT_WRITABLE;
}

export function scoreDeltaForEvent(type, teamId, homeTeamId, awayTeamId) {
  if (!teamId || (type !== "GOAL" && type !== "OWN_GOAL")) {
    return { home: 0, away: 0 };
  }

  const isHome = teamId === homeTeamId;
  const isAway = teamId === awayTeamId;
  if (!isHome && !isAway) return { home: 0, away: 0 };

  if (type === "GOAL") {
    return isHome ? { home: 1, away: 0 } : { home: 0, away: 1 };
  }

  return isHome ? { home: 0, away: 1 } : { home: 1, away: 0 };
}

export function scoresFromEvents(events, homeTeamId, awayTeamId) {
  let home = 0;
  let away = 0;
  for (const event of events ?? []) {
    const delta = scoreDeltaForEvent(
      event.type,
      event.teamId,
      homeTeamId,
      awayTeamId,
    );
    home += delta.home;
    away += delta.away;
  }
  return { homeScore: home, awayScore: away };
}

export function applyGoalAssistDelta(totals, event, direction = "increment") {
  if (!event || event.type !== "GOAL") return totals;
  const mul = direction === "decrement" ? -1 : 1;
  const bump = (playerId, field) => {
    if (!playerId) return;
    if (!totals[playerId]) totals[playerId] = { goals: 0, assists: 0 };
    totals[playerId][field] += mul;
  };
  bump(event.playerId, "goals");
  bump(event.assistPlayerId, "assists");
  return totals;
}

export function replayGoalAssistStats(events = []) {
  const totals = {};
  for (const event of events) {
    applyGoalAssistDelta(totals, event, "increment");
  }
  return totals;
}

export function championshipWinnerId(match, homeScore, awayScore) {
  if (!match?.championshipId) return undefined;
  if (homeScore > awayScore) return match.homeTeamId;
  if (awayScore > homeScore) return match.awayTeamId;
  return null;
}
