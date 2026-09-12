import { prisma } from "../config/db.js";
import { canViewLeague } from "../utils/leagueAccess.js";
import {
  applyGoalAssistToUsers,
  applyGamesPlayedForMatch,
  revertMatchUserGoalStats,
} from "../utils/userStats.js";
import { onChampionshipMatchFinished } from "../services/championshipService.js";
import { replaceLeagueSchedule } from "../utils/leagueFixtures.js";
import {
  MATCH_ERRORS,
  canEditCompetitionMatch,
  canStartMatch,
  championshipWinnerId,
  matchEditBlockReason,
  scoresFromEvents,
} from "../utils/matchEditPolicy.js";
import {
  MatchClockError,
  assertEventMinute,
  assertMatchEventsWritable,
  buildStatusUpdate,
  persistIfClockExpired,
} from "../utils/matchClock.js";
import {
  enrichMatches,
  enrichOneMatch,
  loadChampionshipMatchSummaries,
  policyContextFromMatch,
} from "../utils/matchEnrich.js";

const MATCH_STATUSES = [
  "SCHEDULED",
  "LIVE",
  "FINISHED",
  "CANCELLED",
  "POSTPONED",
];
const MATCH_TYPES = ["LEAGUE", "FRIENDLY"];
const EVENT_TYPES = [
  "GOAL",
  "OWN_GOAL",
  "YELLOW_CARD",
  "RED_CARD",
  "SUBSTITUTION",
  "NOTE",
];

const parsePositiveInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const teamSelect = {
  id: true,
  name: true,
  shortName: true,
  logo: true,
};

const playerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  shirtNumber: true,
  photo: true,
  teamId: true,
};

const eventInclude = {
  team: { select: teamSelect },
  player: { select: playerSelect },
  assistPlayer: { select: playerSelect },
  playerIn: { select: playerSelect },
  playerOut: { select: playerSelect },
};

const matchInclude = {
  league: {
    select: {
      id: true,
      name: true,
      logo: true,
      season: true,
      createdById: true,
      status: true,
    },
  },
  championship: {
    select: {
      id: true,
      name: true,
      createdById: true,
      status: true,
    },
  },
  homeTeam: { select: teamSelect },
  awayTeam: { select: teamSelect },
};

const matchDetailInclude = {
  ...matchInclude,
  events: {
    include: eventInclude,
    orderBy: [{ minute: "asc" }, { id: "asc" }],
  },
};

// Every query is a Neon roundtrip (~1s), so the 5s default is not enough here.
const TX_OPTIONS = { maxWait: 15000, timeout: 30000 };

const clockErrorResponse = (res, err) => {
  if (err instanceof MatchClockError) {
    res.status(err.status || 400).json({
      success: false,
      message: err.message,
    });
    return true;
  }
  return false;
};

const reloadMatch = (matchId) =>
  prisma.match.findUnique({
    where: { id: matchId },
    include: matchDetailInclude,
  });

const policyCtxFor = async (match) => {
  if (match?.championshipId) {
    const byChamp = await loadChampionshipMatchSummaries([match.championshipId]);
    return policyContextFromMatch(
      match,
      byChamp.get(match.championshipId) ?? [],
    );
  }
  return policyContextFromMatch(match);
};

const recomputeMatchScore = async (tx, match) => {
  const events = await tx.matchEvent.findMany({
    where: { matchId: match.id },
    select: { type: true, teamId: true },
  });
  const scores = scoresFromEvents(events, match.homeTeamId, match.awayTeamId);
  const data = {
    homeScore: scores.homeScore,
    awayScore: scores.awayScore,
  };
  if (match.championshipId) {
    const current = await tx.match.findUnique({
      where: { id: match.id },
      select: { status: true },
    });
    if (current?.status === "FINISHED") {
      const winner = championshipWinnerId(
        match,
        scores.homeScore,
        scores.awayScore,
      );
      data.winnerTeamId = winner === undefined ? undefined : winner;
    }
  }
  await tx.match.update({
    where: { id: match.id },
    data,
    select: { id: true },
  });
  return scores;
};

const syncMatchClock = async (match) => {
  if (!match) return match;
  const result = await persistIfClockExpired(match);
  if (result.championshipFinished) {
    await onChampionshipMatchFinished(match.id);
  }
  if (result.changed) {
    return reloadMatch(match.id);
  }
  return match;
};

