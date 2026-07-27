import { prisma } from "../config/db.js";
import { addTeamToLeague } from "../utils/leagueMembership.js";
import { parsePositiveInt, teamSelect, userBriefSelect } from "../utils/helpers.js";

const inviteInclude = {
  league: {
    select: {
      id: true,
      name: true,
      logo: true,
      visibility: true,
      status: true,
      season: true,
      createdById: true,
    },
  },
  team: {
    select: {
      ...teamSelect,
      captain: { select: userBriefSelect },
    },
  },
  invitedBy: { select: userBriefSelect },
};

const joinInclude = {
  league: {
    select: {
      id: true,
      name: true,
      logo: true,
      visibility: true,
      status: true,
      season: true,
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

/**
 * Admin invites an existing team (by unique name) into their league.
 */
export const inviteTeamToLeague = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    const { teamName, teamId, message } = req.body;

    if (!leagueId) {
      return res.status(400).json({
        success: false,
        message: "Invalid league id",
      });
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { id: true, createdById: true, name: true },
    });

    if (!league) {
      return res.status(404).json({
        success: false,
        message: "League not found",
      });
    }

    if (league.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only invite teams to your own league",
      });
    }

    let team = null;
    if (teamId) {
      const id = parsePositiveInt(teamId);
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Invalid team id",
        });
      }
      team = await prisma.team.findUnique({ where: { id } });
    } else if (teamName?.trim()) {
      team = await prisma.team.findUnique({
        where: { name: teamName.trim() },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "teamName or teamId is required",
      });
    }

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const alreadyIn = await prisma.leagueTeam.findUnique({
      where: {
        leagueId_teamId: { leagueId, teamId: team.id },
      },
    });

    if (alreadyIn) {
      return res.status(409).json({
        success: false,
        message: "Team is already in this league",
      });
    }

    const pending = await prisma.leagueTeamInvite.findFirst({
      where: {
        leagueId,
        teamId: team.id,
        status: "PENDING",
      },
    });

    if (pending) {
      return res.status(409).json({
        success: false,
        message: "A pending invite already exists for this team",
      });
    }

    const invite = await prisma.leagueTeamInvite.create({
      data: {
        leagueId,
        teamId: team.id,
        invitedById: req.user.id,
        message: message?.trim() || null,
      },
      include: inviteInclude,
    });

    return res.status(201).json({
      success: true,
      message: "Invite sent to team captain",
      data: invite,
    });
  } catch (error) {
    console.log("Error in inviteTeamToLeague:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listLeagueInvites = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    if (!leagueId) {
      return res.status(400).json({
        success: false,
        message: "Invalid league id",
      });
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { createdById: true },
    });

    if (!league) {
      return res.status(404).json({
        success: false,
        message: "League not found",
      });
    }

    if (league.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    const invites = await prisma.leagueTeamInvite.findMany({
      where: { leagueId },
      include: inviteInclude,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, data: invites });
  } catch (error) {
    console.log("Error in listLeagueInvites:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Captain lists pending invites for their teams.
 */
export const listMyTeamInvites = async (req, res) => {
  try {
    const invites = await prisma.leagueTeamInvite.findMany({
      where: {
        status: "PENDING",
        team: { captainId: req.user.id },
      },
      include: inviteInclude,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, data: invites });
  } catch (error) {
    console.log("Error in listMyTeamInvites:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const respondTeamInvite = async (req, res) => {
  try {
    const inviteId = parsePositiveInt(req.params.inviteId);
    const action = String(req.body.action || "").toLowerCase();

    if (!inviteId) {
      return res.status(400).json({
        success: false,
        message: "Invalid invite id",
      });
    }

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "action must be accept or reject",
      });
    }

    const invite = await prisma.leagueTeamInvite.findUnique({
      where: { id: inviteId },
      include: {
        team: { select: { id: true, captainId: true } },
      },
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invite not found",
      });
    }

    if (invite.team.captainId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the team captain can respond",
      });
    }

    if (invite.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Invite is no longer pending",
      });
    }

    if (action === "reject") {
      const updated = await prisma.leagueTeamInvite.update({
        where: { id: inviteId },
        data: {
          status: "REJECTED",
          respondedAt: new Date(),
        },
        include: inviteInclude,
      });
      return res.status(200).json({
        success: true,
        message: "Invite rejected",
        data: updated,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await addTeamToLeague(tx, invite.leagueId, invite.teamId);

      return tx.leagueTeamInvite.update({
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
      message: "Team joined the league",
      data: updated,
    });
  } catch (error) {
    console.log("Error in respondTeamInvite:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Captain requests to join a PUBLIC league.
 */
export const requestJoinPublicLeague = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    const { teamId, message } = req.body;
    const tid = parsePositiveInt(teamId);

    if (!leagueId || !tid) {
      return res.status(400).json({
        success: false,
        message: "leagueId and teamId are required",
      });
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        visibility: true,
        createdById: true,
        name: true,
      },
    });

    if (!league) {
      return res.status(404).json({
        success: false,
        message: "League not found",
      });
    }

    if (league.visibility !== "PUBLIC") {
      return res.status(403).json({
        success: false,
        message: "You can only request to join public leagues",
      });
    }

    const team = await prisma.team.findUnique({
      where: { id: tid },
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

    const alreadyIn = await prisma.leagueTeam.findUnique({
      where: {
        leagueId_teamId: { leagueId, teamId: tid },
      },
    });

    if (alreadyIn) {
      return res.status(409).json({
        success: false,
        message: "Team is already in this league",
      });
    }

    const pending = await prisma.leagueJoinRequest.findFirst({
      where: {
        leagueId,
        teamId: tid,
        status: "PENDING",
      },
    });

    if (pending) {
      return res.status(409).json({
        success: false,
        message: "A pending join request already exists",
      });
    }

    const request = await prisma.leagueJoinRequest.create({
      data: {
        leagueId,
        teamId: tid,
        requestedById: req.user.id,
        message: message?.trim() || null,
      },
      include: joinInclude,
    });

    return res.status(201).json({
      success: true,
      message: "Join request sent to league admin",
      data: request,
    });
  } catch (error) {
    console.log("Error in requestJoinPublicLeague:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listLeagueJoinRequests = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    if (!leagueId) {
      return res.status(400).json({
        success: false,
        message: "Invalid league id",
      });
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { createdById: true },
    });

    if (!league) {
      return res.status(404).json({
        success: false,
        message: "League not found",
      });
    }

    if (league.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    const requests = await prisma.leagueJoinRequest.findMany({
      where: { leagueId },
      include: joinInclude,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.log("Error in listLeagueJoinRequests:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const respondJoinRequest = async (req, res) => {
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

    const request = await prisma.leagueJoinRequest.findUnique({
      where: { id: requestId },
      include: {
        league: { select: { createdById: true } },
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (request.league.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the league admin can respond",
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Request is no longer pending",
      });
    }

    if (action === "reject") {
      const updated = await prisma.leagueJoinRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          respondedAt: new Date(),
        },
        include: joinInclude,
      });
      return res.status(200).json({
        success: true,
        message: "Join request rejected",
        data: updated,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await addTeamToLeague(tx, request.leagueId, request.teamId);

      return tx.leagueJoinRequest.update({
        where: { id: requestId },
        data: {
          status: "ACCEPTED",
          respondedAt: new Date(),
        },
        include: joinInclude,
      });
    });

    return res.status(200).json({
      success: true,
      message: "Team added to league",
      data: updated,
    });
  } catch (error) {
    console.log("Error in respondJoinRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Remove team from league (unlink, do not delete team).
 */
export const removeTeamFromLeague = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    const teamId = parsePositiveInt(req.params.teamId);

    if (!leagueId || !teamId) {
      return res.status(400).json({
        success: false,
        message: "Invalid league or team id",
      });
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { createdById: true },
    });

    if (!league) {
      return res.status(404).json({
        success: false,
        message: "League not found",
      });
    }

    if (league.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only manage your own league",
      });
    }

    const membership = await prisma.leagueTeam.findUnique({
      where: {
        leagueId_teamId: { leagueId, teamId },
      },
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "Team not found in this league",
      });
    }

    await prisma.leagueTeam.delete({
      where: { id: membership.id },
    });

    return res.status(200).json({
      success: true,
      message: "Team removed from league",
    });
  } catch (error) {
    console.log("Error in removeTeamFromLeague:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
