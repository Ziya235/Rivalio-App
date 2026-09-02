/**
 * Pure single-elimination bracket helpers for championship playoffs.
 * Mirrors frontend/src/lib/playoffBracket.ts for non-power-of-2 team counts.
 */

/** Allowed roster sizes for PLAYOFF_ONLY championships (1/8 → 1/4 → 1/2 → final). */
export const PLAYOFF_ONLY_SIZES = [4, 8, 16];

export function previousPowerOfTwo(n) {
  if (n < 1) return 1;
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p;
}

export function isPowerOfTwo(n) {
  return n >= 2 && (n & (n - 1)) === 0;
}

export function stageForBracketSize(size, isPrelim = false) {
  if (isPrelim) return "PRELIMINARY";
  switch (size) {
    case 2:
      return "FINAL";
    case 4:
      return "SEMI_FINAL";
    case 8:
      return "QUARTER_FINAL";
    case 16:
      return "ROUND_OF_16";
    default:
      return size > 16 ? "ROUND_OF_16" : "PRELIMINARY";
  }
}

export function nextStageAfter(stage) {
  switch (stage) {
    case "PRELIMINARY":
      return "SEMI_FINAL";
    case "ROUND_OF_16":
      return "QUARTER_FINAL";
    case "QUARTER_FINAL":
      return "SEMI_FINAL";
    case "SEMI_FINAL":
      return "FINAL";
    default:
      return null;
  }
}

export function groupLetterFromName(name, fallbackIndex = 0) {
  const m = String(name || "").match(/\b([A-Da-d])\b/);
  if (m) return m[1].toUpperCase();
  return String.fromCharCode(65 + fallbackIndex);
}

/** points → GD → GF → wins. 0 means still tied. Higher is better (sort ascending). */
export function standingStatLine(team) {
  const points = Number(team?.points) || 0;
  const goalsFor = Number(team?.goalsFor ?? team?.goalsScored) || 0;
  const goalsAgainst = Number(team?.goalsAgainst) || 0;
  const goalDiff = Number(
    team?.goalDiff ??
      team?.goalDifference ??
      goalsFor - goalsAgainst,
  );
  const won = Number(team?.won ?? team?.wins) || 0;
  return { points, goalDiff, goalsFor, goalsAgainst, won };
}

/**
 * Playoff ranking: points → GD → GF → wins.
 * Next criterion is used only when the previous one is fully equal.
 * Returns 0 when all four are equal (admin tie-break required; never random).
 */
export function compareStandingStats(a, b) {
  const left = standingStatLine(a);
  const right = standingStatLine(b);
  if (left.points !== right.points) return right.points - left.points;
  if (left.goalDiff !== right.goalDiff) return right.goalDiff - left.goalDiff;
  if (left.goalsFor !== right.goalsFor) return right.goalsFor - left.goalsFor;
  if (left.won !== right.won) return right.won - left.won;
  return 0;
}

/**
 * 3-group seeding: rank the three 1sts among themselves, then the three 2nds.
 * 1sts always occupy #1–#3; 2nds always occupy #4–#6.
 */
export function rankThreeGroupPlayoffSeeds(winners, runnersUp, tieBreakTeamIds = []) {
  if (!Array.isArray(winners) || winners.length !== 3) {
    const error = new Error("3 qrup üçün üç 1-ci yer lazımdır");
    error.status = 400;
    throw error;
  }
  if (!Array.isArray(runnersUp) || runnersUp.length !== 3) {
    const error = new Error("3 qrup üçün üç 2-ci yer lazımdır");
    error.status = 400;
    throw error;
  }
  const rankedWinners = assertResolvedTies(
    winners,
    "Qrup qalibləri (1-ci yerlər)",
    tieBreakTeamIds,
  );
  const rankedRunners = assertResolvedTies(
    runnersUp,
    "İkinci yerlər",
    tieBreakTeamIds,
  );
  return [
    ...rankedWinners.map((team, index) => ({
      ...team,
      seed: index + 1,
      groupPosition: 1,
      directToSemiFinal: index < 2,
      label: `#${index + 1}`,
    })),
    ...rankedRunners.map((team, index) => ({
      ...team,
      seed: index + 4,
      groupPosition: 2,
      directToSemiFinal: false,
      label: `#${index + 4}`,
    })),
  ];
}

export function playoffNotes(meta) {
  return JSON.stringify({ playoff: true, ...meta });
}

