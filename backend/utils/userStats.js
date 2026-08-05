/**
 * Apply / revert goal & assist counters on linked User profiles.
 */
export const applyGoalAssistToUsers = async (tx, { playerId, assistPlayerId, direction }) => {
  const playerIds = [...new Set([playerId, assistPlayerId].filter(Boolean))];
  if (playerIds.length === 0) return;

  const players = await tx.player.findMany({
    where: { id: { in: playerIds }, userId: { not: null } },
    select: { id: true, userId: true },
  });

  const userIdOf = (id) =>
    id ? players.find((p) => p.id === id)?.userId ?? null : null;

  const scorerUserId = userIdOf(playerId);
  const assistUserId = userIdOf(assistPlayerId);

  if (direction === "decrement") {
    // The `gt: 0` filter keeps counters non-negative without a read-back roundtrip.
    if (scorerUserId) {
      await tx.user.updateMany({
        where: { id: scorerUserId, goals: { gt: 0 } },
        data: { goals: { decrement: 1 } },
      });
    }
    if (assistUserId) {
      await tx.user.updateMany({
        where: { id: assistUserId, assists: { gt: 0 } },
        data: { assists: { decrement: 1 } },
      });
    }
    return;
  }

  if (scorerUserId) {
    await tx.user.updateMany({
      where: { id: scorerUserId },
      data: { goals: { increment: 1 } },
    });
  }
  if (assistUserId) {
    await tx.user.updateMany({
      where: { id: assistUserId },
      data: { assists: { increment: 1 } },
    });
  }
};

/**
 * Once per finished match: increment gamesPlayed for roster users on both teams.
 */
export const applyGamesPlayedForMatch = async (tx, match) => {
  if (match.statsApplied) return;

  const players = await tx.player.findMany({
    where: {
      teamId: { in: [match.homeTeamId, match.awayTeamId] },
      userId: { not: null },
    },
    select: { userId: true },
  });

  const userIds = [...new Set(players.map((p) => p.userId).filter(Boolean))];

  if (userIds.length > 0) {
    await tx.user.updateMany({
      where: { id: { in: userIds } },
      data: { gamesPlayed: { increment: 1 } },
    });
  }

  await tx.match.update({
    where: { id: match.id },
    data: { statsApplied: true },
  });
};
