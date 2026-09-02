/**
 * Circle-method single round-robin fixtures.
 * Each team plays every other team once. Odd team counts get a bye each round.
 */

export type RoundRobinTeam = {
  id: string;
  name: string;
};

export type RoundRobinPairing = {
  homeTeamId: string;
  awayTeamId: string;
};

export type RoundRobinRound = {
  round: number;
  pairings: RoundRobinPairing[];
  byeTeamId: string | null;
};

export type RoundRobinSchedule = {
  teamCount: number;
  roundCount: number;
  matchCount: number;
  rounds: RoundRobinRound[];
};

export type GroupMatchStatus =
  | "SCHEDULED"
  | "LIVE"
  | "FINISHED"
  | "CANCELLED"
  | "POSTPONED";

export type GroupMatchEventType =
  | "GOAL"
  | "OWN_GOAL"
  | "YELLOW_CARD"
  | "RED_CARD"
  | "SUBSTITUTION"
  | "NOTE";

export type GroupMatchEvent = {
  id: string;
  type: GroupMatchEventType;
  minute: number;
  teamId: string | null;
  playerName: string | null;
  assistName: string | null;
  playerInName: string | null;
  playerOutName: string | null;
  note: string | null;
};

export type GroupMatch = {
  id: string;
  groupId: string;
  round: number | null;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string;
  venue: string | null;
  status: GroupMatchStatus;
  homeScore: number;
  awayScore: number;
  minute: number | null;
  events: GroupMatchEvent[];
};

/**
 * Generate a single round-robin schedule.
 * Home/away alternates roughly by swapping sides on odd rounds for balance.
 */
export function buildRoundRobinSchedule(
  teams: RoundRobinTeam[],
): RoundRobinSchedule {
  if (teams.length < 2) {
    throw new Error("Round-robin requires at least 2 teams.");
  }

  const ids = teams.map((t) => t.id);
  const hasBye = ids.length % 2 === 1;
  const slots = hasBye ? [...ids, "__BYE__"] : [...ids];
  const n = slots.length;
  const roundCount = n - 1;
  const matchesPerRound = n / 2;

  const rounds: RoundRobinRound[] = [];
  let rotating = [...slots];

  for (let r = 0; r < roundCount; r++) {
    const pairings: RoundRobinPairing[] = [];
    let byeTeamId: string | null = null;

    for (let i = 0; i < matchesPerRound; i++) {
      const a = rotating[i];
      const b = rotating[n - 1 - i];
      if (a === "__BYE__") {
        byeTeamId = b === "__BYE__" ? null : b;
        continue;
      }
      if (b === "__BYE__") {
        byeTeamId = a;
        continue;
      }

      const swap = r % 2 === 1;
      pairings.push(
        swap
          ? { homeTeamId: b, awayTeamId: a }
          : { homeTeamId: a, awayTeamId: b },
      );
    }

    rounds.push({ round: r + 1, pairings, byeTeamId });

    const fixed = rotating[0];
    const rest = rotating.slice(1);
    rest.unshift(rest.pop()!);
    rotating = [fixed, ...rest];
  }

  const matchCount = rounds.reduce((s, round) => s + round.pairings.length, 0);
  const expected = (teams.length * (teams.length - 1)) / 2;
  if (matchCount !== expected) {
    throw new Error(
      `Fixture count mismatch: expected ${expected}, got ${matchCount}.`,
    );
  }

  return {
    teamCount: teams.length,
    roundCount,
    matchCount,
    rounds,
  };
}

export function createEmptyGroupMatch(partial: {
  id: string;
  groupId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string;
  round?: number | null;
  venue?: string | null;
}): GroupMatch {
  return {
    id: partial.id,
    groupId: partial.groupId,
    round: partial.round ?? null,
    homeTeamId: partial.homeTeamId,
    awayTeamId: partial.awayTeamId,
    scheduledAt: partial.scheduledAt,
    venue: partial.venue ?? null,
    status: "SCHEDULED",
    homeScore: 0,
    awayScore: 0,
    minute: null,
    events: [],
  };
}

