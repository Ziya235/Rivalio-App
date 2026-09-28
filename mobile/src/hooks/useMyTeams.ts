import { useMemo } from "react";
import { teamsApi } from "../api/teams";
import { useCurrentUser } from "../context/AuthContext";
import { useQuery } from "./useQuery";

export const MY_TEAMS_KEY = "teams:mine";

/**
 * Teams where the user is captain or rostered. Captaincy is only used to decide
 * which buttons to show — the backend re-checks it on every write.
 */
export function useMyTeams() {
  const user = useCurrentUser();
  const query = useQuery(MY_TEAMS_KEY, () => teamsApi.list({ mine: true }));
  const captainTeams = useMemo(
    () => (query.data ?? []).filter((team) => team.captainId === user.id),
    [query.data, user.id],
  );
  return { ...query, teams: query.data ?? [], captainTeams, isCaptain: captainTeams.length > 0 };
}
