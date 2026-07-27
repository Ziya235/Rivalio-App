import { prisma } from "../config/db.js";

/**
 * When a team joins a league, sync all roster users (and captain) as LeagueMembers.
 */
export const syncTeamPlayersAsLeagueMembers = async (tx, leagueId, teamId) => {
  const client = tx || prisma;

  const team = await client.team.findUnique({
    where: { id: teamId },
    select: {
      captainId: true,
      players: {
        where: { userId: { not: null } },
        select: { userId: true },
      },
    },
  });

  if (!team) return;

  const userIds = new Set(
    team.players.map((p) => p.userId).filter(Boolean),
  );
  userIds.add(team.captainId);

  for (const userId of userIds) {
    await client.leagueMember.upsert({
      where: {
        leagueId_userId: { leagueId, userId },
      },
      create: {
        leagueId,
        userId,
        role: "PLAYER",
      },
      update: {},
    });
  }
};

export const addTeamToLeague = async (tx, leagueId, teamId) => {
  const client = tx || prisma;

  const membership = await client.leagueTeam.upsert({
    where: {
      leagueId_teamId: { leagueId, teamId },
    },
    create: { leagueId, teamId },
    update: {},
  });

  await syncTeamPlayersAsLeagueMembers(client, leagueId, teamId);
  return membership;
};
