import { prisma } from "../config/db.js";

/**
 * Auto-expire / delete past open challenges, player searches, and unplayed friendlies.
 */
export const expirePastListings = async () => {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.challenge.updateMany({
      where: {
        status: "OPEN",
        scheduledAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    });

    await tx.playerSearch.updateMany({
      where: {
        status: { in: ["OPEN", "FULL"] },
        scheduledAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    });

    // Remove every challenge at kickoff time and cascade its notifications.
    await tx.challenge.deleteMany({
      where: {
        scheduledAt: { lt: now },
      },
    });

    // Delete expired player searches without a finished match
    await tx.playerSearch.deleteMany({
      where: {
        status: "EXPIRED",
      },
    });

    // Auto-remove past scheduled friendlies that never started
    await tx.match.deleteMany({
      where: {
        matchType: "FRIENDLY",
        status: "SCHEDULED",
        scheduledAt: { lt: now },
        leagueId: null,
      },
    });
  });
};

let started = false;

export const startExpireJob = (intervalMs = 60_000) => {
  if (started) return;
  started = true;

  const run = () => {
    expirePastListings().catch((err) => {
      console.log("Error in expirePastListings:", err);
    });
  };

  run();
  setInterval(run, intervalMs);
};
