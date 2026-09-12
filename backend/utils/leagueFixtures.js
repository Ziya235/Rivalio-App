import { buildGroupFixtures } from "./championshipBracket.js";

export function buildLeagueMatchRows({
  leagueId,
  teamIds,
  homeAway,
  createdById,
}) {
  const rounds = buildGroupFixtures(teamIds, { homeAway });
  const rows = [];
  for (const round of rounds) {
    for (const pairing of round.pairings) {
      rows.push({
        leagueId,
        homeTeamId: pairing.homeTeamId,
        awayTeamId: pairing.awayTeamId,
        round: round.round,
        matchType: "LEAGUE",
        status: "SCHEDULED",
        scheduledAt: null,
        venue: null,
        createdById: createdById ?? null,
      });
    }
  }
  return rows;
}

export async function replaceLeagueSchedule(tx, {
  leagueId,
  teamIds,
  homeAway,
  createdById,
}) {
  const startedCount = await tx.match.count({
    where: {
      leagueId,
      matchType: "LEAGUE",
      status: { in: ["LIVE", "FINISHED"] },
    },
  });
  if (startedCount > 0) {
    const error = new Error(
      "Liqada artıq başlamış və ya bitmiş oyun var. Cədvəli yenidən yaratmaq olmaz.",
    );
    error.status = 409;
    throw error;
  }

  await tx.match.deleteMany({
    where: {
      leagueId,
      matchType: "LEAGUE",
      status: { in: ["SCHEDULED", "POSTPONED"] },
    },
  });

  const rows = buildLeagueMatchRows({
    leagueId,
    teamIds,
    homeAway,
    createdById,
  });
  if (rows.length > 0) {
    await tx.match.createMany({ data: rows });
  }
  return rows.length;
}
