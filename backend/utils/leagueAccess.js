import { prisma } from "../config/db.js";

/**
 * PRIVATE league: creator, LeagueMember, or player on a team in the league.
 * PUBLIC: always visible.
 */
export const canViewLeague = async (userId, leagueId) => {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      visibility: true,
      createdById: true,
    },
  });

  if (!league) {
    return { allowed: false, league: null };
  }

  if (league.visibility === "PUBLIC") {
    return { allowed: true, league };
  }

  if (!userId) {
    return { allowed: false, league };
  }

  if (league.createdById === userId) {
    return { allowed: true, league };
  }

  const membership = await prisma.leagueMember.findUnique({
    where: {
      leagueId_userId: { leagueId, userId },
    },
    select: { id: true },
  });

  if (membership) {
    return { allowed: true, league };
  }

  const rosterPlayer = await prisma.player.findFirst({
    where: {
      userId,
      team: {
        leagueMemberships: {
          some: { leagueId },
        },
      },
    },
    select: { id: true },
  });

  if (rosterPlayer) {
    return { allowed: true, league };
  }

  return { allowed: false, league };
};