export function parsePlayoffNotes(raw) {
  try {
    const parsed = JSON.parse(raw || "");
    if (parsed && parsed.playoff) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function tiesError(groups) {
  const titles = groups.map((g) => g.title).join("; ");
  const names = groups
    .flatMap((g) => g.teams.map((t) => t.name || t.team?.name || `#${t.teamId}`))
    .join(", ");
  const error = new Error(
    `Statistik bərabərlik var (${titles}). Administrator sıralamanı əl ilə təyin etməlidir: ${names}`,
  );
  error.status = 409;
  error.code = "PLAYOFF_TIE";
  error.ties = groups.map((g) => ({
    id: g.title,
    title: g.title,
    teams: g.teams.map((t) => ({
      teamId: t.teamId,
      name: t.name || t.team?.name || `Komanda ${t.teamId}`,
      points: t.points,
      goalDiff: t.goalDiff,
      goalsFor: t.goalsFor,
      won: t.won,
    })),
  }));
  return error;
}

function tieError(title, teams) {
  return tiesError([{ title, teams }]);
}

function tieIndex(teamId, tieBreakTeamIds) {
  const i = (tieBreakTeamIds || []).indexOf(teamId);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

function compareWithTieBreak(a, b, tieBreakTeamIds) {
  const stats = compareStandingStats(a, b);
  if (stats !== 0) return stats;
  return tieIndex(a.teamId, tieBreakTeamIds) - tieIndex(b.teamId, tieBreakTeamIds);
}

function collectStatTieGroups(sorted) {
  const groups = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && compareStandingStats(sorted[i], sorted[j]) === 0) {
      j += 1;
    }
    if (j - i > 1) groups.push(sorted.slice(i, j));
    i = j;
  }
  return groups;
}

function assertResolvedTies(list, title, tieBreakTeamIds) {
  const sorted = [...list].sort((a, b) =>
    compareWithTieBreak(a, b, tieBreakTeamIds),
  );
  const unresolved = collectStatTieGroups(sorted).filter((group) => {
    const indexes = group.map((t) => tieIndex(t.teamId, tieBreakTeamIds));
    const unique = new Set(indexes);
    return unique.size < group.length || indexes.some((i) => i === Number.MAX_SAFE_INTEGER);
  });
  if (unresolved.length > 0) {
    throw tiesError(unresolved.map((group) => ({ title, teams: group })));
  }
  return sorted;
}

/**
 * Pick group 1st and 2nd. Ties that affect those places require tie-break.
 */
export function pickGroupTopTwo(standings, groupName, tieBreakTeamIds = []) {
  if (!Array.isArray(standings) || standings.length < 2) {
    const error = new Error(
      `${groupName} üçün playoff-a keçmək üçün ən azı 2 komanda lazımdır`,
    );
    error.status = 400;
    throw error;
  }
  const sorted = [...standings].sort((a, b) =>
    compareWithTieBreak(a, b, tieBreakTeamIds),
  );
  for (let i = 0; i < Math.min(2, sorted.length - 1); i++) {
    if (compareStandingStats(sorted[i], sorted[i + 1]) !== 0) continue;
    const aIdx = tieIndex(sorted[i].teamId, tieBreakTeamIds);
    const bIdx = tieIndex(sorted[i + 1].teamId, tieBreakTeamIds);
    if (
      aIdx === bIdx ||
      aIdx === Number.MAX_SAFE_INTEGER ||
      bIdx === Number.MAX_SAFE_INTEGER
    ) {
      throw tieError(
        `${groupName} — 1-ci/2-ci yer`,
        [sorted[i], sorted[i + 1]].map((t) => ({
          ...t,
          name: t.name || t.team?.name,
        })),
      );
    }
  }
  if (sorted.length > 2 && compareStandingStats(sorted[1], sorted[2]) === 0) {
    const aIdx = tieIndex(sorted[1].teamId, tieBreakTeamIds);
    const bIdx = tieIndex(sorted[2].teamId, tieBreakTeamIds);
    if (
      aIdx === bIdx ||
      aIdx === Number.MAX_SAFE_INTEGER ||
      bIdx === Number.MAX_SAFE_INTEGER
    ) {
      throw tieError(
        `${groupName} — 2-ci yer üçün keçid`,
        [sorted[1], sorted[2]].map((t) => ({
          ...t,
          name: t.name || t.team?.name,
        })),
      );
    }
  }
  return { first: sorted[0], second: sorted[1] };
}

function seedEntry(team, seed, label, extra = {}) {
  return {
    seed,
    label,
    teamId: team.teamId,
    name: team.name || team.team?.name || null,
    directToSemiFinal: Boolean(extra.directToSemiFinal),
    groupRank: extra.groupRank ?? null,
  };
}

function plannedMatch({
  stage,
  slot,
  home,
  away,
  feeds,
  pairedWith = null,
}) {
  if (home.teamId === away.teamId) {
    const error = new Error("Playoff-da eyni komanda iki slotda ola bilməz");
    error.status = 400;
    throw error;
  }
  return {
    stage,
    slot,
    homeTeamId: home.teamId,
    awayTeamId: away.teamId,
    homeLabel: home.label,
    awayLabel: away.label,
    homeSeed: home.seed ?? null,
    awaySeed: away.seed ?? null,
    feeds: feeds || null,
    pairedWith,
  };
}

function assertUniqueTeamIds(ids) {
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) {
      const error = new Error("Playoff-da eyni komanda iki slotda ola bilməz");
      error.status = 400;
      throw error;
    }
    seen.add(id);
  }
}

