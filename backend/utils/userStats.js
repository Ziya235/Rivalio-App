/**
 * Apply / revert goal & assist counters on linked User profiles.
 */
export const applyGoalAssistToUsers = async (tx, { playerId, assistPlayerId, direction }) => {
  const delta = direction === "decrement" ? -1 : 1;

  if (playerId) {
    const player = await tx.player.findUnique({
      where: { id: playerId },
      select: { userId: true },
    });
    if (player?.userId) {
      const user = await tx.user.findUnique({
        where: { id: player.userId },
        select: { goals: true },
      });
      if (user) {
        await tx.user.update({
          where: { id: player.userId },
          data: {
            goals: Math.max(0, user.goals + delta),
          },
        });
      }
    }
  }

  if (assistPlayerId) {
    const assist = await tx.player.findUnique({
      where: { id: assistPlayerId },
      select: { userId: true },
    });
    if (assist?.userId) {
      const user = await tx.user.findUnique({
        where: { id: assist.userId },
        select: { assists: true },
      });
      if (user) {
        await tx.user.update({
          where: { id: assist.userId },
          data: {
            assists: Math.max(0, user.assists + delta),
          },
        });
      }
    }
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

  for (const userId of userIds) {
    await tx.user.update({
      where: { id: userId },
      data: { gamesPlayed: { increment: 1 } },
    });
  }

  await tx.match.update({
    where: { id: match.id },
    data: { statsApplied: true },
  });
};
