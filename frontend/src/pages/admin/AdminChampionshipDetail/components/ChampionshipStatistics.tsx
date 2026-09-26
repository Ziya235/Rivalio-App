import { useMemo } from "react";
import type { ChampionshipStatistics as Statistics } from "../../../../types/championship";
import type { ChampScorerRow } from "../constants";
import { playerDisplayName } from "../helpers";
import { ChampionshipStatsBlock } from "./ChampionshipStats";

export function ChampionshipStatistics({ statistics }: { statistics: Statistics }) {
  const players = useMemo<ChampScorerRow[]>(
    () =>
      statistics.players
        .filter((row) => row.goals > 0 || row.assists > 0)
        .sort(
          (left, right) =>
            right.goals - left.goals ||
            right.assists - left.assists ||
            right.goals + right.assists - (left.goals + left.assists) ||
            playerDisplayName(left).localeCompare(playerDisplayName(right), "az"),
        )
        .map((row) => ({
          id: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          shirtNumber: row.shirtNumber,
          photo: row.photo,
          teamId: row.teamId,
          teamName: row.team.name,
          teamLogo: row.team.logo,
          goals: row.goals,
          assists: row.assists,
        })),
    [statistics.players],
  );

  return <ChampionshipStatsBlock players={players} />;
}
