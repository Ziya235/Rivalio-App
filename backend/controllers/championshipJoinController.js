import { prisma } from "../config/db.js";
import { parsePositiveInt, teamSelect, userBriefSelect } from "../utils/helpers.js";
import { GROUP_CHAMP_TEAM_MAX } from "../utils/championshipGroups.js";
import {
  MATCH_ERRORS,
  isChampionshipAcceptingTeams,
} from "../utils/matchEditPolicy.js";
import { createNotification } from "../services/notificationService.js";

async function notifyChampionshipJoinRequest(userId, actorId, requestId) {
  if (!userId || userId === actorId) return;
  try {
    await createNotification({
      userId,
      actorId,
      type: "CHAMPIONSHIP_JOIN_REQUEST",
      entityId: requestId,
    });
  } catch (error) {
    console.log("Error notifying championship join request:", error);
  }
}

async function markNotificationsRead(userId, type, entityId) {
  await prisma.notification.updateMany({
    where: {
      userId,
      type,
      entityId: String(entityId),
    },
    data: { isRead: true },
  });
}

const joinInclude = {
  championship: {
    select: {
      id: true,
      name: true,
      logo: true,
      visibility: true,
      status: true,
      createdById: true,
    },
  },
  team: {
    select: {
      ...teamSelect,
      captain: { select: userBriefSelect },
    },
  },
  requestedBy: { select: userBriefSelect },
};

function championshipTeamLimit(c) {
  if (c.format === "PLAYOFF_ONLY" && c.maxTeams != null) return c.maxTeams;
  return GROUP_CHAMP_TEAM_MAX;
}

async function occupiedChampionshipSlots(championshipId) {
  const [teams, pendingInvites, pendingJoins] = await Promise.all([
    prisma.championshipTeam.count({ where: { championshipId } }),
    prisma.championshipTeamInvite.count({
      where: { championshipId, status: "PENDING" },
    }),
    prisma.championshipJoinRequest.count({
      where: { championshipId, status: "PENDING" },
    }),
  ]);
  return teams + pendingInvites + pendingJoins;
}

