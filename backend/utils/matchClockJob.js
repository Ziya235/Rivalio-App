import { prisma } from "../config/db.js";
import { onChampionshipMatchFinished } from "../services/championshipService.js";
import { persistIfClockExpired } from "./matchClock.js";

let started = false;

export async function syncExpiredMatchClocks() {
  const now = new Date();
  const candidates = await prisma.match.findMany({
    where: {
      lockedAt: null,
      startedAt: { not: null },
      status: { in: ["LIVE", "FINISHED"] },
    },
    select: {
      id: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      reopenedAt: true,
      lockedAt: true,
      editUntil: true,
      championshipId: true,
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
      const result = await persistIfClockExpired(match, now);
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

