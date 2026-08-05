import { prisma } from "../config/db.js";
import { getPlayerLeagueStats } from "../utils/leagueStats.js";

export const getPlayerProfile = async (req, res) => {
  try {
    const playerId = Number(req.params.playerId);
    if (!Number.isInteger(playerId) || playerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid player id",
      });
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        userId: true,
        teamId: true,
        firstName: true,
        lastName: true,
        position: true,
        shirtNumber: true,
        photo: true,
        description: true,
        createdAt: true,
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
            image: true,
            dateOfBirth: true,
            bio: true,
            workplace: true,
            school: true,
          },
        },
      },
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found",
      });
    }

    const teamPlayers = await prisma.player.findMany({
      where: player.userId ? { userId: player.userId } : { id: player.id },
      select: {
        id: true,
        position: true,
        shirtNumber: true,
        team: {
          select: {
            id: true,
            name: true,
            shortName: true,
            logo: true,
            city: true,
            leagueMemberships: {
              select: {
                league: {
                  select: {
                    id: true,
                    name: true,
                    logo: true,
                    season: true,
                    visibility: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const stats = await getPlayerLeagueStats(player);
    const leagues = [
      ...new Map(
        teamPlayers
          .flatMap((entry) =>
            entry.team.leagueMemberships.map((membership) => membership.league),
          )
          .map((league) => [league.id, league]),
      ).values(),
    ];

    return res.status(200).json({
      success: true,
      data: {
        id: player.id,
        userId: player.userId,
        username: player.user?.username ?? null,
        firstName: player.user?.firstName ?? player.firstName,
        lastName: player.user?.lastName ?? player.lastName,
        image: player.user?.image ?? player.photo,
        position: player.position,
        shirtNumber: player.shirtNumber,
        description: player.user?.bio ?? player.description,
        dateOfBirth: player.user?.dateOfBirth ?? null,
        workplace: player.user?.workplace ?? null,
        school: player.user?.school ?? null,
        stats,
        teams: teamPlayers.map(({ team, ...entry }) => ({
          playerId: entry.id,
          position: entry.position,
          shirtNumber: entry.shirtNumber,
          id: team.id,
          name: team.name,
          shortName: team.shortName,
          logo: team.logo,
          city: team.city,
        })),
        leagues,
      },
    });
  } catch (error) {
    console.log("Error in getPlayerProfile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

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
