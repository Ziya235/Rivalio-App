import { prisma } from "../config/db.js";
import {
  attachMatchPolicy,
  withMatchClock,
} from "./matchClock.js";
import { isStageLocked } from "./matchEditPolicy.js";

export function policyContextFromMatch(match, championshipMatches = []) {
  if (match?.leagueId) {
    return {
      kind: "league",
      leagueStatus: match.league?.status ?? null,
    };
  }
  if (match?.championshipId) {
    return {
      kind: "championship",
      championshipStatus: match.championship?.status ?? null,
      matches: championshipMatches,
    };
  }
  return { kind: "other" };
}

export async function loadChampionshipMatchSummaries(championshipIds) {
  const ids = [...new Set((championshipIds ?? []).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const rows = await prisma.match.findMany({
    where: { championshipId: { in: ids } },
    select: {
      id: true,
      championshipId: true,
      stage: true,
      status: true,
      startedAt: true,
    },
  });

  const byChamp = new Map();
  for (const row of rows) {
    const list = byChamp.get(row.championshipId) ?? [];
    list.push(row);
    byChamp.set(row.championshipId, list);
  }
  return byChamp;
}

export function enrichMatch(match, championshipMatches = [], now = new Date()) {
  if (!match) return match;
  const ctx = policyContextFromMatch(match, championshipMatches);
  const enriched = attachMatchPolicy(match, ctx, now);
  if (match.championshipId && match.stage) {
    enriched.stageLocked = isStageLocked(match.stage, ctx);
  }
  return enriched;
}

export async function enrichMatches(matches, now = new Date()) {
  const list = matches ?? [];
  const champIds = list
    .map((m) => m.championshipId)
    .filter(Boolean);
  const byChamp = await loadChampionshipMatchSummaries(champIds);
  return list.map((match) =>
    enrichMatch(
      match,
      match.championshipId ? byChamp.get(match.championshipId) ?? [] : [],
      now,
    ),
  );
}

export async function enrichOneMatch(match, now = new Date()) {
  if (!match) return match;
  if (!match.championshipId) {
    return enrichMatch(match, [], now);
  }
  const byChamp = await loadChampionshipMatchSummaries([match.championshipId]);
  return enrichMatch(
    match,
    byChamp.get(match.championshipId) ?? [],
    now,
  );
}

export function clockOnly(match, now = new Date()) {
  return withMatchClock(match, now);
}
