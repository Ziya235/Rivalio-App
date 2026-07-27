import { prisma } from "../config/db.js";

/**
 * Aggregate goals/assists for players from MatchEvents in a league (or any matches).
 */
export const getPlayerStatsMap = async ({ leagueId, teamId, playerIds } = {}) => {
  const eventWhere = {
    OR: [
      { type: "GOAL", playerId: { not: null } },
      { type: "OWN_GOAL", playerId: { not: null } },
      { assistPlayerId: { not: null } },
    ],
  };

  if (leagueId) {
    eventWhere.match = {
      leagueId,
      ...(teamId
        ? { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] }
        : {}),
    };
  } else if (teamId) {
    eventWhere.match = {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    };
  }

  if (playerIds?.length) {
    eventWhere.AND = [
      {
        OR: [
          { playerId: { in: playerIds } },
          { assistPlayerId: { in: playerIds } },
        ],
      },
    ];
  }

  const events = await prisma.matchEvent.findMany({
    where: eventWhere,
    select: {
      type: true,
      playerId: true,
      assistPlayerId: true,
      matchId: true,
    },
  });

  const stats = new Map();

  const ensure = (id) => {
    if (!stats.has(id)) {
      stats.set(id, { goals: 0, assists: 0, matchIds: new Set() });
    }
    return stats.get(id);
  };

  for (const event of events) {
    if (event.playerId && (event.type === "GOAL" || event.type === "OWN_GOAL")) {
      // Only count regular goals toward scorers; own goals do not boost scorer table
      if (event.type === "GOAL") {
        const s = ensure(event.playerId);
        s.goals += 1;
        s.matchIds.add(event.matchId);
      }
    }
    if (event.assistPlayerId) {
      const s = ensure(event.assistPlayerId);
      s.assists += 1;
      s.matchIds.add(event.matchId);
    }
  }

  const result = new Map();
  for (const [id, value] of stats) {
    result.set(id, {
      goals: value.goals,
      assists: value.assists,
      matchesPlayed: value.matchIds.size,
    });
  }
  return result;
};

export const attachPlayerStats = (players, statsMap) =>
  players.map((player) => {
    const stats = statsMap.get(player.id) || {
      goals: 0,
      assists: 0,
      matchesPlayed: 0,
    };
    return {
      ...player,
      goals: stats.goals,
      assists: stats.assists,
      matchesPlayed: stats.matchesPlayed,
    };
  });
