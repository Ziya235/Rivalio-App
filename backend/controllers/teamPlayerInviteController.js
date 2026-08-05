import { prisma } from "../config/db.js";
import {
  parsePositiveInt,
  teamSelect,
  userBriefSelect,
} from "../utils/helpers.js";

const inviteInclude = {
  team: { select: teamSelect },
  invitedUser: { select: userBriefSelect },
  invitedBy: { select: userBriefSelect },
};

export const invitePlayerToTeam = async (req, res) => {
  try {
    const teamId = parsePositiveInt(req.params.teamId);
    const { username, position, shirtNumber, message } = req.body;

    if (!teamId || !username?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Valid teamId and username are required",
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
        message: "Only the team captain can invite players",
      });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const [existingPlayer, pendingInvite] = await Promise.all([
      prisma.player.findFirst({
        where: { teamId, userId: user.id },
        select: { id: true },
      }),
      prisma.teamPlayerInvite.findFirst({
        where: {
          teamId,
          invitedUserId: user.id,
          status: "PENDING",
        },
        select: { id: true },
      }),
    ]);

    if (existingPlayer) {
      return res.status(409).json({
        success: false,
        message: "User is already on this team",
      });
    }

    if (pendingInvite) {
      return res.status(409).json({
        success: false,
        message: "A pending invitation already exists for this user",
      });
    }

    const parsedShirtNumber =
      shirtNumber != null && shirtNumber !== "" ? Number(shirtNumber) : null;
    if (
      parsedShirtNumber != null &&
      (!Number.isInteger(parsedShirtNumber) || parsedShirtNumber < 1)
    ) {
      return res.status(400).json({
        success: false,
        message: "shirtNumber must be a positive integer",
      });
    }

    const invite = await prisma.teamPlayerInvite.create({
      data: {
        teamId,
        invitedUserId: user.id,
        invitedById: req.user.id,
        position: position?.trim() || null,
        shirtNumber: parsedShirtNumber,
        message: message?.trim() || null,
      },
      include: inviteInclude,
    });

    return res.status(201).json({
      success: true,
      message: "Player invitation sent",
      data: invite,
    });
  } catch (error) {
    console.log("Error in invitePlayerToTeam:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listMyTeamPlayerInviteNotifications = async (req, res) => {
  try {
    const [incoming, outcomes] = await Promise.all([
      prisma.teamPlayerInvite.findMany({
        where: { invitedUserId: req.user.id },
        include: inviteInclude,
        orderBy: { createdAt: "desc" },
      }),
      prisma.teamPlayerInvite.findMany({
        where: {
          invitedById: req.user.id,
          status: { in: ["ACCEPTED", "REJECTED", "CANCELLED"] },
        },
        include: inviteInclude,
        orderBy: { respondedAt: "desc" },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: { incoming, outcomes },
    });
  } catch (error) {
    console.log("Error in listMyTeamPlayerInviteNotifications:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const respondTeamPlayerInvite = async (req, res) => {
  try {
    const inviteId = parsePositiveInt(req.params.inviteId);
    const action = String(req.body.action || "").toLowerCase();

    if (!inviteId || !["accept", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Valid inviteId and action are required",
      });
    }

    const invite = await prisma.teamPlayerInvite.findUnique({
      where: { id: inviteId },
      include: {
        invitedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
      },
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found",
      });
    }

    if (invite.invitedUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the invited user can respond",
      });
    }

    if (invite.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Invitation has already been answered",
      });
    }

    if (action === "reject") {
      const updated = await prisma.teamPlayerInvite.update({
        where: { id: inviteId },
        data: {
          status: "REJECTED",
          respondedAt: new Date(),
        },
        include: inviteInclude,
      });

      return res.status(200).json({
        success: true,
        message: "Invitation rejected",
        data: updated,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existingPlayer = await tx.player.findFirst({
        where: {
          teamId: invite.teamId,
          userId: invite.invitedUserId,
        },
        select: { id: true },
      });

      if (existingPlayer) {
        const error = new Error("User is already on this team");
        error.code = "ALREADY_ON_TEAM";
        throw error;
      }

      await tx.player.create({
        data: {
          firstName: invite.invitedUser.firstName,
          lastName: invite.invitedUser.lastName,
          position: invite.position,
          shirtNumber: invite.shirtNumber,
          photo: invite.invitedUser.image || null,
          teamId: invite.teamId,
          userId: invite.invitedUserId,
        },
      });

      const memberships = await tx.leagueTeam.findMany({
        where: { teamId: invite.teamId },
        select: { leagueId: true },
      });

      for (const membership of memberships) {
        await tx.leagueMember.upsert({
          where: {
            leagueId_userId: {
              leagueId: membership.leagueId,
              userId: invite.invitedUserId,
            },
          },
          create: {
            leagueId: membership.leagueId,
            userId: invite.invitedUserId,
            role: "PLAYER",
          },
          update: {},
        });
      }

      return tx.teamPlayerInvite.update({
        where: { id: inviteId },
        data: {
          status: "ACCEPTED",
          respondedAt: new Date(),
        },
        include: inviteInclude,
      });
    });

    return res.status(200).json({
      success: true,
      message: "Invitation accepted",
      data: updated,
    });
  } catch (error) {
    console.log("Error in respondTeamPlayerInvite:", error);
    if (error.code === "ALREADY_ON_TEAM" || error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "User is already on this team",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
