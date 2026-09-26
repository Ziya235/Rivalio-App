import { PLAYOFF_STAGES } from "./championshipUi";
import { buildLeagueRounds, type RoundStatus } from "./leagueRounds";
import type { ChampionshipFormat, ChampionshipStatus, MatchStage } from "../types/championship";
import type { Match } from "../types/match";

export type ChampionshipPhaseView = "group" | "group_complete" | "playoff" | "finished";

export type ChampionshipRound = {
  key: string;
  round: number;
  label: string;
  matches: Match[];
  status: RoundStatus;
};

export type ChampionshipRoundState = {
  phase: ChampionshipPhaseView;
  rounds: ChampionshipRound[];
  currentRound: ChampionshipRound | null;
  playoffStage: MatchStage | null;
  groupStageComplete: boolean;
};

const FINISHED_STATUSES: ChampionshipStatus[] = ["COMPLETED", "FINISHED", "CANCELLED"];

function isClosedMatch(match: Match): boolean {
  return match.status === "FINISHED" || match.status === "CANCELLED";
}

function isGroupMatch(match: Match): boolean {
  return !match.stage || match.stage === "GROUP_STAGE";
}

function isPlayoffStage(stage: string | null | undefined): stage is MatchStage {
  return Boolean(stage && stage !== "GROUP_STAGE" && PLAYOFF_STAGES.includes(stage as MatchStage));
}

function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort(
    (left, right) =>
      (left.groupId ?? 0) - (right.groupId ?? 0) || left.id - right.id,
  );
}

export function hasUnfinishedGroupMatches(matches: Match[]): boolean {
  return matches.some((match) => isGroupMatch(match) && !isClosedMatch(match));
}

export function buildChampionshipGroupRounds(matches: Match[]): ChampionshipRound[] {
  return buildLeagueRounds(matches.filter(isGroupMatch)).map((round) => ({
    key: round.key,
    round: round.round ?? 0,
    label: round.label,
    matches: sortMatches(round.matches),
    status: round.status,
  }));
}

function derivePlayoffStage(matches: Match[]): MatchStage | null {
  const playoff = matches.filter((match) => isPlayoffStage(match.stage));
  for (const stage of PLAYOFF_STAGES) {
    const rows = playoff.filter((match) => match.stage === stage);
    if (rows.some((match) => !isClosedMatch(match))) return stage;
  }
  for (let index = PLAYOFF_STAGES.length - 1; index >= 0; index -= 1) {
    const stage = PLAYOFF_STAGES[index];
    if (playoff.some((match) => match.stage === stage)) return stage;
  }
  return null;
}

function resolvePlayoffStage(
  matches: Match[],
  status: ChampionshipStatus,
  currentStage?: MatchStage | null,
): MatchStage | null {
  if (isPlayoffStage(currentStage)) return currentStage;
  if (status === "PLAYOFF" || FINISHED_STATUSES.includes(status)) {
    return derivePlayoffStage(matches);
  }
  return null;
}

export function resolveChampionshipRound(
  matches: Match[],
  status: ChampionshipStatus,
  currentStage?: MatchStage | null,
): ChampionshipRoundState {
  const rounds = buildChampionshipGroupRounds(matches);
  const currentRound = rounds.find((round) => round.status === "current") ?? null;
  const groupStageComplete = rounds.length > 0 && currentRound == null;
  const playoffStage = resolvePlayoffStage(matches, status, currentStage);

  let phase: ChampionshipPhaseView = "group";
  if (FINISHED_STATUSES.includes(status)) phase = "finished";
  else if (status === "PLAYOFF") phase = "playoff";
  else if (groupStageComplete) phase = "group_complete";

  return {
    phase,
    rounds,
    currentRound,
    playoffStage,
    groupStageComplete,
  };
}

export function roundsForGroup(matches: Match[], groupId: number): ChampionshipRound[] {
  return buildChampionshipGroupRounds(matches.filter((match) => match.groupId === groupId));
}

