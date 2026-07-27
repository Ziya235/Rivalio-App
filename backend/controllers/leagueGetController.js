import { prisma } from "../config/db.js";
import { canViewLeague } from "../utils/leagueAccess.js";
import {
  computeLeagueStandings,
  computeTeamForm,
  getNextMatchForTeam,
} from "../utils/matchStandings.js";
import {
  attachPlayerStats,
  getPlayerStatsMap,
} from "../utils/playerStats.js";

const emptyPlayerStats = () => ({
  goals: 0,
  assists: 0,
  matchesPlayed: 0,
});

const parsePositiveInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const assertLeagueAccess = async (req, res, leagueId) => {
  if (!leagueId) {
    res.status(400).json({
      success: false,
      message: "Invalid league id",
    });
    return null;
  }

  const userId = req.user?.id ?? null;
  const { allowed, league } = await canViewLeague(userId, leagueId);

  if (!league) {
    res.status(404).json({
      success: false,
      message: "League not found",
    });
    return null;
  }

  if (!allowed) {
    res.status(403).json({
      success: false,
      message: "You do not have access to this league",
    });
    return null;
  }

  return league;
};

export const getLeagues = async (req, res) => {
  try {
    const userId = req.user?.id ?? null;

    const where = userId
      ? {
          OR: [
            { visibility: "PUBLIC" },
            { visibility: "PRIVATE", createdById: userId },
            {
              visibility: "PRIVATE",
              members: {
                some: { userId },
              },
            },
            {
              visibility: "PRIVATE",
              teams: {
                some: {
                  team: {
                    players: {
                      some: { userId },
                    },
                  },
                },
              },
            },
          ],
        }
      : {
          visibility: "PUBLIC",
        };

    const leagues = await prisma.league.findMany({
      where,
      select: {
        id: true,
        name: true,
        logo: true,
        season: true,
        description: true,
        visibility: true,
        status: true,
        createdAt: true,
        updatedAt: true,
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
          },
        },
        _count: {
          select: {
            teams: true,
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      data: leagues,
    });
  } catch (error) {
    console.log("Error in getLeagues:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getLeagueById = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    const access = await assertLeagueAccess(req, res, leagueId);
    if (!access) return;

    const league = await prisma.league.findUnique({
      where: {
        id: leagueId,
      },
      select: {
        id: true,
        name: true,
        logo: true,
        season: true,
        description: true,
        visibility: true,
        status: true,
        createdAt: true,
        updatedAt: true,
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
          },
        },
        teams: {
          select: {
            joinedAt: true,
            team: {
              select: {
                id: true,
                name: true,
                shortName: true,
                logo: true,
              },
            },
          },
          orderBy: {
            team: { name: "asc" },
          },
        },
      },
    });

    const data = league
      ? {
          ...league,
          teams: league.teams.map((m) => m.team),
        }
      : null;

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.log("Error in getLeagueById:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getLeagueStandings = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    const access = await assertLeagueAccess(req, res, leagueId);
    if (!access) return;

    const standings = await computeLeagueStandings(leagueId);

    return res.status(200).json({
      success: true,
      data: {
        leagueId,
        standings,
      },
    });
  } catch (error) {
    console.log("Error in getLeagueStandings:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getLeagueTeams = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    const access = await assertLeagueAccess(req, res, leagueId);
    if (!access) return;

    const memberships = await prisma.leagueTeam.findMany({
      where: { leagueId },
      select: {
        team: {
          select: {
            id: true,
            name: true,
            shortName: true,
            logo: true,
            description: true,
            city: true,
            primaryColor: true,
            secondaryColor: true,
            foundedYear: true,
            _count: {
              select: {
                players: true,
              },
            },
          },
        },
      },
      orderBy: { team: { name: "asc" } },
    });

    const data = memberships.map(({ team }) => ({
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      logo: team.logo,
      description: team.description,
      city: team.city,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      foundedYear: team.foundedYear,
      playersCount: team._count.players,
    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.log("Error in getLeagueTeams:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getLeagueTeamById = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    const teamId = parsePositiveInt(req.params.teamId);

    const access = await assertLeagueAccess(req, res, leagueId);
    if (!access) return;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: "Invalid team id",
      });
    }

    const membership = await prisma.leagueTeam.findUnique({
      where: {
        leagueId_teamId: { leagueId, teamId },
      },
      select: {
        team: {
          select: {
            id: true,
            name: true,
            shortName: true,
            logo: true,
            description: true,
            city: true,
            primaryColor: true,
            secondaryColor: true,
            foundedYear: true,
            createdAt: true,
            updatedAt: true,
            players: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                position: true,
                shirtNumber: true,
                photo: true,
              },
              orderBy: [{ shirtNumber: "asc" }, { lastName: "asc" }],
            },
          },
        },
      },
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "Team not found in this league",
      });
    }

    const team = membership.team;

    const leagueMeta = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        name: true,
        logo: true,
        season: true,
        visibility: true,
        status: true,
        sport: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    const standings = await computeLeagueStandings(leagueId);

    const standingIndex = standings.findIndex((row) => row.teamId === teamId);
    const standing = standingIndex >= 0 ? standings[standingIndex] : null;
    const stats = {
      ...(standing
        ? {
            played: standing.played,
            wins: standing.wins,
            draws: standing.draws,
            losses: standing.losses,
            goalsFor: standing.goalsFor,
            goalsAgainst: standing.goalsAgainst,
            goalDifference: standing.goalDifference,
            points: standing.points,
          }
        : {
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0,
          }),
      position: standingIndex >= 0 ? standingIndex + 1 : null,
    };

    const statsMap = await getPlayerStatsMap({ leagueId, teamId });
    const players = attachPlayerStats(team.players, statsMap);

    let topScorer = null;
    let topAssister = null;
    for (const player of players) {
      const fullName = `${player.firstName} ${player.lastName}`.trim();
      if (
        !topScorer ||
        player.goals > topScorer.goals ||
        (player.goals === topScorer.goals &&
          fullName.localeCompare(topScorer.name) < 0)
      ) {
        topScorer = {
          id: player.id,
          name: fullName,
          goals: player.goals,
        };
      }
      if (
        !topAssister ||
        player.assists > topAssister.assists ||
        (player.assists === topAssister.assists &&
          fullName.localeCompare(topAssister.name) < 0)
      ) {
        topAssister = {
          id: player.id,
          name: fullName,
          assists: player.assists,
        };
      }
    }

    const avgGoalsPerGame =
      stats.played > 0
        ? Math.round((stats.goalsFor / stats.played) * 100) / 100
        : 0;
    const winRate =
      stats.played > 0
        ? Math.round((stats.wins / stats.played) * 1000) / 10
        : 0;

    const [form, nextMatch] = await Promise.all([
      computeTeamForm(leagueId, teamId),
      getNextMatchForTeam(leagueId, teamId),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        logo: team.logo,
        description: team.description,
        city: team.city,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
        foundedYear: team.foundedYear,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        league: leagueMeta,
        stats,
        topScorer,
        topAssister,
        avgGoalsPerGame,
        winRate,
        form,
        nextMatch,
        players,
      },
    });
  } catch (error) {
    console.log("Error in getLeagueTeamById:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getLeaguePlayers = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    const access = await assertLeagueAccess(req, res, leagueId);
    if (!access) return;

    const teamIdFilter = req.query.teamId
      ? parsePositiveInt(req.query.teamId)
      : null;

    if (req.query.teamId && !teamIdFilter) {
      return res.status(400).json({
        success: false,
        message: "Invalid teamId query",
      });
    }

    if (teamIdFilter) {
      const team = await prisma.leagueTeam.findUnique({
        where: {
          leagueId_teamId: { leagueId, teamId: teamIdFilter },
        },
        select: { id: true },
      });

      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Team not found in this league",
        });
      }
    }

    const sort = typeof req.query.sort === "string" ? req.query.sort : null;
    if (sort && !["goals", "assists"].includes(sort)) {
      return res.status(400).json({
        success: false,
        message: "sort must be goals or assists",
      });
    }

    const players = await prisma.player.findMany({
      where: {
        team: {
          leagueMemberships: {
            some: {
              leagueId,
              ...(teamIdFilter ? { teamId: teamIdFilter } : {}),
            },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        shirtNumber: true,
        photo: true,
        description: true,
        userId: true,
        team: {
          select: {
            id: true,
            name: true,
            shortName: true,
            logo: true,
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const statsMap = await getPlayerStatsMap({
      leagueId,
      teamId: teamIdFilter || undefined,
    });

    let data = attachPlayerStats(players, statsMap);

    if (sort === "goals") {
      data = [...data].sort(
        (a, b) =>
          b.goals - a.goals ||
          a.lastName.localeCompare(b.lastName) ||
          a.firstName.localeCompare(b.firstName),
      );
    } else if (sort === "assists") {
      data = [...data].sort(
        (a, b) =>
          b.assists - a.assists ||
          a.lastName.localeCompare(b.lastName) ||
          a.firstName.localeCompare(b.firstName),
      );
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.log("Error in getLeaguePlayers:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getTeamPlayers = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    const teamId = parsePositiveInt(req.params.teamId);

    const access = await assertLeagueAccess(req, res, leagueId);
    if (!access) return;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: "Invalid team id",
      });
    }

    const membership = await prisma.leagueTeam.findUnique({
      where: {
        leagueId_teamId: { leagueId, teamId },
      },
      select: {
        team: {
          select: {
            id: true,
            name: true,
            shortName: true,
            logo: true,
          },
        },
      },
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "Team not found in this league",
      });
    }

    const team = membership.team;

    const players = await prisma.player.findMany({
      where: {
        teamId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        shirtNumber: true,
        photo: true,
        description: true,
        userId: true,
      },
      orderBy: [{ shirtNumber: "asc" }, { lastName: "asc" }],
    });

    const statsMap = await getPlayerStatsMap({ leagueId, teamId });
    const data = attachPlayerStats(players, statsMap);

    return res.status(200).json({
      success: true,
      data: {
        team,
        players: data,
      },
    });
  } catch (error) {
    console.log("Error in getTeamPlayers:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getTeamPlayerById = async (req, res) => {
  try {
    const leagueId = parsePositiveInt(req.params.leagueId);
    const teamId = parsePositiveInt(req.params.teamId);
    const playerId = parsePositiveInt(req.params.playerId);

    const access = await assertLeagueAccess(req, res, leagueId);
    if (!access) return;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: "Invalid team id",
      });
    }

    if (!playerId) {
      return res.status(400).json({
        success: false,
        message: "Invalid player id",
      });
    }

    const membership = await prisma.leagueTeam.findUnique({
      where: {
        leagueId_teamId: { leagueId, teamId },
      },
      select: {
        team: {
          select: {
            id: true,
            name: true,
            shortName: true,
            logo: true,
            city: true,
            primaryColor: true,
            secondaryColor: true,
          },
        },
      },
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "Team not found in this league",
      });
    }

    const team = membership.team;

    const leagueMeta = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        name: true,
        logo: true,
        season: true,
        visibility: true,
        status: true,
      },
    });

    const player = await prisma.player.findFirst({
      where: {
        id: playerId,
        teamId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        shirtNumber: true,
        photo: true,
        description: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found in this team",
      });
    }

    const statsMap = await getPlayerStatsMap({
      leagueId,
      teamId,
      playerIds: [playerId],
    });
    const stats = statsMap.get(playerId) || emptyPlayerStats();

    return res.status(200).json({
      success: true,
      data: {
        ...player,
        team: {
          id: team.id,
          name: team.name,
          shortName: team.shortName,
          logo: team.logo,
          city: team.city,
          primaryColor: team.primaryColor,
          secondaryColor: team.secondaryColor,
        },
        league: leagueMeta,
        stats,
      },
    });
  } catch (error) {
    console.log("Error in getTeamPlayerById:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
