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