/** Build scheduled matches for one group from a round-robin schedule. */
export function scheduleGroupMatches(opts: {
  groupId: string;
  schedule: RoundRobinSchedule;
  /** Base date for round 1; each next round +1 day */
  startDate?: Date;
  idFactory?: () => string;
}): GroupMatch[] {
  const start = opts.startDate ? new Date(opts.startDate) : new Date();
  start.setHours(18, 0, 0, 0);
  const makeId =
    opts.idFactory ??
    (() => `m-${Math.random().toString(36).slice(2, 10)}`);

  const matches: GroupMatch[] = [];
  for (const round of opts.schedule.rounds) {
    const when = new Date(start);
    when.setDate(start.getDate() + (round.round - 1));
    for (const p of round.pairings) {
      matches.push(
        createEmptyGroupMatch({
          id: makeId(),
          groupId: opts.groupId,
          homeTeamId: p.homeTeamId,
          awayTeamId: p.awayTeamId,
          scheduledAt: when.toISOString(),
          round: round.round,
        }),
      );
    }
  }
  return matches;
}

export type StandingRow = {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  rank: number;
};

export function computeStandings(
  teamIds: string[],
  teamNames: Map<string, string>,
  matches: GroupMatch[],
): StandingRow[] {
  const table = new Map<
    string,
    Omit<StandingRow, "rank" | "teamName" | "goalDiff">
  >();

  for (const id of teamIds) {
    table.set(id, {
      teamId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    });
  }

  for (const m of matches) {
    if (m.status !== "FINISHED") continue;
    const home = table.get(m.homeTeamId);
    const away = table.get(m.awayTeamId);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (m.homeScore < m.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const rows: StandingRow[] = [...table.values()].map((r) => ({
    ...r,
    teamName: teamNames.get(r.teamId) ?? r.teamId,
    goalDiff: r.goalsFor - r.goalsAgainst,
    rank: 0,
  }));

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName, "az");
  });

  rows.forEach((r, i) => {
    r.rank = i + 1;
  });

  return rows;
}

/** Apply a scoring event — returns updated match. */
export function applyMatchEvent(
  match: GroupMatch,
  event: Omit<GroupMatchEvent, "id"> & { id?: string },
): GroupMatch {
  const full: GroupMatchEvent = {
    id: event.id ?? `ev-${Math.random().toString(36).slice(2, 9)}`,
    type: event.type,
    minute: event.minute,
    teamId: event.teamId,
    playerName: event.playerName,
    assistName: event.assistName,
    playerInName: event.playerInName,
    playerOutName: event.playerOutName,
    note: event.note,
  };

  let homeScore = match.homeScore;
  let awayScore = match.awayScore;

  if (full.type === "GOAL" && full.teamId) {
    if (full.teamId === match.homeTeamId) homeScore += 1;
    else if (full.teamId === match.awayTeamId) awayScore += 1;
  } else if (full.type === "OWN_GOAL" && full.teamId) {
    // Own goal credits the opponent
    if (full.teamId === match.homeTeamId) awayScore += 1;
    else if (full.teamId === match.awayTeamId) homeScore += 1;
  }

  return {
    ...match,
    homeScore,
    awayScore,
    minute: Math.max(match.minute ?? 0, full.minute),
    events: [...match.events, full].sort((a, b) => a.minute - b.minute),
  };
}

export function removeMatchEvent(
  match: GroupMatch,
  eventId: string,
): GroupMatch {
  const event = match.events.find((e) => e.id === eventId);
  if (!event) return match;

  let homeScore = match.homeScore;
  let awayScore = match.awayScore;

  if (event.type === "GOAL" && event.teamId) {
    if (event.teamId === match.homeTeamId) homeScore = Math.max(0, homeScore - 1);
    else if (event.teamId === match.awayTeamId)
      awayScore = Math.max(0, awayScore - 1);
  } else if (event.type === "OWN_GOAL" && event.teamId) {
    if (event.teamId === match.homeTeamId) awayScore = Math.max(0, awayScore - 1);
    else if (event.teamId === match.awayTeamId)
      homeScore = Math.max(0, homeScore - 1);
  }

  return {
    ...match,
    homeScore,
    awayScore,
    events: match.events.filter((e) => e.id !== eventId),
  };
}