/**
 * Group-count playoff plan (2 → SF/Final, 3 → Prelim/SF/Final, 4 → QF/SF/Final).
 * @param {Array<{ letter: string, name: string, first: object, second: object }>} groups
 */
export function buildGroupPlayoffPlan(groups, { tieBreakTeamIds = [] } = {}) {
  const n = groups.length;
  if (![2, 3, 4].includes(n)) {
    const error = new Error("Playoff 2, 3 və ya 4 qrup üçün avtomatik formalaşır");
    error.status = 400;
    throw error;
  }

  const used = [];
  const label = (letter, rank) => `${letter}${rank}`;
  const wrap = (row, letter, rank, seed) => ({
    teamId: row.teamId,
    name: row.name || row.team?.name,
    seed,
    label: label(letter, rank),
    points: row.points,
    goalDiff: row.goalDiff,
    goalsFor: row.goalsFor,
    won: row.won,
  });

  if (n === 2) {
    const [A, B] = groups;
    const a1 = wrap(A.first, A.letter, 1, null);
    const a2 = wrap(A.second, A.letter, 2, null);
    const b1 = wrap(B.first, B.letter, 1, null);
    const b2 = wrap(B.second, B.letter, 2, null);
    used.push(a1.teamId, a2.teamId, b1.teamId, b2.teamId);
    assertUniqueTeamIds(used);
    return {
      format: "SF_FINAL",
      groupCount: 2,
      seeds: [
        seedEntry(a1, null, a1.label, { groupRank: 1 }),
        seedEntry(b1, null, b1.label, { groupRank: 1 }),
        seedEntry(a2, null, a2.label, { groupRank: 2 }),
        seedEntry(b2, null, b2.label, { groupRank: 2 }),
      ],
      createNow: [
        plannedMatch({
          stage: "SEMI_FINAL",
          slot: 0,
          home: a1,
          away: b2,
          feeds: { stage: "FINAL", slot: 0, side: "home" },
        }),
        plannedMatch({
          stage: "SEMI_FINAL",
          slot: 1,
          home: b1,
          away: a2,
          feeds: { stage: "FINAL", slot: 0, side: "away" },
        }),
      ],
    };
  }

  if (n === 4) {
    const [A, B, C, D] = groups;
    const a1 = wrap(A.first, A.letter, 1, null);
    const a2 = wrap(A.second, A.letter, 2, null);
    const b1 = wrap(B.first, B.letter, 1, null);
    const b2 = wrap(B.second, B.letter, 2, null);
    const c1 = wrap(C.first, C.letter, 1, null);
    const c2 = wrap(C.second, C.letter, 2, null);
    const d1 = wrap(D.first, D.letter, 1, null);
    const d2 = wrap(D.second, D.letter, 2, null);
    used.push(
      a1.teamId, a2.teamId, b1.teamId, b2.teamId,
      c1.teamId, c2.teamId, d1.teamId, d2.teamId,
    );
    assertUniqueTeamIds(used);
    return {
      format: "QF_SF_FINAL",
      groupCount: 4,
      seeds: [a1, b1, c1, d1, a2, b2, c2, d2].map((s) =>
        seedEntry(s, null, s.label, { groupRank: s.label.endsWith("1") ? 1 : 2 }),
      ),
      createNow: [
        plannedMatch({
          stage: "QUARTER_FINAL",
          slot: 0,
          home: a1,
          away: b2,
          feeds: { stage: "SEMI_FINAL", slot: 0, side: "home" },
        }),
        plannedMatch({
          stage: "QUARTER_FINAL",
          slot: 1,
          home: b1,
          away: a2,
          feeds: { stage: "SEMI_FINAL", slot: 0, side: "away" },
        }),
        plannedMatch({
          stage: "QUARTER_FINAL",
          slot: 2,
          home: c1,
          away: d2,
          feeds: { stage: "SEMI_FINAL", slot: 1, side: "home" },
        }),
        plannedMatch({
          stage: "QUARTER_FINAL",
          slot: 3,
          home: d1,
          away: c2,
          feeds: { stage: "SEMI_FINAL", slot: 1, side: "away" },
        }),
      ],
    };
  }

  const ranked = rankThreeGroupPlayoffSeeds(
    groups.map((g) => ({
      ...g.first,
      name: g.first.name || g.first.team?.name,
      letter: g.letter,
      groupName: g.name,
    })),
    groups.map((g) => ({
      ...g.second,
      name: g.second.name || g.second.team?.name,
      letter: g.letter,
      groupName: g.name,
    })),
    tieBreakTeamIds,
  );

  assertUniqueTeamIds(ranked.map((s) => s.teamId));

  const s = (nSeed) => {
    const row = ranked.find((x) => x.seed === nSeed);
    return { teamId: row.teamId, seed: row.seed, label: row.label, name: row.name };
  };

  return {
    format: "PRELIM_SF_FINAL",
    groupCount: 3,
    seeds: ranked,
    createNow: [
      plannedMatch({
        stage: "PRELIMINARY",
        slot: 0,
        home: s(3),
        away: s(6),
        feeds: { stage: "SEMI_FINAL", slot: 1, side: "away" },
        pairedWith: { ...s(2), directToSemiFinal: true },
      }),
      plannedMatch({
        stage: "PRELIMINARY",
        slot: 1,
        home: s(4),
        away: s(5),
        feeds: { stage: "SEMI_FINAL", slot: 0, side: "away" },
        pairedWith: { ...s(1), directToSemiFinal: true },
      }),
    ],
  };
}

