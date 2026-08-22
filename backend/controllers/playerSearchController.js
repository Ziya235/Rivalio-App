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
      scheduledAt,
      venue,
      notes,
      playersNeeded,
    } = req.body;

    const hostId = parsePositiveInt(hostTeamId);
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
    const minWhen = new Date(Date.now() + 60 * 60 * 1000);
    if (when < minWhen) {
      return res.status(400).json({
        success: false,
        message: "Matç ən azı 1 saat sonra yaradıla bilər",
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

    const result = await prisma.playerSearch.create({
      data: {
        hostTeamId: hostId,
        createdById: req.user.id,
        scheduledAt: when,
        venue: venue.trim(),
        notes: notes?.trim() || null,
        playersNeeded: needed,
      },
      include: searchInclude,
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
    const minWhen = new Date(Date.now() + 60 * 60 * 1000);
    if (when < minWhen) {
      return res.status(400).json({
        success: false,
        message: "Matç ən azı 1 saat sonra yaradıla bilər",
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
      where: {
        scheduledAt: { gt: new Date() },
        OR: [
          { status: "OPEN" },
          {
            status: "FULL",
            OR: [
              { createdById: req.user.id },
              { hostTeam: { captainId: req.user.id } },
              {
                requests: {
                  some: {
                    userId: req.user.id,
                    status: "ACCEPTED",
                  },
                },
              },
            ],
          },
        ],
      },
      include: searchInclude,
      orderBy: { scheduledAt: "asc" },
    });

    const searchIds = searches.map((s) => s.id);
    const myRequests =
      searchIds.length === 0
        ? []
        : await prisma.playerSearchRequest.findMany({
            where: {
              userId: req.user.id,
              playerSearchId: { in: searchIds },
            },
            select: { id: true, status: true, playerSearchId: true },
          });
    const myBySearch = new Map(
      myRequests.map((r) => [r.playerSearchId, { id: r.id, status: r.status }]),
    );

    const data = searches.map((s) => ({
      ...s,
      spotsLeft: Math.max(0, s.playersNeeded - s.playersFilled),
      myRequest: myBySearch.get(s.id) ?? null,
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

    const existing = await prisma.playerSearchRequest.findUnique({
      where: {
        playerSearchId_userId: {
          playerSearchId: searchId,
          userId: req.user.id,
        },
      },
    });

    if (existing?.status === "PENDING") {
      return res.status(409).json({
        success: false,
        message: "Sorğu artıq göndərilib və gözləyir",
      });
    }

    if (existing?.status === "ACCEPTED") {
      return res.status(400).json({
        success: false,
        message: "Bu axtarış üçün artıq qəbul olunmusunuz",
      });
    }

    const include = {
      user: { select: userBriefSelect },
      playerSearch: { include: searchInclude },
    };

    const request = existing
      ? await prisma.playerSearchRequest.update({
          where: { id: existing.id },
          data: {
            status: "PENDING",
            message: message?.trim() || null,
            respondedAt: null,
            createdAt: new Date(),
          },
          include,
        })
      : await prisma.playerSearchRequest.create({
          data: {
            playerSearchId: searchId,
            userId: req.user.id,
            message: message?.trim() || null,
          },
          include,
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

export const listMyPlayerSearchNotifications = async (req, res) => {
  try {
    const [incoming, outcomes] = await Promise.all([
      prisma.playerSearchRequest.findMany({
        where: {
          status: "PENDING",
          playerSearch: {
            hostTeam: { captainId: req.user.id },
          },
        },
        include: {
          user: { select: userBriefSelect },
          playerSearch: {
            include: {
              hostTeam: { select: teamSelect },
              opponentTeam: { select: teamSelect },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.playerSearchRequest.findMany({
        where: {
          userId: req.user.id,
          status: { in: ["ACCEPTED", "REJECTED", "CANCELLED"] },
        },
        include: {
          playerSearch: {
            include: {
              hostTeam: { select: teamSelect },
              opponentTeam: { select: teamSelect },
            },
          },
        },
        orderBy: { respondedAt: "desc" },
        take: 50,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: { incoming, outcomes },
    });
  } catch (error) {
    console.log("Error in listMyPlayerSearchNotifications:", error);
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
        playerSearch: {
          include: {
            hostTeam: {
              select: {
                captainId: true,
              },
            },
          },
        },
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

    if (request.playerSearch.hostTeam.captainId !== req.user.id) {
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
