import { getToken } from "./auth";
import type {
  ApiSuccess,
  League,
  LeaguePlayerRow,
  StandingsResponse,
  TeamDetail,
} from "../types/league";
import type { LeagueTeamOption, Match } from "../types/match";

async function apiFetch<T>(path: string): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      (data as { message?: string }).message || "Something went wrong",
    );
  }

  return (data as ApiSuccess<T>).data;
}

export function fetchLeagues(): Promise<League[]> {
  return apiFetch<League[]>("/api/leagues");
}

export function fetchLeagueStandings(
  leagueId: number,
): Promise<StandingsResponse> {
  return apiFetch<StandingsResponse>(`/api/leagues/${leagueId}/standings`);
}

export function fetchTeam(
  leagueId: number,
  teamId: number,
): Promise<TeamDetail> {
  return apiFetch<TeamDetail>(`/api/leagues/${leagueId}/teams/${teamId}`);
}

export function fetchLeagueTeams(
  leagueId: number,
): Promise<LeagueTeamOption[]> {
  return apiFetch<LeagueTeamOption[]>(`/api/leagues/${leagueId}/teams`);
}

export function fetchLeaguePlayers(
  leagueId: number,
): Promise<LeaguePlayerRow[]> {
  return apiFetch<LeaguePlayerRow[]>(`/api/leagues/${leagueId}/players`);
}

export function fetchLeagueMatches(leagueId: number): Promise<Match[]> {
  return apiFetch<Match[]>(`/api/leagues/${leagueId}/matches`);
}