/** PLAYOFF_ONLY 4/8/16 — sequential seeds, no preliminary. */
export function buildLinearPlayoffPlan(teamIds) {
  const n = teamIds.length;
  if (!PLAYOFF_ONLY_SIZES.includes(n)) {
    const error = new Error(
      "Playoff-only championship requires exactly 4, 8, or 16 teams",
    );
    error.status = 400;
    throw error;
  }
  const stage = stageForBracketSize(n);
  const next = nextStageAfter(stage);
  const seeds = teamIds.map((teamId, i) =>
    seedEntry({ teamId }, i + 1, `#${i + 1}`),
  );
  const createNow = [];
  for (let i = 0; i < n / 2; i++) {
    createNow.push(
      plannedMatch({
        stage,
        slot: i,
        home: { teamId: teamIds[i * 2], seed: i * 2 + 1, label: `#${i * 2 + 1}` },
        away: {
          teamId: teamIds[i * 2 + 1],
          seed: i * 2 + 2,
          label: `#${i * 2 + 2}`,
        },
        feeds: next
          ? {
              stage: next,
              slot: Math.floor(i / 2),
              side: i % 2 === 0 ? "home" : "away",
            }
          : null,
      }),
    );
  }
  return { format: "LINEAR", groupCount: 0, seeds, createNow };
}

/**
 * Build ordered pairing plan for playoff matches.
 * Returns rounds of { stage, pairings: [{ homeTeamId|null, awayTeamId|null, homeFrom|null, awayFrom|null, bye }] }
 * Concrete team IDs are set for first appearance; later rounds use placeholders via homeFrom/awayFrom match indices.
 *
 * Simplified approach used by service: generate concrete first-round slots (teams + byes),
 * then create subsequent rounds as TBD matches linked only by stage/round order.
 */
/**
 * @param {number[]} teamIds
 * @param {{ strictPowerOfTwo?: boolean }} [opts]
 *   strictPowerOfTwo — PLAYOFF_ONLY: only 4/8/16, no preliminary round
 */
