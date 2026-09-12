import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MATCH_CLOCK_MAX_MS,
  MATCH_ERRORS,
  applyGoalAssistDelta,
  canEditCompetitionMatch,
  canEditFinishedMatch,
  canMutateMatchEvents,
  canStartMatch,
  elapsedMs,
  isLeagueAcceptingTeams,
  isLiveMatchExpired,
  isStageLocked,
  matchEditBlockReason,
  nextExistingStage,
  replayGoalAssistStats,
  scoresFromEvents,
} from "../utils/matchEditPolicy.js";

const now = new Date("2026-09-10T20:00:00.000Z");

describe("league team requests", () => {
  it("TEST 1: DRAFT league accepts team requests", () => {
    assert.equal(isLeagueAcceptingTeams("DRAFT"), true);
  });

  it("TEST 2: ACTIVE league rejects team requests", () => {
    assert.equal(isLeagueAcceptingTeams("ACTIVE"), false);
    assert.equal(
      MATCH_ERRORS.LEAGUE_NOT_ACCEPTING_REQUESTS,
      "This league is no longer accepting team requests.",
    );
  });

  it("TEST 3: ACTIVE league rejects team invitations", () => {
    assert.equal(isLeagueAcceptingTeams("ACTIVE"), false);
    assert.equal(
      MATCH_ERRORS.LEAGUE_NOT_ACCEPTING_INVITES,
      "This league is no longer accepting team invitations.",
    );
  });
});

describe("match auto-finish", () => {
  it("TEST 4: live match auto-finishes after 120 minutes", () => {
    const startedAt = new Date(now.getTime() - MATCH_CLOCK_MAX_MS);
    const match = { status: "LIVE", startedAt };
    assert.equal(isLiveMatchExpired(match, now), true);
    assert.equal(
      isLiveMatchExpired(
        { status: "LIVE", startedAt: new Date(now.getTime() - MATCH_CLOCK_MAX_MS + 1000) },
        now,
      ),
      false,
    );
  });

  it("TEST 14: timer elapsed is computed from startedAt after refresh", () => {
    const startedAt = new Date(now.getTime() - 15 * 60 * 1000);
    const elapsed = elapsedMs(startedAt, now);
    assert.equal(Math.floor(elapsed / 60000), 15);
  });
});

describe("league match edit", () => {
  it("TEST 5: finished league match can be edited while league is ACTIVE", () => {
    const match = { status: "FINISHED", leagueId: 1 };
    const ctx = { kind: "league", leagueStatus: "ACTIVE" };
    assert.equal(canEditFinishedMatch(match, ctx), true);
    assert.equal(canMutateMatchEvents(match, ctx, now), true);
  });

  it("TEST 6: finished league cannot edit matches", () => {
    const match = { status: "FINISHED", leagueId: 1 };
    const ctx = { kind: "league", leagueStatus: "FINISHED" };
    assert.equal(canEditFinishedMatch(match, ctx), false);
    assert.equal(
      matchEditBlockReason(match, ctx),
      MATCH_ERRORS.MATCH_NOT_EDITABLE_LEAGUE,
    );
  });
});

const champMatches = (rows) => rows;

