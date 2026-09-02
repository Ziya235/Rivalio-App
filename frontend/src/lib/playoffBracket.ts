/**
 * Flexible single-elimination playoff bracket for any team count ≥ 2.
 * Non-power-of-2 sizes use a Preliminary / Play-in round + byes so the
 * main bracket is always a clean power of 2 (2 → 4 → 8 → 16 …).
 */

import type { GroupStandingsBlock, StandingRow } from "../types/championship";

export type BracketTeam = {
  id: string;
  name: string;
};

export type BracketParticipant =
  | { kind: "team"; teamId: string; teamName: string }
  | { kind: "bye" }
  | { kind: "winner"; fromMatchId: string; label: string };

export type BracketMatch = {
  id: string;
  roundIndex: number;
  roundName: string;
  matchIndex: number;
  home: BracketParticipant;
  away: BracketParticipant;
};

export type BracketRound = {
  name: string;
  matches: BracketMatch[];
};

export type PlayoffBracket = {
  teamCount: number;
  mainBracketSize: number;
  prelimMatchCount: number;
  byeCount: number;
  rounds: BracketRound[];
  /** Flat list of all matches in round order */
  matches: BracketMatch[];
};

function isPowerOfTwo(n: number): boolean {
  return n >= 2 && (n & (n - 1)) === 0;
}

/** Largest power of 2 that is ≤ n (for n ≥ 1). */
export function previousPowerOfTwo(n: number): number {
  if (n < 1) return 1;
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p;
}

