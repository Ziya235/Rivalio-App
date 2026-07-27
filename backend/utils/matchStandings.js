import { prisma } from "../config/db.js";

export const emptyTeamStats = () => ({
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
});

export const sortStandings = (rows) => {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) {
      return b.goalDifference - a.goalDifference;
    }
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });
};

/**
 * Build standings from finished LEAGUE matches.
 */
export const computeLeagueStandings = async (leagueId) => {
  const memberships = await prisma.leagueTeam.findMany({
    where: { leagueId },
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
    orderBy: { team: { name: "asc" } },
  });

  const teams = memberships.map((m) => m.team);

  const statsByTeam = new Map(
    teams.map((team) => [team.id, emptyTeamStats()]),
  );

  const matches = await prisma.match.findMany({
    where: {
      leagueId,
      status: "FINISHED",
      matchType: "LEAGUE",
    },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
    },
  });

  for (const match of matches) {
    const home = statsByTeam.get(match.homeTeamId);
    const away = statsByTeam.get(match.awayTeamId);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (match.homeScore < match.awayScore) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }

    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  }

  return sortStandings(
    teams.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      shortName: team.shortName,
      logo: team.logo,
      ...statsByTeam.get(team.id),
    })),
  );
};

export const computeTeamForm = async (leagueId, teamId, limit = 5) => {
  const matches = await prisma.match.findMany({
    where: {
      leagueId,
      status: "FINISHED",
      matchType: "LEAGUE",
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      finishedAt: true,
      scheduledAt: true,
    },
    orderBy: [{ finishedAt: "desc" }, { scheduledAt: "desc" }],
    take: limit,
  });

  return matches
    .map((match) => {
      const isHome = match.homeTeamId === teamId;
      const gf = isHome ? match.homeScore : match.awayScore;
      const ga = isHome ? match.awayScore : match.homeScore;
      if (gf > ga) return "W";
      if (gf < ga) return "L";
      return "D";
    })
    .reverse();
};

export const getNextMatchForTeam = async (leagueId, teamId) => {
  const match = await prisma.match.findFirst({
    where: {
      leagueId,
      status: { in: ["SCHEDULED", "LIVE"] },
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      venue: true,
      homeTeam: { select: { id: true, name: true, logo: true } },
      awayTeam: { select: { id: true, name: true, logo: true } },
    },
  });

  return match;
};
