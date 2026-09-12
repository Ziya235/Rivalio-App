import { prisma } from "../config/db.js";
import { onChampionshipMatchFinished } from "../services/championshipService.js";
import { MATCH_CLOCK_MAX_MS } from "./matchEditPolicy.js";
import { persistIfClockExpired } from "./matchClock.js";

let started = false;

export async function syncExpiredMatchClocks() {
  const cutoff = new Date(Date.now() - MATCH_CLOCK_MAX_MS);
  const candidates = await prisma.match.findMany({
    where: {
      status: "LIVE",
      startedAt: { lte: cutoff },
    },
    select: {
      id: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      reopenedAt: true,
      lockedAt: true,
      championshipId: true,
      leagueId: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      minute: true,
      statsApplied: true,
    },
  });

  for (const match of candidates) {
    try {
      const result = await persistIfClockExpired(match);
      if (result.championshipFinished) {
        await onChampionshipMatchFinished(match.id);
      }
    } catch (err) {
      console.log("Error syncing match clock:", match.id, err);
    }
  }
}

export const startMatchClockJob = (intervalMs = 30000) => {
  if (started) return;
  started = true;

  const run = () => {
    syncExpiredMatchClocks().catch((err) => {
      console.log("Error in syncExpiredMatchClocks:", err);
    });
  };

  run();
  setInterval(run, intervalMs);
};