export function currentRoundOf(rounds: ChampionshipRound[]): ChampionshipRound | null {
  return rounds.find((round) => round.status === "current") ?? null;
}

export type GroupRoundView = {
  groupId: number;
  rounds: ChampionshipRound[];
  current: ChampionshipRound | null;
  complete: boolean;
};

export function buildGroupRoundViews(
  matches: Match[],
  groups: { id: number }[],
): GroupRoundView[] {
  return groups.map((group) => {
    const rounds = roundsForGroup(matches, group.id);
    const current = currentRoundOf(rounds);
    return {
      groupId: group.id,
      rounds,
      current,
      complete: rounds.length > 0 && current == null,
    };
  });
}

export type TournamentStepStatus = "done" | "current" | "upcoming";

export type TournamentStep = {
  key: string;
  stage: MatchStage | null;
  status: TournamentStepStatus;
  matches: Match[];
};

export function buildTournamentPath(
  matches: Match[],
  roundState: ChampionshipRoundState,
  options: { hasGroups: boolean; format: ChampionshipFormat },
): TournamentStep[] {
  const steps: TournamentStep[] = [];
  const groupMatches = matches.filter(isGroupMatch);

  if (options.hasGroups || groupMatches.length > 0) {
    const groupCurrent = roundState.phase === "group" && !roundState.groupStageComplete;
    steps.push({
      key: "group",
      stage: "GROUP_STAGE",
      status: groupCurrent ? "current" : groupMatches.length === 0 ? "upcoming" : "done",
      matches: groupMatches,
    });
  }

  const playoffSteps = PLAYOFF_STAGES.flatMap((stage) => {
    const rows = matches.filter((match) => match.stage === stage);
    if (rows.length === 0) return [];
    return [{ key: stage, stage, status: "upcoming" as const, matches: rows }];
  });
  steps.push(...playoffSteps);

  if (
    playoffSteps.length === 0 &&
    options.format === "GROUP_AND_PLAYOFF" &&
    steps.some((step) => step.stage === "GROUP_STAGE")
  ) {
    steps.push({ key: "playoff-pending", stage: null, status: "upcoming", matches: [] });
  }

  if (roundState.phase === "finished") {
    return steps.map((step) => ({ ...step, status: "done" }));
  }

  const currentStage = roundState.phase === "playoff" ? roundState.playoffStage : null;
  if (!currentStage) return steps;

  const currentIndex = PLAYOFF_STAGES.indexOf(currentStage);
  return steps.map((step) => {
    if (step.stage == null || step.stage === "GROUP_STAGE") return step;
    const index = PLAYOFF_STAGES.indexOf(step.stage);
    const status: TournamentStepStatus =
      index === currentIndex ? "current" : index < currentIndex ? "done" : "upcoming";
    return { ...step, status };
  });
}

export function groupRoundMatches(
  matches: Match[],
  groups: { id: number; name: string; sortOrder?: number }[],
): { groupId: number | null; name: string; matches: Match[] }[] {
  const order = new Map(groups.map((group, index) => [group.id, group.sortOrder ?? index]));
  const names = new Map(groups.map((group) => [group.id, group.name]));
  const buckets = new Map<number | null, Match[]>();

  for (const match of matches) {
    const groupId = match.groupId ?? null;
    const rows = buckets.get(groupId) ?? [];
    rows.push(match);
    buckets.set(groupId, rows);
  }

  return [...buckets.entries()]
    .sort((left, right) => {
      const leftOrder = left[0] == null ? 999 : (order.get(left[0]) ?? 999);
      const rightOrder = right[0] == null ? 999 : (order.get(right[0]) ?? 999);
      return leftOrder - rightOrder;
    })
    .map(([groupId, rows]) => ({
      groupId,
      name:
        groupId == null
          ? "Qrup"
          : (names.get(groupId) ?? rows[0]?.group?.name ?? "Qrup"),
      matches: sortMatches(rows),
    }));
}
