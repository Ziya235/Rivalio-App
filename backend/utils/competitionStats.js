import { prisma } from "../config/db.js";
import { attachPlayerStats, getPlayerStatsMap } from "./playerStats.js";
import { computeCompetitionStandings } from "./matchStandings.js";

const teamBrief = {
  id: true,
  name: true,
  shortName: true,
  logo: true,
};

function playerWhereForScope(scope = {}) {
  if (scope.championshipId) {
    return {
      team: {
        championshipTeams: { some: { championshipId: scope.championshipId } },
      },
    };
  }
  if (scope.leagueId) {
    return {
      team: {
        leagueMemberships: { some: { leagueId: scope.leagueId } },
      },
    };
  }
  throw new Error("leagueId or championshipId is required");
}

/**
 * In-competition player + team stats for a league or championship.
 * Player goals come from GOAL events; team GF/GA come from finished match scores.
 * The same goal is counted once per side — never summed twice.
 */
export async function buildCompetitionStatistics(scope = {}) {
  const [statsMap, teams, roster] = await Promise.all([
    getPlayerStatsMap(scope),
    computeCompetitionStandings(scope),
    prisma.player.findMany({
      where: playerWhereForScope(scope),
      select: {
        id: true,
        firstName: true,
        lastName: true,
        shirtNumber: true,
        photo: true,
        teamId: true,
        team: { select: teamBrief },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const players = attachPlayerStats(roster, statsMap).map((player) => ({
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    shirtNumber: player.shirtNumber,
    photo: player.photo,
    teamId: player.teamId,
    team: player.team,
    goals: player.goals,
    assists: player.assists,
    matchesPlayed: player.matchesPlayed,
    goalsPerMatch:
      player.matchesPlayed > 0
        ? Math.round((player.goals / player.matchesPlayed) * 100) / 100
        : 0,
  }));

  return { players, teams };
}
