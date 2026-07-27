import { prisma } from "../config/db.js";
import { parsePositiveInt, teamSelect, userBriefSelect } from "../utils/helpers.js";
import { expirePastListings } from "../utils/expireListings.js";

const searchInclude = {
  hostTeam: {
    select: {
      ...teamSelect,
      captain: { select: userBriefSelect },
      players: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          photo: true,
          userId: true,
        },
      },
    },
  },
  opponentTeam: { select: teamSelect },
  createdBy: { select: userBriefSelect },
  requests: {
    where: { status: "PENDING" },
    include: {
      user: { select: userBriefSelect },
    },
  },
  match: {
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      venue: true,
    },
  },
};

export const createPlayerSearch = async (req, res) => {
  try {
    await expirePastListings();

    const {
      hostTeamId,
      opponentTeamId,
      scheduledAt,
      venue,
      notes,
      playersNeeded,
    } = req.body;

    const hostId = parsePositiveInt(hostTeamId);
    const oppId =
      opponentTeamId != null && opponentTeamId !== ""
        ? parsePositiveInt(opponentTeamId)
        : null;
    const needed = Number(playersNeeded);

    if (!hostId) {
      return res.status(400).json({
        success: false,
        message: "hostTeamId is required",
      });
    }

    if (!Number.isInteger(needed) || needed < 1 || needed > 20) {
      return res.status(400).json({
        success: false,
        message: "playersNeeded must be between 1 and 20",
      });
    }

    if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) {
      return res.status(400).json({
        success: false,
        message: "Valid scheduledAt is required",
      });
    }

    if (!venue?.trim()) {
      return res.status(400).json({
        success: false,
        message: "venue is required",
      });
    }

    const when = new Date(scheduledAt);
    if (when <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "scheduledAt must be in the future",
      });
    }

    const host = await prisma.team.findUnique({
      where: { id: hostId },
      select: { id: true, captainId: true },
    });

    if (!host) {
      return res.status(404).json({
        success: false,
        message: "Host team not found",
      });
    }

    if (host.captainId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the team captain can create a player search",
      });
    }

    if (oppId) {
      if (oppId === hostId) {
        return res.status(400).json({
          success: false,
          message: "Opponent must be a different team",
        });
      }
      const opp = await prisma.team.findUnique({
        where: { id: oppId },
        select: { id: true },
      });
      if (!opp) {
        return res.status(404).json({
          success: false,
          message: "Opponent team not found",
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      let matchId = null;

      if (oppId) {
        const match = await tx.match.create({
          data: {
            homeTeamId: hostId,
            awayTeamId: oppId,
            scheduledAt: when,
            venue: venue.trim(),
            notes: notes?.trim() || null,
            matchType: "FRIENDLY",
            createdById: req.user.id,
          },
        });
        matchId = match.id;
      }

      return tx.playerSearch.create({
        data: {
          hostTeamId: hostId,
          createdById: req.user.id,
          opponentTeamId: oppId,
          scheduledAt: when,
          venue: venue.trim(),
          notes: notes?.trim() || null,
          playersNeeded: needed,
          matchId,
        },
        include: searchInclude,
      });
    });

    return res.status(201).json({
      success: true,
      message: "Player search created",
      data: result,
    });
  } catch (error) {
    console.log("Error in createPlayerSearch:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Create a friendly with both teams (no open slots required).
 */
export const createFriendly = async (req, res) => {
  try {
    await expirePastListings();

    const {
      homeTeamId,
      awayTeamId,
      scheduledAt,
      venue,
      notes,
      playersNeeded,
    } = req.body;

    const homeId = parsePositiveInt(homeTeamId);
    const awayId = parsePositiveInt(awayTeamId);
    const needed =
      playersNeeded != null && playersNeeded !== ""
        ? Number(playersNeeded)
        : 0;

    if (!homeId || !awayId) {
      return res.status(400).json({
        success: false,
        message: "homeTeamId and awayTeamId are required",
      });
    }

    if (homeId === awayId) {
      return res.status(400).json({
        success: false,
        message: "Teams must be different",
      });
    }

    if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) {
      return res.status(400).json({
        success: false,
        message: "Valid scheduledAt is required",
      });
    }

    if (!venue?.trim()) {
      return res.status(400).json({
        success: false,
        message: "venue is required",
      });
    }

    const when = new Date(scheduledAt);
    if (when <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "scheduledAt must be in the future",
      });
    }

    const home = await prisma.team.findUnique({
      where: { id: homeId },
      select: { id: true, captainId: true },
    });

    if (!home || home.captainId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the home team captain can create this friendly",
      });
    }

    const away = await prisma.team.findUnique({
      where: { id: awayId },
      select: { id: true },
    });

    if (!away) {
      return res.status(404).json({
        success: false,
        message: "Away team not found",
      });
    }

    if (needed && (!Number.isInteger(needed) || needed < 1 || needed > 20)) {
      return res.status(400).json({
        success: false,
        message: "playersNeeded must be between 1 and 20",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: {
          homeTeamId: homeId,
          awayTeamId: awayId,
          scheduledAt: when,
          venue: venue.trim(),
          notes: notes?.trim() || null,
          matchType: "FRIENDLY",
          createdById: req.user.id,
        },
        include: {
          homeTeam: { select: teamSelect },
          awayTeam: { select: teamSelect },
        },
      });

      let playerSearch = null;
      if (needed > 0) {
        playerSearch = await tx.playerSearch.create({
          data: {
            hostTeamId: homeId,
            createdById: req.user.id,
            opponentTeamId: awayId,
            scheduledAt: when,
            venue: venue.trim(),
            notes: notes?.trim() || null,
            playersNeeded: needed,
            matchId: match.id,
          },
          include: searchInclude,
        });
      }

      return { match, playerSearch };
    });

    return res.status(201).json({
      success: true,
      message: "Friendly created",
      data: result,
    });
  } catch (error) {
    console.log("Error in createFriendly:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listPlayerSearches = async (req, res) => {
  try {
    await expirePastListings();

    const searches = await prisma.playerSearch.findMany({
      where: { status: "OPEN" },
      include: searchInclude,
      orderBy: { scheduledAt: "asc" },
    });

    const data = searches.map((s) => ({
      ...s,
      spotsLeft: Math.max(0, s.playersNeeded - s.playersFilled),
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.log("Error in listPlayerSearches:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const requestJoinPlayerSearch = async (req, res) => {
  try {
    await expirePastListings();

    const searchId = parsePositiveInt(req.params.searchId);
    const { message } = req.body;

    if (!searchId) {
      return res.status(400).json({
        success: false,
        message: "Invalid search id",
      });
    }

    const search = await prisma.playerSearch.findUnique({
      where: { id: searchId },
    });

    if (!search || search.status !== "OPEN") {
      return res.status(404).json({
        success: false,
        message: "Open player search not found",
      });
    }

    if (search.scheduledAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "This listing has expired",
      });
    }

    if (search.playersFilled >= search.playersNeeded) {
      return res.status(400).json({
        success: false,
        message: "No spots left",
      });
    }

    // Already on host team?
    const onTeam = await prisma.player.findFirst({
      where: {
        teamId: search.hostTeamId,
        userId: req.user.id,
      },
    });

    if (onTeam) {
      return res.status(400).json({
        success: false,
        message: "You are already on the host team",
      });
    }

    const request = await prisma.playerSearchRequest.create({
      data: {
        playerSearchId: searchId,
        userId: req.user.id,
        message: message?.trim() || null,
      },
      include: {
        user: { select: userBriefSelect },
        playerSearch: { include: searchInclude },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Request sent to team captain",
      data: request,
    });
  } catch (error) {
    console.log("Error in requestJoinPlayerSearch:", error);
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "You already requested this listing",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const respondPlayerSearchRequest = async (req, res) => {
  try {
    const requestId = parsePositiveInt(req.params.requestId);
    const action = String(req.body.action || "").toLowerCase();

    if (!requestId || !["accept", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Valid requestId and action required",
      });
    }

    const request = await prisma.playerSearchRequest.findUnique({
      where: { id: requestId },
      include: {
        playerSearch: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            image: true,
            username: true,
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (request.playerSearch.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the host captain can respond",
      });
    }

    if (request.status !== "PENDING" || request.playerSearch.status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: "Request or listing is no longer open",
      });
    }

    if (action === "reject") {
      const updated = await prisma.playerSearchRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED", respondedAt: new Date() },
      });
      return res.status(200).json({
        success: true,
        message: "Request rejected",
        data: updated,
      });
    }

    if (
      request.playerSearch.playersFilled >= request.playerSearch.playersNeeded
    ) {
      return res.status(400).json({
        success: false,
        message: "No spots left",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.playerSearchRequest.update({
        where: { id: requestId },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });

      const existingPlayer = await tx.player.findFirst({
        where: {
          teamId: request.playerSearch.hostTeamId,
          userId: request.userId,
        },
      });

      if (!existingPlayer) {
        await tx.player.create({
          data: {
            firstName: request.user.firstName,
            lastName: request.user.lastName,
            photo: request.user.image || null,
            teamId: request.playerSearch.hostTeamId,
            userId: request.userId,
            position: "Guest",
          },
        });
      }

      const filled = request.playerSearch.playersFilled + 1;
      const isFull = filled >= request.playerSearch.playersNeeded;

      const search = await tx.playerSearch.update({
        where: { id: request.playerSearchId },
        data: {
          playersFilled: filled,
          status: isFull ? "FULL" : "OPEN",
        },
        include: searchInclude,
      });

      if (isFull) {
        await tx.playerSearchRequest.updateMany({
          where: {
            playerSearchId: request.playerSearchId,
            status: "PENDING",
          },
          data: { status: "CANCELLED", respondedAt: new Date() },
        });
      }

      return {
        ...search,
        spotsLeft: Math.max(0, search.playersNeeded - search.playersFilled),
      };
    });

    return res.status(200).json({
      success: true,
      message: "Player accepted",
      data: result,
    });
  } catch (error) {
    console.log("Error in respondPlayerSearchRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