/** Smallest power of 2 that is ≥ n (for n ≥ 1). */
export function nextPowerOfTwo(n: number): number {
  if (n < 1) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function roundNameForSize(size: number, isPrelim = false): string {
  if (isPrelim) return "Preliminary Round";
  switch (size) {
    case 2:
      return "Final";
    case 4:
      return "Semi Final";
    case 8:
      return "Quarter Final";
    case 16:
      return "Round of 16";
    case 32:
      return "Round of 32";
    default:
      return `Round of ${size}`;
  }
}

function assertUniqueTeams(teams: BracketTeam[]): void {
  const seen = new Set<string>();
  for (const t of teams) {
    if (!t.id || !t.name?.trim()) {
      throw new Error("Bracket cannot include undefined or empty teams.");
    }
    if (seen.has(t.id)) {
      throw new Error(`Duplicate team in bracket: ${t.name}`);
    }
    seen.add(t.id);
  }
}

function teamSlot(team: BracketTeam): BracketParticipant {
  return { kind: "team", teamId: team.id, teamName: team.name };
}

function winnerSlot(fromMatchId: string, roundLabel: string, matchNum: number): BracketParticipant {
  return {
    kind: "winner",
    fromMatchId,
    label: `Winner of ${roundLabel} #${matchNum}`,
  };
}

/**
 * Build a single-elimination bracket.
 * Higher-seeded teams (earlier in the list) receive byes when needed.
 */
export function buildPlayoffBracket(teams: BracketTeam[]): PlayoffBracket {
  assertUniqueTeams(teams);

  const n = teams.length;
  if (n < 2) {
    throw new Error("Playoff requires at least 2 teams.");
  }

  const seeded = [...teams];
  const matches: BracketMatch[] = [];
  const rounds: BracketRound[] = [];

  let prelimMatchCount = 0;
  let byeCount = 0;
  let mainBracketSize = n;
  let advancing: BracketParticipant[];

  if (isPowerOfTwo(n)) {
    advancing = seeded.map(teamSlot);
  } else {
    // Classic FIFA-style: prelim to reach previous power of 2
    mainBracketSize = previousPowerOfTwo(n);
    prelimMatchCount = n - mainBracketSize;
    const prelimTeamCount = prelimMatchCount * 2;
    byeCount = n - prelimTeamCount;

    const byeTeams = seeded.slice(0, byeCount);
    const prelimTeams = seeded.slice(byeCount);

    if (prelimTeams.length !== prelimTeamCount) {
      throw new Error("Internal error: preliminary team count mismatch.");
    }

    const prelimName = roundNameForSize(0, true);
    const prelimMatches: BracketMatch[] = [];

    for (let i = 0; i < prelimMatchCount; i++) {
      const home = prelimTeams[i];
      const away = prelimTeams[prelimTeamCount - 1 - i];
      if (!home || !away || home.id === away.id) {
        throw new Error("Internal error: invalid preliminary pairing.");
      }
      const id = `r0-m${i}`;
      const match: BracketMatch = {
        id,
        roundIndex: 0,
        roundName: prelimName,
        matchIndex: i,
        home: teamSlot(home),
        away: teamSlot(away),
      };
      prelimMatches.push(match);
      matches.push(match);
    }

    rounds.push({ name: prelimName, matches: prelimMatches });

    // Byes first (higher seeds), then prelim winners in order
    advancing = [
      ...byeTeams.map(teamSlot),
      ...prelimMatches.map((m, i) => winnerSlot(m.id, prelimName, i + 1)),
    ];

    if (advancing.length !== mainBracketSize) {
      throw new Error("Internal error: advancing slot count mismatch.");
    }
  }

  // Standard power-of-2 rounds from mainBracketSize down to Final
  let current = advancing;
  let size = mainBracketSize;
  let roundIndex = rounds.length;

  while (size >= 2) {
    const name = roundNameForSize(size);
    const matchCount = size / 2;
    const roundMatches: BracketMatch[] = [];
    const nextAdvancing: BracketParticipant[] = [];

    for (let i = 0; i < matchCount; i++) {
      const home = current[i * 2];
      const away = current[i * 2 + 1];
      if (!home || !away) {
        throw new Error(`Empty match slot in ${name}.`);
      }
      // Never pair a team against itself
      if (
        home.kind === "team" &&
        away.kind === "team" &&
        home.teamId === away.teamId
      ) {
        throw new Error(`Duplicate pairing for ${home.teamName}.`);
      }

      const id = `r${roundIndex}-m${i}`;
      const match: BracketMatch = {
        id,
        roundIndex,
        roundName: name,
        matchIndex: i,
        home,
        away,
      };
      roundMatches.push(match);
      matches.push(match);
      nextAdvancing.push(winnerSlot(id, name, i + 1));
    }

    rounds.push({ name, matches: roundMatches });
    current = nextAdvancing;
    size /= 2;
    roundIndex += 1;
  }

  // Sanity: every real team appears exactly once as a concrete participant
  const placed = new Set<string>();
  for (const m of matches) {
    for (const side of [m.home, m.away]) {
      if (side.kind === "team") {
        if (placed.has(side.teamId)) {
          throw new Error(`Team appears twice in bracket: ${side.teamName}`);
        }
        placed.add(side.teamId);
      }
    }
  }
  if (placed.size !== n) {
    throw new Error(
      `Bracket team count mismatch: expected ${n}, placed ${placed.size}.`,
    );
  }

  return {
    teamCount: n,
    mainBracketSize,
    prelimMatchCount,
    byeCount,
    rounds,
    matches,
  };
}

export function participantLabel(p: BracketParticipant): string {
  switch (p.kind) {
    case "team":
      return p.teamName;
    case "bye":
      return "BYE";
    case "winner":
      return p.label;
  }
}

/** Keep in sync with backend/utils/championshipBracket.js */

export function groupLetterFromName(name: string, fallbackIndex = 0): string {
  const m = String(name || "").match(/\b([A-Da-d])\b/);
  if (m) return m[1].toUpperCase();
  return String.fromCharCode(65 + fallbackIndex);
}

export function standingStatLine(team: {
  points?: number;
  goalDiff?: number;
  goalDifference?: number;
  goalsFor?: number;
  goalsScored?: number;
  goalsAgainst?: number;
  won?: number;
  wins?: number;
}): {
  points: number;
  goalDiff: number;
  goalsFor: number;
  goalsAgainst: number;
  won: number;
} {
  const points = Number(team?.points) || 0;
  const goalsFor = Number(team?.goalsFor ?? team?.goalsScored) || 0;
  const goalsAgainst = Number(team?.goalsAgainst) || 0;
  const goalDiff = Number(
    team?.goalDiff ?? team?.goalDifference ?? goalsFor - goalsAgainst,
  );
  const won = Number(team?.won ?? team?.wins) || 0;
  return { points, goalDiff, goalsFor, goalsAgainst, won };
}

export function compareStandingStats(
  a: Parameters<typeof standingStatLine>[0],
  b: Parameters<typeof standingStatLine>[0],
): number {
  const left = standingStatLine(a);
  const right = standingStatLine(b);
  if (left.points !== right.points) return right.points - left.points;
  if (left.goalDiff !== right.goalDiff) return right.goalDiff - left.goalDiff;
  if (left.goalsFor !== right.goalsFor) return right.goalsFor - left.goalsFor;
  if (left.won !== right.won) return right.won - left.won;
  return 0;
}

export type PlayoffMatchMeta = {
  playoff: true;
  slot?: number;
  homeLabel?: string | null;
  awayLabel?: string | null;
  homeSeed?: number | null;
  awaySeed?: number | null;
  pairedWith?: {
    teamId: number;
    seed?: number | null;
    label?: string | null;
    directToSemiFinal?: boolean;
  } | null;
  feeds?: {
    stage?: string;
    slot?: number;
    side?: "home" | "away";
  } | null;
};

export function parsePlayoffNotes(
  raw: string | null | undefined,
): PlayoffMatchMeta | null {
  try {
    const parsed = JSON.parse(raw || "");
    if (parsed && parsed.playoff) return parsed as PlayoffMatchMeta;
  } catch {
    /* ignore */
  }
  return null;
}

export type PlayoffPairingLine = {
  stage: "PRELIMINARY" | "QUARTER_FINAL" | "SEMI_FINAL";
  homeLabel: string;
  awayLabel: string;
  homeName?: string;
  awayName?: string;
  note?: string;
};

export type GroupPlayoffPreview = {
  groupCount: 2 | 3 | 4;
  formatLabel: string;
  seeds: Array<{
    seed: number | null;
    label: string;
    teamId: number;
    name: string;
    directToSemiFinal?: boolean;
    points?: number;
    goalDiff?: number;
    goalsFor?: number;
    goalsAgainst?: number;
    won?: number;
  }>;
  lines: PlayoffPairingLine[];
};

export function rankRows(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => {
    const byStats = compareStandingStats(a, b);
    if (byStats !== 0) return byStats;
    return a.team.name.localeCompare(b.team.name, "az");
  });
}

