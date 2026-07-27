import { prisma } from "../config/db.js";

/**
 * Admin creates a free-text player on a team that belongs to one of their leagues.
 */
export const createPlayer = async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);

    const {
      firstName,
      lastName,
      position,
      shirtNumber,
      photo,
      description,
      username,
    } = req.body;

    if (!Number.isInteger(teamId) || teamId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid team id",
      });
    }

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required",
      });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        leagueMemberships: {
          include: {
            league: {
              include: { sport: true },
            },
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const ownedLeague = team.leagueMemberships.find(
      (m) => m.league.createdById === req.user.id,
    );

    if (!ownedLeague) {
      return res.status(403).json({
        success: false,
        message: "You can only add players to teams in your own leagues",
      });
    }

    if (ownedLeague.league.sport.code !== "FOOTBALL") {
      return res.status(403).json({
        success: false,
        message: "Only football players are supported for now",
      });
    }

    let userId = null;
    if (username?.trim()) {
      const user = await prisma.user.findUnique({
        where: { username: username.trim().toLowerCase() },
        select: { id: true },
      });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User with this username not found",
        });
      }
      userId = user.id;
    }

    const createdPlayer = await prisma.player.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        position: position?.trim() || null,
        shirtNumber: shirtNumber || null,
        photo: photo || null,
        description: description || null,
        teamId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (userId) {
      await prisma.leagueMember.upsert({
        where: {
          leagueId_userId: {
            leagueId: ownedLeague.leagueId,
            userId,
          },
        },
        create: {
          leagueId: ownedLeague.leagueId,
          userId,
          role: "PLAYER",
        },
        update: {},
      });
    }

    return res.status(201).json({
      success: true,
      message: "Player created successfully",
      data: createdPlayer,
    });
  } catch (error) {
    console.log("Error in createPlayer:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "This user is already on the team",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deletePlayer = async (req, res) => {
  try {
    const leagueId = Number(req.params.leagueId);
    const teamId = Number(req.params.teamId);
    const playerId = Number(req.params.playerId);

    if (!Number.isInteger(leagueId) || leagueId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid league id",
      });
    }

    if (!Number.isInteger(teamId) || teamId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid team id",
      });
    }

    if (!Number.isInteger(playerId) || playerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid player id",
      });
    }

    const player = await prisma.player.findFirst({
      where: {
        id: playerId,
        teamId,
        team: {
          leagueMemberships: {
            some: { leagueId },
          },
        },
      },
      include: {
        team: {
          include: {
            leagueMemberships: {
              where: { leagueId },
              include: { league: true },
            },
          },
        },
      },
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found in this team and league",
      });
    }

    const league = player.team.leagueMemberships[0]?.league;
    if (!league || league.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only delete players from your own league",
      });
    }

    await prisma.player.delete({
      where: { id: playerId },
    });

    return res.status(200).json({
      success: true,
      message: "Player deleted successfully",
    });
  } catch (error) {
    console.log("Error in deletePlayer:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