export function buildPlayoffSeeding(teamIds, { strictPowerOfTwo = false } = {}) {
  const n = teamIds.length;
  if (n < 2) {
    const error = new Error("Playoff requires at least 2 teams");
    error.status = 400;
    throw error;
  }

  if (strictPowerOfTwo) {
    if (!PLAYOFF_ONLY_SIZES.includes(n)) {
      const error = new Error(
        "Playoff-only championship requires exactly 4, 8, or 16 teams",
      );
      error.status = 400;
      throw error;
    }
  }

  const seeded = [...teamIds];
  let prelimPairs = [];
  let mainSeeds = [];

  if (isPowerOfTwo(n)) {
    mainSeeds = seeded.map((id) => ({ kind: "team", teamId: id }));
  } else {
    if (strictPowerOfTwo) {
      const error = new Error(
        "Playoff-only championship requires exactly 4, 8, or 16 teams",
      );
      error.status = 400;
      throw error;
    }
    const mainSize = previousPowerOfTwo(n);
    const prelimMatchCount = n - mainSize;
    const prelimTeamCount = prelimMatchCount * 2;
    const byeCount = n - prelimTeamCount;

    const byeTeams = seeded.slice(0, byeCount);
    const prelimTeams = seeded.slice(byeCount);

    for (let i = 0; i < prelimMatchCount; i++) {
      const home = prelimTeams[i];
      const away = prelimTeams[prelimTeamCount - 1 - i];
      if (!home || !away || home === away) {
        const error = new Error("Invalid preliminary pairing");
        error.status = 500;
        throw error;
      }
      prelimPairs.push({ homeTeamId: home, awayTeamId: away });
    }

    mainSeeds = [
      ...byeTeams.map((id) => ({ kind: "team", teamId: id })),
      ...prelimPairs.map((_, i) => ({ kind: "winner", prelimIndex: i })),
    ];
  }

  return {
    teamCount: n,
    prelimPairs,
    mainSeeds,
    mainBracketSize: mainSeeds.length,
  };
}

/** Balanced group slot sizes for teamCount across groupCount groups. */
export function distributeGroupSlots(teamCount, groupCount) {
  if (groupCount < 1) {
    const error = new Error("Group count must be at least 1");
    error.status = 400;
    throw error;
  }
  if (teamCount < groupCount * 2 && teamCount > 0) {
    // allow smaller for draft; caller validates min 2 per group when starting
  }
  const base = Math.floor(teamCount / groupCount);
  const rem = teamCount % groupCount;
  return Array.from({ length: groupCount }, (_, i) => base + (i < rem ? 1 : 0));
}

/** Circle-method single round-robin pairings per round. */
export function buildRoundRobinPairings(teamIds) {
  if (teamIds.length < 2) {
    const error = new Error("Round-robin requires at least 2 teams");
    error.status = 400;
    throw error;
  }

  const ids = [...teamIds];
  const hasBye = ids.length % 2 === 1;
  const slots = hasBye ? [...ids, null] : [...ids];
  const n = slots.length;
  const roundCount = n - 1;
  const matchesPerRound = n / 2;
  let rotating = [...slots];
  const rounds = [];

  for (let r = 0; r < roundCount; r++) {
    const pairings = [];
    for (let i = 0; i < matchesPerRound; i++) {
      const a = rotating[i];
      const b = rotating[n - 1 - i];
      if (a == null || b == null) continue;
      const swap = r % 2 === 1;
      pairings.push(
        swap
          ? { homeTeamId: b, awayTeamId: a }
          : { homeTeamId: a, awayTeamId: b },
      );
    }
    rounds.push({ round: r + 1, pairings });
    const fixed = rotating[0];
    const rest = rotating.slice(1);
    rest.unshift(rest.pop());
    rotating = [fixed, ...rest];
  }

  return rounds;
}

/**
 * Group-stage fixtures: single round-robin, or home-and-away (two legs per pairing).
 * @param {number[]} teamIds
 * @param {{ homeAway?: boolean }} [opts]
 */
export function buildGroupFixtures(teamIds, { homeAway = false } = {}) {
  const first = buildRoundRobinPairings(teamIds);
  if (!homeAway) return first;
  const offset = first.length;
  const returnLegs = first.map((round) => ({
    round: round.round + offset,
    pairings: round.pairings.map((p) => ({
      homeTeamId: p.awayTeamId,
      awayTeamId: p.homeTeamId,
    })),
  }));
  return [...first, ...returnLegs];
}
