import { useMemo } from "react";
import {
  buildGroupRoundViews,
  type GroupRoundView,
} from "../../../../lib/championshipRounds";
import type { Match } from "../../../../types/match";

export function useGroupRounds(
  matches: Match[],
  groups: { id: number }[],
): GroupRoundView[] {
  return useMemo(() => buildGroupRoundViews(matches, groups), [matches, groups]);
}
