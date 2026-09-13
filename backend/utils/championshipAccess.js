import { prisma } from "../config/db.js";

/**
 * PUBLIC championship: always visible.
 * PRIVATE: creator, captain of an enrolled team, or roster player on an enrolled team.
 */
export const canViewChampionship = async (userId, championshipId) => {
  const championship = await prisma.championship.findUnique({
    where: { id: championshipId },
    select: {
      id: true,
      visibility: true,
      createdById: true,
    },
  });

  if (!championship) {
    return { allowed: false, championship: null };
  }

  if (championship.visibility === "PUBLIC") {
    return { allowed: true, championship };
  }

  if (!userId) {
    return { allowed: false, championship };
  }

  if (championship.createdById === userId) {
    return { allowed: true, championship };
  }

  const enrolled = await prisma.championshipTeam.findFirst({
    where: {
      championshipId,
      team: {
        OR: [{ captainId: userId }, { players: { some: { userId } } }],
      },
    },
    select: { id: true },
  });

  return { allowed: Boolean(enrolled), championship };
};
