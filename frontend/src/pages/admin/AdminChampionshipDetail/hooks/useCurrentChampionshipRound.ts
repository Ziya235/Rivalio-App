import { useMemo } from "react";
import {
  resolveChampionshipRound,
  type ChampionshipRoundState,
} from "../../../../lib/championshipRounds";
import type { ChampionshipStatus, MatchStage } from "../../../../types/championship";
import type { Match } from "../../../../types/match";

const EMPTY: ChampionshipRoundState = {
  phase: "group",
  rounds: [],
  currentRound: null,
  playoffStage: null,
  groupStageComplete: false,
};

export function useCurrentChampionshipRound(
  matches: Match[],
  status: ChampionshipStatus | undefined,
  currentStage?: MatchStage | null,
): ChampionshipRoundState {
  return useMemo(() => {
    if (!status) return EMPTY;
    return resolveChampionshipRound(matches, status, currentStage);
  }, [matches, status, currentStage]);
}
