import { prisma } from "../config/db.js";
import { getSportByCode } from "../utils/sports.js";
import { MATCH_ERRORS } from "../utils/matchEditPolicy.js";
import { replaceLeagueSchedule } from "../utils/leagueFixtures.js";
import { applyGamesPlayedForMatch } from "../utils/userStats.js";

const parsePositiveInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const leagueDetailInclude = {
  sport: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  _count: {
    select: {
      teams: true,
      members: true,
      matches: true,
    },
  },
};

const assertOwnedLeague = async (req, res, leagueId) => {
  if (!leagueId) {
    res.status(400).json({ success: false, message: "Invalid league id" });
    return null;
  }
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: leagueDetailInclude,
  });
  if (!league) {
    res.status(404).json({ success: false, message: "League not found" });
    return null;
  }
  if (league.createdById !== req.user.id) {
    res.status(403).json({
      success: false,
      message: "You can only manage your own league",
    });
    return null;
  }
  return league;
};

const resolveMatchFormat = (value) => {
  const raw = String(value || "SINGLE").toUpperCase();
  if (raw === "HOME_AWAY") return "HOME_AWAY";
  if (raw === "SINGLE" || raw === "SINGLE_MATCH") return "SINGLE";
  return null;
};

export const createLeague = async (req, res) => {
  try {
    const { name, logo, season, visibility, description, matchFormat } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "League name is required",
      });
    }

    if (visibility && !["PUBLIC", "PRIVATE"].includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: "Visibility must be PUBLIC or PRIVATE",
      });
    }

    const format = resolveMatchFormat(matchFormat || "SINGLE");
    if (!format) {
      return res.status(400).json({
        success: false,
        message: "matchFormat must be SINGLE or HOME_AWAY",
      });
    }

    const footballSport = await getSportByCode("FOOTBALL");

    if (!footballSport) {
      return res.status(404).json({
        success: false,
        message: "Football sport not found",
      });
    }

    if (!footballSport.isEnabled) {
      return res.status(403).json({
        success: false,
        message: "Football is currently disabled",
      });
    }

    const league = await prisma.league.create({
      data: {
        name,
        logo: logo || null,
        season: season || null,
        description: description || null,
        visibility: visibility || "PRIVATE",
        matchFormat: format,
        sportId: footballSport.id,
        createdById: req.user.id,
      },
      include: leagueDetailInclude,
    });

    return res.status(201).json({
      success: true,
      message: "League created successfully",
      data: league,
    });
  } catch (error) {
    console.log("Error in createLeague:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const startLeague = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    const league = await assertOwnedLeague(req, res, leagueId);
    if (!league) return;

    if (league.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message:
          league.status === "ACTIVE"
            ? MATCH_ERRORS.LEAGUE_ALREADY_ACTIVE
            : MATCH_ERRORS.LEAGUE_NOT_DRAFT,
      });
    }

    const format = resolveMatchFormat(
      req.body?.matchFormat || league.matchFormat || "SINGLE",
    );
    if (!format) {
      return res.status(400).json({
        success: false,
        message: "matchFormat must be SINGLE or HOME_AWAY",
      });
    }

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

    const updated = await prisma.$transaction(async (tx) => {
      await tx.league.update({
        where: { id: leagueId },
        data: { status: "ACTIVE", matchFormat: format },
      });
      await replaceLeagueSchedule(tx, {
        leagueId,
        teamIds,
        homeAway: format === "HOME_AWAY",
        createdById: req.user.id,
      });
      return tx.league.findUnique({
        where: { id: leagueId },
        include: leagueDetailInclude,
      });
    });

    return res.status(200).json({
      success: true,
      message: "League started successfully",
      data: updated,
    });
  } catch (error) {
    console.log("Error in startLeague:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const finishLeague = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    const league = await assertOwnedLeague(req, res, leagueId);
    if (!league) return;

    if (league.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message:
          league.status === "FINISHED"
            ? MATCH_ERRORS.LEAGUE_FINISHED_IMMUTABLE
            : MATCH_ERRORS.LEAGUE_NOT_ACTIVE,
      });
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const liveMatches = await tx.match.findMany({
        where: { leagueId, status: "LIVE" },
        select: {
          id: true,
          homeTeamId: true,
          awayTeamId: true,
          statsApplied: true,
        },
      });
      for (const match of liveMatches) {
        await tx.match.update({
          where: { id: match.id },
          data: {
            status: "FINISHED",
            finishedAt: now,
          },
        });
        await applyGamesPlayedForMatch(tx, match);
      }

      return tx.league.update({
        where: { id: leagueId },
        data: { status: "FINISHED" },
        include: leagueDetailInclude,
      });
    });

    return res.status(200).json({
      success: true,
      message: "League finished successfully",
      data: updated,
    });
  } catch (error) {
    console.log("Error in finishLeague:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
