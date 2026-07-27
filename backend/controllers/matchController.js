import { prisma } from "../config/db.js";
import { canViewLeague } from "../utils/leagueAccess.js";
import {
  applyGoalAssistToUsers,
  applyGamesPlayedForMatch,
} from "../utils/userStats.js";

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

  if (!match.league || match.league.createdById !== req.user.id) {
    res.status(403).json({
      success: false,
      message: "You can only manage matches in your own league",
    });
    return null;
  }

  return match;
};

const scoreDeltaForEvent = (type, teamId, homeTeamId, awayTeamId) => {
  if (!teamId || (type !== "GOAL" && type !== "OWN_GOAL")) {
    return { home: 0, away: 0 };
  }

  const isHome = teamId === homeTeamId;
  const isAway = teamId === awayTeamId;
  if (!isHome && !isAway) return { home: 0, away: 0 };

  if (type === "GOAL") {
    return isHome ? { home: 1, away: 0 } : { home: 0, away: 1 };
  }

  // Own goal credits the opposing team
  return isHome ? { home: 0, away: 1 } : { home: 1, away: 0 };
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
      data: matches,
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
      data: matches,
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
    }

    return res.status(200).json({
      success: true,
      data: match,
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
      data: match,
    });
  } catch (error) {
    console.log("Error in createMatch:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateMatch = async (req, res) => {
  try {
    const matchId = parsePositiveInt(req.params.matchId);
    const existing = await assertMatchOwner(req, res, matchId);
    if (!existing) return;

    const {
      scheduledAt,
      round,
      venue,
      notes,
      matchType,
      status,
      homeScore,
      awayScore,
      minute,
    } = req.body;

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
    if (notes !== undefined) data.notes = notes?.trim() || null;

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
      data.status = nextStatus;

      if (nextStatus === "LIVE" && !existing.startedAt) {
        data.startedAt = new Date();
        if (existing.minute == null && minute === undefined) {
          data.minute = 1;
        }
      }

      if (nextStatus === "FINISHED") {
        data.finishedAt = new Date();
        if (existing.minute == null && minute === undefined) {
          data.minute = 90;
        }
      }

      if (nextStatus === "SCHEDULED") {
        data.statsApplied = false;
      }

      if (nextStatus === "SCHEDULED") {
        data.startedAt = null;
        data.finishedAt = null;
        data.minute = null;
        data.homeScore = 0;
        data.awayScore = 0;
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

    if (minute !== undefined) {
      if (minute === null || minute === "") {
        data.minute = null;
      } else {
        const m = Number(minute);
        if (!Number.isInteger(m) || m < 0 || m > 130) {
          return res.status(400).json({
            success: false,
            message: "minute must be between 0 and 130",
          });
        }
        data.minute = m;
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    // Resetting to SCHEDULED clears events that would desync scores
    if (data.status === "SCHEDULED") {
      await prisma.matchEvent.deleteMany({ where: { matchId } });
    }

    const match = await prisma.$transaction(async (tx) => {
      const updated = await tx.match.update({
        where: { id: matchId },
        data,
        include: matchDetailInclude,
      });

      if (data.status === "FINISHED") {
        await applyGamesPlayedForMatch(tx, updated);
      }

      return tx.match.findUnique({
        where: { id: matchId },
        include: matchDetailInclude,
      });
    });

    return res.status(200).json({
      success: true,
      message: "Match updated successfully",
      data: match,
    });
  } catch (error) {
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

    await prisma.match.delete({ where: { id: matchId } });

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
    const match = await assertMatchOwner(req, res, matchId);
    if (!match) return;

    if (match.status === "CANCELLED" || match.status === "POSTPONED") {
      return res.status(400).json({
        success: false,
        message: "Cannot add events to cancelled or postponed matches",
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

    const eventType = String(type || "").toUpperCase();
    if (!EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({
        success: false,
        message: `type must be one of: ${EVENT_TYPES.join(", ")}`,
      });
    }

    const minuteValue = Number(minute);
    if (!Number.isInteger(minuteValue) || minuteValue < 0 || minuteValue > 130) {
      return res.status(400).json({
        success: false,
        message: "minute must be between 0 and 130",
      });
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

    const delta = scoreDeltaForEvent(
      eventType,
      teamIdValue,
      match.homeTeamId,
      match.awayTeamId,
    );

    const scorerId = parsePositiveInt(playerId) || null;
    const assistId = parsePositiveInt(assistPlayerId) || null;

    const result = await prisma.$transaction(async (tx) => {
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
        include: eventInclude,
      });

      if (eventType === "GOAL") {
        await applyGoalAssistToUsers(tx, {
          playerId: scorerId,
          assistPlayerId: assistId,
          direction: "increment",
        });
      }

      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          homeScore: { increment: delta.home },
          awayScore: { increment: delta.away },
          minute: minuteValue,
          ...(match.status === "SCHEDULED"
            ? { status: "LIVE", startedAt: new Date() }
            : {}),
        },
        include: matchDetailInclude,
      });

      return { event, match: updatedMatch };
    });

    return res.status(201).json({
      success: true,
      message: "Event added successfully",
      data: result,
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
    const match = await assertMatchOwner(req, res, matchId);
    if (!match) return;

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

    const delta = scoreDeltaForEvent(
      event.type,
      event.teamId,
      match.homeTeamId,
      match.awayTeamId,
    );

    const updatedMatch = await prisma.$transaction(async (tx) => {
      if (event.type === "GOAL") {
        await applyGoalAssistToUsers(tx, {
          playerId: event.playerId,
          assistPlayerId: event.assistPlayerId,
          direction: "decrement",
        });
      }

      await tx.matchEvent.delete({ where: { id: eventId } });

      return tx.match.update({
        where: { id: matchId },
        data: {
          homeScore: Math.max(0, match.homeScore - delta.home),
          awayScore: Math.max(0, match.awayScore - delta.away),
        },
        include: matchDetailInclude,
      });
    });

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
      data: updatedMatch,
    });
  } catch (error) {
    console.log("Error in deleteMatchEvent:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
