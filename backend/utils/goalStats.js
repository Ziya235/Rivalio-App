import { prisma } from "../config/db.js";

export const COMPETITIVE_TYPES = ["LEAGUE", "CHAMPIONSHIP"];

/**
 * Shared match filter for league + championship goal stats.
 * finishedOnly: career / standings (completed matches only).
 * Otherwise exclude cancelled so live events still count in scorer tables.
 */
export function competitiveMatchWhere(scope = {}) {
  const where = {
    matchType: { in: COMPETITIVE_TYPES },
  };

  if (scope.finishedOnly) {
    where.status = "FINISHED";
  } else {
    where.status = { notIn: ["CANCELLED"] };
  }

  if (scope.leagueId) {
    where.leagueId = scope.leagueId;
    where.matchType = "LEAGUE";
  } else if (scope.championshipId) {
    where.championshipId = scope.championshipId;
    where.matchType = "CHAMPIONSHIP";
  }

  if (scope.groupId) where.groupId = scope.groupId;
  if (scope.stage) where.stage = scope.stage;

  if (scope.teamId) {
    const teamClause = {
      OR: [{ homeTeamId: scope.teamId }, { awayTeamId: scope.teamId }],
    };
    if (where.OR) {
      where.AND = [{ OR: where.OR }, teamClause];
      delete where.OR;
    } else {
      Object.assign(where, teamClause);
    }
  }

  return where;
}

function teamScore(match, teamId) {
  if (match.homeTeamId === teamId) return match.homeScore;
  if (match.awayTeamId === teamId) return match.awayScore;
  return 0;
}

export async function getTeamGoalStats(teamId, scope = {}) {
  const matchWhere = competitiveMatchWhere({
    ...scope,
    teamId,
    finishedOnly: scope.finishedOnly !== false,
  });

  const [matches, assistCount] = await Promise.all([
    prisma.match.findMany({
      where: matchWhere,
      select: {
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
      },
    }),
    prisma.matchEvent.count({
      where: {
        type: "GOAL",
        teamId,
        assistPlayerId: { not: null },
        match: matchWhere,
      },
    }),
  ]);

  return {
    matchesPlayed: matches.length,
    goals: matches.reduce((total, match) => total + teamScore(match, teamId), 0),
    assists: assistCount,
  };
}

async function countPlayerEventStats(playerIds, extraPlayerWhere, matchWhere) {
  if (playerIds.length === 0) {
    return { gamesPlayed: 0, goals: 0, assists: 0 };
  }

  const [gamesPlayed, goals, assists] = await Promise.all([
    prisma.match.count({
      where: {
        ...matchWhere,
        OR: extraPlayerWhere,
      },
    }),
    prisma.matchEvent.count({
      where: {
        type: "GOAL",
        playerId: { in: playerIds },
        match: matchWhere,
      },
    }),
    prisma.matchEvent.count({
      where: {
        type: "GOAL",
        assistPlayerId: { in: playerIds },
        match: matchWhere,
      },
    }),
  ]);

  return { gamesPlayed, goals, assists };
}

export async function getUserGoalStats(userId, scope = {}) {
  const players = await prisma.player.findMany({
    where: { userId },
    select: { id: true, teamId: true, createdAt: true },
  });

  if (players.length === 0) {
    return { gamesPlayed: 0, goals: 0, assists: 0 };
  }

  const matchWhere = competitiveMatchWhere({
    ...scope,
    finishedOnly: scope.finishedOnly !== false,
  });

  return countPlayerEventStats(
    players.map((player) => player.id),
    players.map((player) => ({
      finishedAt: { gte: player.createdAt },
      OR: [{ homeTeamId: player.teamId }, { awayTeamId: player.teamId }],
    })),
    matchWhere,
  );
}

export async function getPlayerGoalStats(player, scope = {}) {
  if (player.userId) {
    return getUserGoalStats(player.userId, scope);
  }

  const matchWhere = competitiveMatchWhere({
    ...scope,
    finishedOnly: scope.finishedOnly !== false,
  });

  return countPlayerEventStats(
    [player.id],
    [
      {
        finishedAt: { gte: player.createdAt },
        OR: [{ homeTeamId: player.teamId }, { awayTeamId: player.teamId }],
      },
    ],
    matchWhere,
  );
}