export const requestJoinChampionship = async (req, res) => {
  try {
    const championshipId = parsePositiveInt(req.params.championshipId);
    const teamId = parsePositiveInt(req.body.teamId);
    const { message } = req.body;

    if (!championshipId || !teamId) {
      return res.status(400).json({
        success: false,
        message: "championshipId and teamId are required",
      });
    }

    const championship = await prisma.championship.findUnique({
      where: { id: championshipId },
      select: {
        id: true,
        createdById: true,
        status: true,
        format: true,
        maxTeams: true,
      },
    });

    if (!championship) {
      return res.status(404).json({
        success: false,
        message: "Championship not found",
      });
    }

    if (!isChampionshipAcceptingTeams(championship.status)) {
      return res.status(400).json({
        success: false,
        message: MATCH_ERRORS.CHAMPIONSHIP_NOT_ACCEPTING_REQUESTS,
      });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, captainId: true },
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (team.captainId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the team captain can request to join",
      });
    }

    const alreadyIn = await prisma.championshipTeam.findFirst({
      where: {
        championshipId,
        team: { captainId: req.user.id },
      },
      select: { teamId: true },
    });

    if (alreadyIn) {
      return res.status(409).json({
        success: false,
        message: "Bu çempionatda artıq komandanız var",
      });
    }

    const pending = await prisma.championshipJoinRequest.findFirst({
      where: {
        championshipId,
        status: "PENDING",
        team: { captainId: req.user.id },
      },
      select: { id: true },
    });

    if (pending) {
      return res.status(409).json({
        success: false,
        message: "Bu çempionata artıq gözləyən sorğunuz var",
      });
    }

    const pendingInvite = await prisma.championshipTeamInvite.findFirst({
      where: { championshipId, teamId, status: "PENDING" },
    });
    if (pendingInvite) {
      return res.status(409).json({
        success: false,
        message: "Bu komandaya artıq dəvət göndərilib",
      });
    }

    const limit = championshipTeamLimit(championship);
    if ((await occupiedChampionshipSlots(championshipId)) >= limit) {
      return res.status(400).json({
        success: false,
        message:
          championship.format === "PLAYOFF_ONLY" && championship.maxTeams != null
            ? `Championship is limited to ${championship.maxTeams} teams`
            : `Maksimum ${GROUP_CHAMP_TEAM_MAX} komanda ola bilər`,
      });
    }

    const request = await prisma.championshipJoinRequest.create({
      data: {
        championshipId,
        teamId,
        requestedById: req.user.id,
        message: message?.trim() || null,
      },
      include: joinInclude,
    });

    await notifyChampionshipJoinRequest(
      championship.createdById,
      req.user.id,
      request.id,
    );

    return res.status(201).json({
      success: true,
      message: "Join request sent to championship admin",
      data: request,
    });
  } catch (error) {
    console.log("Error in requestJoinChampionship:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const cancelChampionshipJoinRequest = async (req, res) => {
  try {
    const requestId = parsePositiveInt(req.params.requestId);
    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "Invalid request id",
      });
    }

    const request = await prisma.championshipJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (request.requestedById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the requester can cancel this request",
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Request is no longer pending",
      });
    }

    const updated = await prisma.championshipJoinRequest.update({
      where: { id: requestId },
      data: {
        status: "CANCELLED",
        respondedAt: new Date(),
      },
      include: joinInclude,
    });

    return res.status(200).json({
      success: true,
      message: "Join request cancelled",
      data: updated,
    });
  } catch (error) {
    console.log("Error in cancelChampionshipJoinRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listChampionshipJoinRequests = async (req, res) => {
  try {
    const championshipId = parsePositiveInt(req.params.championshipId);
    if (!championshipId) {
      return res.status(400).json({
        success: false,
        message: "Invalid championship id",
      });
    }

    const championship = await prisma.championship.findUnique({
      where: { id: championshipId },
      select: { createdById: true },
    });

    if (!championship) {
      return res.status(404).json({
        success: false,
        message: "Championship not found",
      });
    }

    if (championship.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    const requests = await prisma.championshipJoinRequest.findMany({
      where: { championshipId },
      include: joinInclude,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.log("Error in listChampionshipJoinRequests:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const respondChampionshipJoinRequest = async (req, res) => {
  try {
    const requestId = parsePositiveInt(req.params.requestId);
    const action = String(req.body.action || "").toLowerCase();

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "Invalid request id",
      });
    }

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "action must be accept or reject",
      });
    }

    const request = await prisma.championshipJoinRequest.findUnique({
      where: { id: requestId },
      include: {
        championship: {
          select: {
            createdById: true,
            status: true,
            format: true,
            maxTeams: true,
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

    if (request.championship.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the championship admin can respond",
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Request is no longer pending",
      });
    }

    if (
      action === "accept" &&
      !isChampionshipAcceptingTeams(request.championship.status)
    ) {
      return res.status(400).json({
        success: false,
        message: MATCH_ERRORS.CHAMPIONSHIP_NOT_ACCEPTING_REQUESTS,
      });
    }

    if (action === "reject") {
      const updated = await prisma.championshipJoinRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          respondedAt: new Date(),
        },
        include: joinInclude,
      });
      await markNotificationsRead(
        req.user.id,
        "CHAMPIONSHIP_JOIN_REQUEST",
        requestId,
      );
      await notifyChampionshipJoinRequest(
        request.requestedById,
        req.user.id,
        request.id,
      );
      return res.status(200).json({
        success: true,
        message: "Join request rejected",
        data: updated,
      });
    }

    const teamCount = await prisma.championshipTeam.count({
      where: { championshipId: request.championshipId },
    });
    const limit = championshipTeamLimit(request.championship);
    if (teamCount >= limit) {
      return res.status(400).json({
        success: false,
        message:
          request.championship.format === "PLAYOFF_ONLY" &&
          request.championship.maxTeams != null
            ? `Championship is limited to ${request.championship.maxTeams} teams`
            : `Maksimum ${GROUP_CHAMP_TEAM_MAX} komanda ola bilər`,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.championshipTeam.upsert({
        where: {
          championshipId_teamId: {
            championshipId: request.championshipId,
            teamId: request.teamId,
          },
        },
        create: {
          championshipId: request.championshipId,
          teamId: request.teamId,
        },
        update: {},
      });

      await tx.championshipTeamInvite.updateMany({
        where: {
          championshipId: request.championshipId,
          teamId: request.teamId,
          status: "PENDING",
        },
        data: { status: "CANCELLED", respondedAt: new Date() },
      });

      return tx.championshipJoinRequest.update({
        where: { id: requestId },
        data: {
          status: "ACCEPTED",
          respondedAt: new Date(),
        },
        include: joinInclude,
      });
    });

    await markNotificationsRead(
      req.user.id,
      "CHAMPIONSHIP_JOIN_REQUEST",
      requestId,
    );
    await notifyChampionshipJoinRequest(
      request.requestedById,
      req.user.id,
      request.id,
    );

    return res.status(200).json({
      success: true,
      message: "Team added to championship",
      data: updated,
    });
  } catch (error) {
    console.log("Error in respondChampionshipJoinRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