export function statsTied(a: StandingRow, b: StandingRow): boolean {
  return compareStandingStats(a, b) === 0;
}

export function qualifiedGroupsFromStandings(
  blocks: GroupStandingsBlock[],
): {
  groups: Array<{
    name: string;
    letter: string;
    first: {
      teamId: number;
      name: string;
      points?: number;
      goalDiff?: number;
      goalsFor?: number;
      goalsAgainst?: number;
      won?: number;
    };
    second: {
      teamId: number;
      name: string;
      points?: number;
      goalDiff?: number;
      goalsFor?: number;
      goalsAgainst?: number;
      won?: number;
    };
  }>;
  ties: string[];
} | null {
  if (blocks.length !== 2 && blocks.length !== 3 && blocks.length !== 4) {
    return null;
  }
  const ties: string[] = [];
  const groups = blocks.map((block, index) => {
    const ranked = rankRows(block.standings);
    if (ranked.length < 2) {
      ties.push(`${block.groupName}: 2 komanda yoxdur`);
      return null;
    }
    if (statsTied(ranked[0], ranked[1])) {
      ties.push(`${block.groupName}: 1-ci/2-ci yer bərabərdir`);
    }
    if (ranked[2] && statsTied(ranked[1], ranked[2])) {
      ties.push(`${block.groupName}: 2-ci yer üçün keçid bərabərdir`);
    }
    return {
      name: block.groupName,
      letter: groupLetterFromName(block.groupName, index),
      first: { teamId: ranked[0].teamId, name: ranked[0].team.name },
      second: { teamId: ranked[1].teamId, name: ranked[1].team.name },
      firstRow: ranked[0],
      secondRow: ranked[1],
    };
  });
  if (groups.some((g) => g == null)) return { groups: [], ties };

  const ready = groups as NonNullable<(typeof groups)[number]>[];

  if (ready.length === 3) {
    const winners = [...ready].sort((a, b) =>
      compareStandingStats(a.firstRow, b.firstRow),
    );
    const runners = [...ready].sort((a, b) =>
      compareStandingStats(a.secondRow, b.secondRow),
    );
    for (let i = 0; i < 2; i++) {
      if (statsTied(winners[i].firstRow, winners[i + 1].firstRow)) {
        ties.push("Qrup qalibləri arasında bərabərlik");
        break;
      }
    }
    for (let i = 0; i < 2; i++) {
      if (statsTied(runners[i].secondRow, runners[i + 1].secondRow)) {
        ties.push("İkinci yerlər arasında bərabərlik");
        break;
      }
    }
    return {
      groups: [
        {
          name: winners[0].name,
          letter: winners[0].letter,
          first: {
            ...winners[0].first,
            ...standingStatLine(winners[0].firstRow),
          },
          second: {
            ...runners[0].second,
            ...standingStatLine(runners[0].secondRow),
          },
        },
        {
          name: winners[1].name,
          letter: winners[1].letter,
          first: {
            ...winners[1].first,
            ...standingStatLine(winners[1].firstRow),
          },
          second: {
            ...runners[1].second,
            ...standingStatLine(runners[1].secondRow),
          },
        },
        {
          name: winners[2].name,
          letter: winners[2].letter,
          first: {
            ...winners[2].first,
            ...standingStatLine(winners[2].firstRow),
          },
          second: {
            ...runners[2].second,
            ...standingStatLine(runners[2].secondRow),
          },
        },
      ],
      ties: [...new Set(ties)],
    };
  }

  return {
    groups: ready.map((g) => ({
      name: g.name,
      letter: g.letter,
      first: g.first,
      second: g.second,
    })),
    ties: [...new Set(ties)],
  };
}