describe("championship stage lock", () => {
  it("TEST 7: finished group match is editable before next stage starts", () => {
    const match = { status: "FINISHED", championshipId: 1, stage: "GROUP_STAGE" };
    const ctx = {
      kind: "championship",
      championshipStatus: "PLAYOFF",
      matches: champMatches([
        { stage: "GROUP_STAGE", status: "FINISHED", startedAt: now },
        { stage: "QUARTER_FINAL", status: "SCHEDULED", startedAt: null },
      ]),
    };
    assert.equal(isStageLocked("GROUP_STAGE", ctx), false);
    assert.equal(canEditFinishedMatch(match, ctx), true);
  });

  it("TEST 8: starting a quarter-final locks group matches", () => {
    const match = { status: "FINISHED", championshipId: 1, stage: "GROUP_STAGE" };
    const ctx = {
      kind: "championship",
      championshipStatus: "PLAYOFF",
      matches: champMatches([
        { stage: "GROUP_STAGE", status: "FINISHED", startedAt: now },
        { stage: "QUARTER_FINAL", status: "LIVE", startedAt: now },
      ]),
    };
    assert.equal(isStageLocked("GROUP_STAGE", ctx), true);
    assert.equal(canEditFinishedMatch(match, ctx), false);
    assert.equal(matchEditBlockReason(match, ctx), MATCH_ERRORS.MATCH_STAGE_LOCKED);
  });

  it("TEST 9: finished quarter-final is editable before semi-final starts", () => {
    const match = { status: "FINISHED", championshipId: 1, stage: "QUARTER_FINAL" };
    const ctx = {
      kind: "championship",
      championshipStatus: "PLAYOFF",
      matches: champMatches([
        { stage: "QUARTER_FINAL", status: "FINISHED", startedAt: now },
        { stage: "SEMI_FINAL", status: "SCHEDULED", startedAt: null },
      ]),
    };
    assert.equal(isStageLocked("QUARTER_FINAL", ctx), false);
    assert.equal(canEditFinishedMatch(match, ctx), true);
  });

  it("TEST 10: starting a semi-final locks quarter-finals", () => {
    const match = { status: "FINISHED", championshipId: 1, stage: "QUARTER_FINAL" };
    const ctx = {
      kind: "championship",
      championshipStatus: "PLAYOFF",
      matches: champMatches([
        { stage: "QUARTER_FINAL", status: "FINISHED", startedAt: now },
        { stage: "SEMI_FINAL", status: "LIVE", startedAt: now },
      ]),
    };
    assert.equal(isStageLocked("QUARTER_FINAL", ctx), true);
    assert.equal(canEditFinishedMatch(match, ctx), false);
  });

  it("TEST 11: starting the final locks semi-finals", () => {
    const match = { status: "FINISHED", championshipId: 1, stage: "SEMI_FINAL" };
    const ctx = {
      kind: "championship",
      championshipStatus: "PLAYOFF",
      matches: champMatches([
        { stage: "SEMI_FINAL", status: "FINISHED", startedAt: now },
        { stage: "FINAL", status: "LIVE", startedAt: now },
      ]),
    };
    assert.equal(isStageLocked("SEMI_FINAL", ctx), true);
    assert.equal(canEditFinishedMatch(match, ctx), false);
  });

  it("TEST 12: finished championship locks every match", () => {
    const match = { status: "FINISHED", championshipId: 1, stage: "FINAL" };
    const ctx = {
      kind: "championship",
      championshipStatus: "FINISHED",
      matches: champMatches([
        { stage: "FINAL", status: "FINISHED", startedAt: now },
      ]),
    };
    assert.equal(canEditCompetitionMatch(match, ctx), false);
    assert.equal(
      matchEditBlockReason(match, ctx),
      MATCH_ERRORS.MATCH_CHAMPIONSHIP_FINISHED,
    );
  });

  it("creating the next stage without starting it does not lock the previous stage", () => {
    const ctx = {
      championshipStatus: "PLAYOFF",
      matches: [
        { stage: "GROUP_STAGE", status: "FINISHED", startedAt: now },
        { stage: "QUARTER_FINAL", status: "SCHEDULED", startedAt: null },
      ],
    };
    assert.equal(nextExistingStage("GROUP_STAGE", ctx.matches), "QUARTER_FINAL");
    assert.equal(isStageLocked("GROUP_STAGE", ctx), false);
  });
});

describe("statistics consistency", () => {
  it("TEST 13: event edit does not double-count goals or assists", () => {
    const events = [
      { type: "GOAL", playerId: 1, assistPlayerId: 2, teamId: 10 },
      { type: "GOAL", playerId: 1, assistPlayerId: null, teamId: 10 },
    ];
    const before = replayGoalAssistStats(events);
    assert.equal(before[1].goals, 2);
    assert.equal(before[2].assists, 1);

    const afterDelete = replayGoalAssistStats(events.slice(0, 1));
    assert.equal(afterDelete[1].goals, 1);
    assert.equal(afterDelete[2].assists, 1);

    const replaced = [
      { type: "GOAL", playerId: 3, assistPlayerId: 4, teamId: 10 },
      events[1],
    ];
    const afterReplace = replayGoalAssistStats(replaced);
    assert.equal(afterReplace[1]?.goals ?? 0, 1);
    assert.equal(afterReplace[3].goals, 1);
    assert.equal(afterReplace[2]?.assists ?? 0, 0);
    assert.equal(afterReplace[4].assists, 1);

    const totals = {};
    applyGoalAssistDelta(totals, events[0], "increment");
    applyGoalAssistDelta(totals, events[0], "decrement");
    applyGoalAssistDelta(totals, replaced[0], "increment");
    assert.equal(totals[1].goals, 0);
    assert.equal(totals[3].goals, 1);

    const scores = scoresFromEvents(
      [
        { type: "GOAL", teamId: 10 },
        { type: "GOAL", teamId: 20 },
        { type: "OWN_GOAL", teamId: 10 },
      ],
      10,
      20,
    );
    assert.deepEqual(scores, { homeScore: 1, awayScore: 2 });
  });
});

describe("backend API restrictions", () => {
  it("TEST 15: start/edit rules cannot be bypassed", () => {
    const scheduled = { status: "SCHEDULED", leagueId: 1 };
    const scheduledChamp = {
      status: "SCHEDULED",
      championshipId: 1,
      stage: "GROUP_STAGE",
    };
    assert.equal(canStartMatch(scheduled, { leagueStatus: "DRAFT" }), false);
    assert.equal(canStartMatch(scheduled, { leagueStatus: "ACTIVE" }), true);
    assert.equal(canStartMatch(scheduled, { leagueStatus: "FINISHED" }), false);

    const liveChamp = {
      status: "LIVE",
      championshipId: 1,
      stage: "GROUP_STAGE",
    };
    const lockedCtx = {
      kind: "championship",
      championshipStatus: "PLAYOFF",
      matches: [
        { stage: "GROUP_STAGE", status: "LIVE", startedAt: now },
        { stage: "QUARTER_FINAL", status: "LIVE", startedAt: now },
      ],
    };
    assert.equal(canMutateMatchEvents(liveChamp, lockedCtx, now), false);
    assert.equal(canStartMatch(scheduledChamp, lockedCtx), false);
  });
});