const assertLeagueOwner = async (req, res, leagueId) => {
  if (!leagueId) {
    res.status(400).json({ success: false, message: "Invalid league id" });
    return null;
  }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        name: true,
        createdById: true,
        status: true,
        sport: { select: { code: true } },
      },
    });

  if (!league) {
    res.status(404).json({ success: false, message: "League not found" });
    return null;
  }

  if (league.createdById !== req.user.id) {
    res.status(403).json({
      success: false,
      message: "You can only manage matches in your own league",
    });
    return null;
  }

  return league;
};

const assertMatchOwner = async (req, res, matchId) => {
  if (!matchId) {
    res.status(400).json({ success: false, message: "Invalid match id" });
    return null;
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: matchDetailInclude,
  });

  if (!match) {
    res.status(404).json({ success: false, message: "Match not found" });
    return null;
  }

  if (match.championshipId) {
    if (!match.championship || match.championship.createdById !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "You can only manage matches in your own championship",
      });
      return null;
    }
    return match;
  }

  if (!match.league || match.league.createdById !== req.user.id) {
    res.status(403).json({
      success: false,
      message: "You can only manage matches in your own league",
    });
    return null;
  }

  return match;
};

export const listLeagueMatches = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    if (!leagueId) {
      return res.status(400).json({
        success: false,
        message: "Invalid league id",
      });
    }

    const userId = req.user?.id ?? null;
    const { allowed, league } = await canViewLeague(userId, leagueId);

    if (!league) {
      return res.status(404).json({
        success: false,
        message: "League not found",
      });
    }

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this league",
      });
    }

    const where = { leagueId };

    if (req.query.status) {
      const status = String(req.query.status).toUpperCase();
      if (!MATCH_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `status must be one of: ${MATCH_STATUSES.join(", ")}`,
        });
      }
      where.status = status;
    }

    if (req.query.round != null && req.query.round !== "") {
      const round = Number(req.query.round);
      if (!Number.isInteger(round) || round < 1) {
        return res.status(400).json({
          success: false,
          message: "round must be a positive integer",
        });
      }
      where.round = round;
    }

    const matches = await prisma.match.findMany({
      where,
      include: matchInclude,
      orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
    });

    return res.status(200).json({
      success: true,
      data: await enrichMatches(matches),
    });
  } catch (error) {
    console.log("Error in listLeagueMatches:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listMyMatches = async (req, res) => {
  try {
    const where = {
      league: { createdById: req.user.id },
    };

    if (req.query.leagueId) {
      const leagueId = parsePositiveInt(req.query.leagueId);
      if (!leagueId) {
        return res.status(400).json({
          success: false,
          message: "Invalid league id",
        });
      }
      where.leagueId = leagueId;
    }

    if (req.query.status) {
      const status = String(req.query.status).toUpperCase();
      if (!MATCH_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `status must be one of: ${MATCH_STATUSES.join(", ")}`,
        });
      }
      where.status = status;
    }

    const matches = await prisma.match.findMany({
      where,
      include: matchInclude,
      orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
    });

    return res.status(200).json({
      success: true,
      data: await enrichMatches(matches),
    });
  } catch (error) {
    console.log("Error in listMyMatches:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getMatchById = async (req, res) => {
  try {
    const matchId = parsePositiveInt(req.params.matchId);
    if (!matchId) {
      return res.status(400).json({
        success: false,
        message: "Invalid match id",
      });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: matchDetailInclude,
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    if (match.leagueId) {
      const userId = req.user?.id ?? null;
      const { allowed } = await canViewLeague(userId, match.leagueId);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this match",
        });
      }
    } else if (match.championshipId) {
      if (
        !req.user?.id ||
        match.championship?.createdById !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this match",
        });
      }
    }

    const synced = await syncMatchClock(match);

    return res.status(200).json({
      success: true,
      data: await enrichOneMatch(synced),
    });
  } catch (error) {
    console.log("Error in getMatchById:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const createMatch = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    const league = await assertLeagueOwner(req, res, leagueId);
    if (!league) return;

    if (league.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message: MATCH_ERRORS.LEAGUE_TEAMS_LOCKED,
      });
    }

    const {
      homeTeamId,
      awayTeamId,
      scheduledAt,
      round,
      venue,
      notes,
      matchType = "LEAGUE",
    } = req.body;

    const homeId = parsePositiveInt(homeTeamId);
    const awayId = parsePositiveInt(awayTeamId);

    if (!homeId || !awayId) {
      return res.status(400).json({
        success: false,
        message: "homeTeamId and awayTeamId are required",
      });
    }

    if (homeId === awayId) {
      return res.status(400).json({
        success: false,
        message: "Home and away teams must be different",
      });
    }

    if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) {
      return res.status(400).json({
        success: false,
        message: "Valid scheduledAt is required",
      });
    }

    const type = String(matchType).toUpperCase();
    if (!MATCH_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `matchType must be one of: ${MATCH_TYPES.join(", ")}`,
      });
    }

    let roundValue = null;
    if (round != null && round !== "") {
      roundValue = Number(round);
      if (!Number.isInteger(roundValue) || roundValue < 1) {
        return res.status(400).json({
          success: false,
          message: "round must be a positive integer",
        });
      }
    }

    const teams = await prisma.leagueTeam.findMany({
      where: {
        leagueId,
        teamId: { in: [homeId, awayId] },
      },
      select: { teamId: true },
    });

    if (teams.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Both teams must belong to this league",
      });
    }

    const match = await prisma.match.create({
      data: {
        leagueId,
        homeTeamId: homeId,
        awayTeamId: awayId,
        scheduledAt: new Date(scheduledAt),
        round: roundValue,
        venue: venue?.trim() || null,
        notes: notes?.trim() || null,
        matchType: type,
      },
      include: matchInclude,
    });

    return res.status(201).json({
      success: true,
      message: "Match created successfully",
      data: await enrichOneMatch(match),
    });
  } catch (error) {
    console.log("Error in createMatch:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const generateLeagueMatches = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    const league = await assertLeagueOwner(req, res, leagueId);
    if (!league) return;

    if (league.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message: MATCH_ERRORS.LEAGUE_TEAMS_LOCKED,
      });
    }

    const homeAway =
      req.body?.homeAway === true ||
      req.body?.homeAway === "true" ||
      req.body?.matchFormat === "HOME_AWAY";

    const memberships = await prisma.leagueTeam.findMany({
      where: { leagueId },
      select: { teamId: true },
      orderBy: { teamId: "asc" },
    });
    const teamIds = memberships.map((m) => m.teamId);

    if (teamIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: MATCH_ERRORS.LEAGUE_MIN_TEAMS,
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      await replaceLeagueSchedule(tx, {
        leagueId,
        teamIds,
        homeAway,
        createdById: req.user.id,
      });
      return tx.match.findMany({
        where: { leagueId, matchType: "LEAGUE" },
        include: matchInclude,
        orderBy: [{ round: "asc" }, { id: "asc" }],
      });
    });

    return res.status(201).json({
      success: true,
      message: "Liqa oyunları yaradıldı",
      data: await enrichMatches(created),
    });
  } catch (error) {
    console.log("Error in generateLeagueMatches:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updateMatch = async (req, res) => {
  try {
    const matchId = parsePositiveInt(req.params.matchId);
    const existing = await assertMatchOwner(req, res, matchId);
    if (!existing) return;
    const current = await syncMatchClock(existing);
    const ctx = await policyCtxFor(current);

    const {
      scheduledAt,
      round,
      venue,
      location,
      notes,
      matchType,
      status,
      homeScore,
      awayScore,
    } = req.body;

    if (status !== undefined) {
      const nextStatus = String(status).toUpperCase();
      if (nextStatus === "LIVE") {
        if (!canStartMatch(current, ctx)) {
          const reason =
            matchEditBlockReason(current, ctx) ||
            MATCH_ERRORS.MATCH_NOT_SCHEDULED;
          return res.status(400).json({ success: false, message: reason });
        }
      } else if (nextStatus === "FINISHED") {
        if (current.status !== "LIVE" || !canEditCompetitionMatch(current, ctx)) {
          const reason =
            matchEditBlockReason(current, ctx) || MATCH_ERRORS.MATCH_NOT_LIVE;
          return res.status(400).json({ success: false, message: reason });
        }
      } else if (!canEditCompetitionMatch(current, ctx) && current.status === "FINISHED") {
        const reason =
          matchEditBlockReason(current, ctx) ||
          MATCH_ERRORS.MATCH_EVENTS_NOT_WRITABLE;
        return res.status(400).json({ success: false, message: reason });
      }
    } else if (current.status === "FINISHED" && !canEditCompetitionMatch(current, ctx)) {
      const reason =
        matchEditBlockReason(current, ctx) ||
        MATCH_ERRORS.MATCH_EVENTS_NOT_WRITABLE;
      return res.status(400).json({ success: false, message: reason });
    }

    const data = {};

    if (scheduledAt !== undefined) {
      if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) {
        return res.status(400).json({
          success: false,
          message: "Valid scheduledAt is required",
        });
      }
      data.scheduledAt = new Date(scheduledAt);
    }

    if (round !== undefined) {
      if (round === null || round === "") {
        data.round = null;
      } else {
        const roundValue = Number(round);
        if (!Number.isInteger(roundValue) || roundValue < 1) {
          return res.status(400).json({
            success: false,
            message: "round must be a positive integer",
          });
        }
        data.round = roundValue;
      }
    }

    if (venue !== undefined) data.venue = venue?.trim() || null;
    if (location !== undefined) {
      data.location = location?.trim() || null;
      if (data.venue === undefined) data.venue = data.location;
    }
    if (notes !== undefined) data.notes = notes?.trim() || null;

    if (
      (current.status === "LIVE" || current.status === "FINISHED") &&
      (scheduledAt !== undefined || venue !== undefined)
    ) {
      return res.status(400).json({
        success: false,
        message: "Canlı və bitmiş oyunun vaxtı və məkanı dəyişdirilə bilməz",
      });
    }

    if (matchType !== undefined) {
      const type = String(matchType).toUpperCase();
      if (!MATCH_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `matchType must be one of: ${MATCH_TYPES.join(", ")}`,
        });
      }
      data.matchType = type;
    }

    if (status !== undefined) {
      const nextStatus = String(status).toUpperCase();
      if (!MATCH_STATUSES.includes(nextStatus)) {
        return res.status(400).json({
          success: false,
          message: `status must be one of: ${MATCH_STATUSES.join(", ")}`,
        });
      }

      if (nextStatus === "LIVE" && current.status === "SCHEDULED") {
        const kickoff = data.scheduledAt ?? current.scheduledAt;
        const place =
          data.venue !== undefined ? data.venue : current.venue;
        if (!kickoff || !String(place || "").trim()) {
          return res.status(400).json({
            success: false,
            message: MATCH_ERRORS.MATCH_NEED_KICKOFF,
          });
        }
      }

      try {
        Object.assign(
          data,
          buildStatusUpdate(current, nextStatus, new Date(), {
            homeScore:
              homeScore !== undefined ? Number(homeScore) : current.homeScore,
            awayScore:
              awayScore !== undefined ? Number(awayScore) : current.awayScore,
          }),
        );
      } catch (err) {
        if (clockErrorResponse(res, err)) return;
        throw err;
      }
    }

    if (homeScore !== undefined) {
      const score = Number(homeScore);
      if (!Number.isInteger(score) || score < 0) {
        return res.status(400).json({
          success: false,
          message: "homeScore must be a non-negative integer",
        });
      }
      data.homeScore = score;
    }

    if (awayScore !== undefined) {
      const score = Number(awayScore);
      if (!Number.isInteger(score) || score < 0) {
        return res.status(400).json({
          success: false,
          message: "awayScore must be a non-negative integer",
        });
      }
      data.awayScore = score;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.match.update({
        where: { id: matchId },
        data,
        select: {
          id: true,
          status: true,
          homeTeamId: true,
          awayTeamId: true,
          statsApplied: true,
        },
      });

      if (updated.status === "FINISHED") {
        await applyGamesPlayedForMatch(tx, updated);
      }
    }, TX_OPTIONS);

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: matchDetailInclude,
    });

    if (
      match?.championshipId &&
      match.status === "FINISHED" &&
      current.status !== "FINISHED"
    ) {
      await onChampionshipMatchFinished(match.id);
    }

    return res.status(200).json({
      success: true,
      message: "Match updated successfully",
      data: await enrichOneMatch(match),
    });
  } catch (error) {
    if (clockErrorResponse(res, error)) return;
    console.log("Error in updateMatch:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteMatch = async (req, res) => {
  try {
    const matchId = parsePositiveInt(req.params.matchId);
    const existing = await assertMatchOwner(req, res, matchId);
    if (!existing) return;

    await prisma.$transaction(async (tx) => {
      await revertMatchUserGoalStats(tx, matchId);
      await tx.match.delete({ where: { id: matchId } });
    }, TX_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Match deleted successfully",
    });
  } catch (error) {
    console.log("Error in deleteMatch:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const addMatchEvent = async (req, res) => {
  try {
    const matchId = parsePositiveInt(req.params.matchId);
    const raw = await assertMatchOwner(req, res, matchId);
    if (!raw) return;
    const match = await syncMatchClock(raw);
    const ctx = await policyCtxFor(match);

    try {
      assertMatchEventsWritable(match, ctx);
    } catch (err) {
      if (clockErrorResponse(res, err)) return;
      throw err;
    }

    const {
      type,
      minute,
      teamId,
      playerId,
      assistPlayerId,
      playerInId,
      playerOutId,
      note,
    } = req.body;

    const eventType = String(type || "").toUpperCase();
    if (!EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({
        success: false,
        message: `type must be one of: ${EVENT_TYPES.join(", ")}`,
      });
    }

    let minuteValue;
    try {
      minuteValue = assertEventMinute(minute);
    } catch (err) {
      if (clockErrorResponse(res, err)) return;
      throw err;
    }

    const teamIdValue =
      teamId != null && teamId !== "" ? parsePositiveInt(teamId) : null;

    if (
      ["GOAL", "OWN_GOAL", "YELLOW_CARD", "RED_CARD", "SUBSTITUTION"].includes(
        eventType,
      ) &&
      !teamIdValue
    ) {
      return res.status(400).json({
        success: false,
        message: "teamId is required for this event type",
      });
    }

    if (
      teamIdValue &&
      teamIdValue !== match.homeTeamId &&
      teamIdValue !== match.awayTeamId
    ) {
      return res.status(400).json({
        success: false,
        message: "teamId must be one of the match teams",
      });
    }

    const scorerId = parsePositiveInt(playerId) || null;
    const assistId = parsePositiveInt(assistPlayerId) || null;

    if (
      ["GOAL", "OWN_GOAL", "YELLOW_CARD", "RED_CARD"].includes(eventType) &&
      !scorerId
    ) {
      return res.status(400).json({
        success: false,
        message: "Oyunçu seçilməlidir",
      });
    }

    const eventId = await prisma.$transaction(async (tx) => {
      const event = await tx.matchEvent.create({
        data: {
          matchId,
          type: eventType,
          minute: minuteValue,
          teamId: teamIdValue,
          playerId: scorerId,
          assistPlayerId: assistId,
          playerInId: parsePositiveInt(playerInId) || null,
          playerOutId: parsePositiveInt(playerOutId) || null,
          note: note?.trim() || null,
        },
        select: { id: true },
      });

      if (eventType === "GOAL") {
        await applyGoalAssistToUsers(tx, {
          playerId: scorerId,
          assistPlayerId: assistId,
          direction: "increment",
        });
      }

      await recomputeMatchScore(tx, match);

      return event.id;
    }, TX_OPTIONS);

    const [event, updatedMatch] = await Promise.all([
      prisma.matchEvent.findUnique({
        where: { id: eventId },
        include: eventInclude,
      }),
      prisma.match.findUnique({
        where: { id: matchId },
        include: matchDetailInclude,
      }),
    ]);

    return res.status(201).json({
      success: true,
      message: "Event added successfully",
      data: { event, match: await enrichOneMatch(updatedMatch) },
    });
  } catch (error) {
    console.log("Error in addMatchEvent:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteMatchEvent = async (req, res) => {
  try {
    const matchId = parsePositiveInt(req.params.matchId);
    const eventId = parsePositiveInt(req.params.eventId);
    const raw = await assertMatchOwner(req, res, matchId);
    if (!raw) return;
    const match = await syncMatchClock(raw);
    const ctx = await policyCtxFor(match);

    try {
      assertMatchEventsWritable(match, ctx);
    } catch (err) {
      if (clockErrorResponse(res, err)) return;
      throw err;
    }

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Invalid event id",
      });
    }

    const event = await prisma.matchEvent.findFirst({
      where: { id: eventId, matchId },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    await prisma.$transaction(async (tx) => {
      if (event.type === "GOAL") {
        await applyGoalAssistToUsers(tx, {
          playerId: event.playerId,
          assistPlayerId: event.assistPlayerId,
          direction: "decrement",
        });
      }

      await tx.matchEvent.delete({ where: { id: eventId } });
      await recomputeMatchScore(tx, match);
    }, TX_OPTIONS);

    const updatedMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: matchDetailInclude,
    });

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
      data: await enrichOneMatch(updatedMatch),
    });
  } catch (error) {
    console.log("Error in deleteMatchEvent:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateMatchEvent = async (req, res) => {
  try {
    const matchId = parsePositiveInt(req.params.matchId);
    const eventId = parsePositiveInt(req.params.eventId);
    const raw = await assertMatchOwner(req, res, matchId);
    if (!raw) return;
    const match = await syncMatchClock(raw);
    const ctx = await policyCtxFor(match);

    try {
      assertMatchEventsWritable(match, ctx);
    } catch (err) {
      if (clockErrorResponse(res, err)) return;
      throw err;
    }

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Invalid event id",
      });
    }

    const existing = await prisma.matchEvent.findFirst({
      where: { id: eventId, matchId },
    });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const {
      type,
      minute,
      teamId,
      playerId,
      assistPlayerId,
      playerInId,
      playerOutId,
      note,
    } = req.body;

    const eventType = type ? String(type).toUpperCase() : existing.type;
    if (!EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({
        success: false,
        message: `type must be one of: ${EVENT_TYPES.join(", ")}`,
      });
    }

    let minuteValue = existing.minute;
    if (minute !== undefined) {
      try {
        minuteValue = assertEventMinute(minute);
      } catch (err) {
        if (clockErrorResponse(res, err)) return;
        throw err;
      }
    }

    const teamIdValue =
      teamId !== undefined
        ? teamId != null && teamId !== ""
          ? parsePositiveInt(teamId)
          : null
        : existing.teamId;

    if (
      ["GOAL", "OWN_GOAL", "YELLOW_CARD", "RED_CARD", "SUBSTITUTION"].includes(
        eventType,
      ) &&
      !teamIdValue
    ) {
      return res.status(400).json({
        success: false,
        message: "teamId is required for this event type",
      });
    }

    if (
      teamIdValue &&
      teamIdValue !== match.homeTeamId &&
      teamIdValue !== match.awayTeamId
    ) {
      return res.status(400).json({
        success: false,
        message: "teamId must be one of the match teams",
      });
    }

    const scorerId =
      playerId !== undefined
        ? parsePositiveInt(playerId) || null
        : existing.playerId;
    const assistId =
      assistPlayerId !== undefined
        ? parsePositiveInt(assistPlayerId) || null
        : existing.assistPlayerId;

    if (
      ["GOAL", "OWN_GOAL", "YELLOW_CARD", "RED_CARD"].includes(eventType) &&
      !scorerId
    ) {
      return res.status(400).json({
        success: false,
        message: "Oyunçu seçilməlidir",
      });
    }

    await prisma.$transaction(async (tx) => {
      if (existing.type === "GOAL") {
        await applyGoalAssistToUsers(tx, {
          playerId: existing.playerId,
          assistPlayerId: existing.assistPlayerId,
          direction: "decrement",
        });
      }

      await tx.matchEvent.update({
        where: { id: eventId },
        data: {
          type: eventType,
          minute: minuteValue,
          teamId: teamIdValue,
          playerId: scorerId,
          assistPlayerId: eventType === "GOAL" ? assistId : null,
          playerInId:
            playerInId !== undefined
              ? parsePositiveInt(playerInId) || null
              : existing.playerInId,
          playerOutId:
            playerOutId !== undefined
              ? parsePositiveInt(playerOutId) || null
              : existing.playerOutId,
          note: note !== undefined ? note?.trim() || null : existing.note,
        },
      });

      if (eventType === "GOAL") {
        await applyGoalAssistToUsers(tx, {
          playerId: scorerId,
          assistPlayerId: assistId,
          direction: "increment",
        });
      }

      await recomputeMatchScore(tx, match);
    }, TX_OPTIONS);

    const [event, updatedMatch] = await Promise.all([
      prisma.matchEvent.findUnique({
        where: { id: eventId },
        include: eventInclude,
      }),
      prisma.match.findUnique({
        where: { id: matchId },
        include: matchDetailInclude,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: { event, match: await enrichOneMatch(updatedMatch) },
    });
  } catch (error) {
    console.log("Error in updateMatchEvent:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