export function previewGroupPlayoff(
  groups: Array<{
    name: string;
    letter: string;
    first: {
      teamId: number;
      name: string;
      points?: number;
      goalDiff?: number;
      goalsFor?: number;
      goalsAgainst?: number;
      won?: number;
    };
    second: {
      teamId: number;
      name: string;
      points?: number;
      goalDiff?: number;
      goalsFor?: number;
      goalsAgainst?: number;
      won?: number;
    };
  }>,
): GroupPlayoffPreview | null {
  const n = groups.length;
  if (n !== 2 && n !== 3 && n !== 4) return null;
  if (n === 2) {
    const [A, B] = groups;
    return {
      groupCount: 2,
      formatLabel: "Yarımfinal → Final",
      seeds: [
        { seed: null, label: `${A.letter}1`, teamId: A.first.teamId, name: A.first.name },
        { seed: null, label: `${B.letter}1`, teamId: B.first.teamId, name: B.first.name },
        { seed: null, label: `${A.letter}2`, teamId: A.second.teamId, name: A.second.name },
        { seed: null, label: `${B.letter}2`, teamId: B.second.teamId, name: B.second.name },
      ],
      lines: [
        {
          stage: "SEMI_FINAL",
          homeLabel: `${A.letter}1`,
          awayLabel: `${B.letter}2`,
          homeName: A.first.name,
          awayName: B.second.name,
        },
        {
          stage: "SEMI_FINAL",
          homeLabel: `${B.letter}1`,
          awayLabel: `${A.letter}2`,
          homeName: B.first.name,
          awayName: A.second.name,
        },
      ],
    };
  }
  if (n === 4) {
    const [A, B, C, D] = groups;
    return {
      groupCount: 4,
      formatLabel: "1/4 final → Yarımfinal → Final",
      seeds: [A, B, C, D].flatMap((g) => [
        { seed: null, label: `${g.letter}1`, teamId: g.first.teamId, name: g.first.name },
        { seed: null, label: `${g.letter}2`, teamId: g.second.teamId, name: g.second.name },
      ]),
      lines: [
        {
          stage: "QUARTER_FINAL",
          homeLabel: `${A.letter}1`,
          awayLabel: `${B.letter}2`,
          homeName: A.first.name,
          awayName: B.second.name,
        },
        {
          stage: "QUARTER_FINAL",
          homeLabel: `${B.letter}1`,
          awayLabel: `${A.letter}2`,
          homeName: B.first.name,
          awayName: A.second.name,
        },
        {
          stage: "QUARTER_FINAL",
          homeLabel: `${C.letter}1`,
          awayLabel: `${D.letter}2`,
          homeName: C.first.name,
          awayName: D.second.name,
        },
        {
          stage: "QUARTER_FINAL",
          homeLabel: `${D.letter}1`,
          awayLabel: `${C.letter}2`,
          homeName: D.first.name,
          awayName: C.second.name,
        },
      ],
    };
  }
  const rankedFirsts = groups.map((g) => g.first);
  const rankedSeconds = groups.map((g) => g.second);
  if (rankedFirsts.length !== 3 || rankedSeconds.length !== 3) return null;
  const withStats = (
    team: (typeof rankedFirsts)[number],
    seed: number,
    directToSemiFinal = false,
  ) => ({
    seed,
    label: `#${seed}`,
    teamId: team.teamId,
    name: team.name,
    directToSemiFinal,
    ...standingStatLine(team),
  });
  return {
    groupCount: 3,
    formatLabel: "Ön mərhələ → Yarımfinal → Final",
    seeds: [
      withStats(rankedFirsts[0], 1, true),
      withStats(rankedFirsts[1], 2, true),
      withStats(rankedFirsts[2], 3),
      withStats(rankedSeconds[0], 4),
      withStats(rankedSeconds[1], 5),
      withStats(rankedSeconds[2], 6),
    ],
    lines: [
      {
        stage: "PRELIMINARY",
        homeLabel: "#3",
        awayLabel: "#6",
        homeName: rankedFirsts[2].name,
        awayName: rankedSeconds[2].name,
      },
      {
        stage: "PRELIMINARY",
        homeLabel: "#4",
        awayLabel: "#5",
        homeName: rankedSeconds[0].name,
        awayName: rankedSeconds[1].name,
      },
      {
        stage: "SEMI_FINAL",
        homeLabel: "#1",
        awayLabel: "P2 qalibi",
        homeName: rankedFirsts[0].name,
        note: "birbaşa yarımfinal",
      },
      {
        stage: "SEMI_FINAL",
        homeLabel: "#2",
        awayLabel: "P1 qalibi",
        homeName: rankedFirsts[1].name,
        note: "birbaşa yarımfinal",
      },
    ],
  };
}
