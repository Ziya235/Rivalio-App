import { prisma } from "../config/db.js";

const finishedLeagueMatchWhere = {
  status: "FINISHED",
  matchType: "LEAGUE",
  leagueId: { not: null },
};

export const getTeamLeagueStats = async (teamId) => {
  const matches = await prisma.match.findMany({
    where: {
      ...finishedLeagueMatchWhere,
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    select: {
      homeTeamId: true,
      homeScore: true,
      awayScore: true,
    },
  });

  const assistCount = await prisma.matchEvent.count({
    where: {
      type: "GOAL",
      teamId,
      assistPlayerId: { not: null },
      match: finishedLeagueMatchWhere,
    },
  });

  return {
    matchesPlayed: matches.length,
    goals: matches.reduce(
      (total, match) =>
        total +
        (match.homeTeamId === teamId ? match.homeScore : match.awayScore),
      0,
    ),
    assists: assistCount,
  };
};

export const getUserLeagueStats = async (userId) => {
  const players = await prisma.player.findMany({
    where: { userId },
    select: { id: true, teamId: true, createdAt: true },
  });

  if (players.length === 0) {
    return { gamesPlayed: 0, goals: 0, assists: 0 };
  }

  const playerIds = players.map((player) => player.id);
  const rosterMatchConditions = players.map((player) => ({
    finishedAt: { gte: player.createdAt },
    OR: [{ homeTeamId: player.teamId }, { awayTeamId: player.teamId }],
  }));

  const [gamesPlayed, goalEvents, assistEvents] = await Promise.all([
    prisma.match.count({
      where: {
        ...finishedLeagueMatchWhere,
        OR: rosterMatchConditions,
      },
    }),
    prisma.matchEvent.count({
      where: {
        type: "GOAL",
        playerId: { in: playerIds },
        match: finishedLeagueMatchWhere,
      },
    }),
    prisma.matchEvent.count({
      where: {
        type: "GOAL",
        assistPlayerId: { in: playerIds },
        match: finishedLeagueMatchWhere,
      },
    }),
  ]);

  return { gamesPlayed, goals: goalEvents, assists: assistEvents };
};

export const getPlayerLeagueStats = async (player) => {
  if (player.userId) {
    return getUserLeagueStats(player.userId);
  }

  const matchWhere = {
    ...finishedLeagueMatchWhere,
    finishedAt: { gte: player.createdAt },
    OR: [{ homeTeamId: player.teamId }, { awayTeamId: player.teamId }],
  };

  const [gamesPlayed, goals, assists] = await Promise.all([
    prisma.match.count({ where: matchWhere }),
    prisma.matchEvent.count({
      where: {
        type: "GOAL",
        playerId: player.id,
        match: finishedLeagueMatchWhere,
      },
    }),
    prisma.matchEvent.count({
      where: {
        type: "GOAL",
        assistPlayerId: player.id,
        match: finishedLeagueMatchWhere,
      },
    }),
  ]);

  return { gamesPlayed, goals, assists };
};
