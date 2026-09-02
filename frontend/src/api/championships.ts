import { getToken } from "./auth";
import type { ApiSuccess } from "../types/league";
import type {
  Championship,
  ChampionshipFormat,
  ChampionshipGroup,
  ChampionshipListItem,
  ChampionshipMatchFormat,
  ChampionshipStatus,
  GroupStandingsBlock,
  PlayerStatistics,
  PlayoffTieGroup,
  StandingRow,
} from "../types/championship";
import type { Match, MatchStatus } from "../types/match";

export class ChampApiError extends Error {
  status: number;
  code?: string;
  ties?: PlayoffTieGroup[];

  constructor(
    message: string,
    status: number,
    extra?: { code?: string; ties?: PlayoffTieGroup[] },
  ) {
    super(message);
    this.name = "ChampApiError";
    this.status = status;
    this.code = extra?.code;
    this.ties = extra?.ties;
  }
}

async function champFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new ChampApiError(
      (data as { message?: string }).message || "Something went wrong",
      res.status,
      {
        code: (data as { code?: string }).code,
        ties: (data as { ties?: PlayoffTieGroup[] }).ties,
      },
    );
  }

  return ((data as ApiSuccess<T>).data ?? undefined) as T;
}

export type CreateChampionshipPayload = {
  name: string;
  description?: string;
  sportCode?: string;
  format?: ChampionshipFormat;
  matchFormat?: ChampionshipMatchFormat;
  startDate?: string;
  endDate?: string;
  maxTeams?: number;
  defaultQualifyCount?: number;
  logo?: string;
};

export type CreateGroupsPayload = {
  groupCount: number;
  teamSlots?: number | null;
  perGroupSlots?: (number | null)[];
  qualifyCount?: number;
  autoAssign?: boolean;
};

export function fetchChampionships(): Promise<Championship[]> {
  return champFetch<Championship[]>("/api/championships");
}

export function fetchChampionship(id: number): Promise<Championship> {
  return champFetch<Championship>(`/api/championships/${id}`);
}

export function createChampionship(
  payload: CreateChampionshipPayload,
): Promise<Championship> {
  return champFetch<Championship>("/api/championships", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateChampionship(
  id: number,
  payload: Partial<CreateChampionshipPayload> & { status?: ChampionshipStatus },
): Promise<Championship> {
  return champFetch<Championship>(`/api/championships/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteChampionship(id: number): Promise<void> {
  return champFetch<void>(`/api/championships/${id}`, { method: "DELETE" });
}

export function setChampionshipStatus(
  id: number,
  status: ChampionshipStatus,
): Promise<Championship> {
  return champFetch<Championship>(`/api/championships/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function startGroupStage(id: number): Promise<Championship> {
  return champFetch<Championship>(
    `/api/championships/${id}/start-group-stage`,
    { method: "POST", body: "{}" },
  );
}

export function addChampionshipTeam(
  championshipId: number,
  teamId: number,
): Promise<Championship> {
  return champFetch<Championship>(
    `/api/championships/${championshipId}/teams`,
    {
      method: "POST",
      body: JSON.stringify({ teamId }),
    },
  );
}

export function removeChampionshipTeam(
  championshipId: number,
  teamId: number,
): Promise<Championship> {
  return champFetch<Championship>(
    `/api/championships/${championshipId}/teams/${teamId}`,
    { method: "DELETE" },
  );
}

export function createChampionshipGroups(
  championshipId: number,
  payload: CreateGroupsPayload,
): Promise<ChampionshipGroup[]> {
  return champFetch<ChampionshipGroup[]>(
    `/api/championships/${championshipId}/groups`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateChampionshipGroup(
  groupId: number,
  payload: {
    name?: string;
    teamSlots?: number | null;
    qualifyCount?: number;
  },
): Promise<ChampionshipGroup> {
  return champFetch<ChampionshipGroup>(
    `/api/championships/groups/${groupId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteChampionshipGroup(groupId: number): Promise<void> {
  return champFetch<void>(`/api/championships/groups/${groupId}`, {
    method: "DELETE",
  });
}

export function addTeamToGroup(
  groupId: number,
  teamId: number,
): Promise<ChampionshipGroup> {
  return champFetch<ChampionshipGroup>(
    `/api/championships/groups/${groupId}/teams`,
    {
      method: "POST",
      body: JSON.stringify({ teamId }),
    },
  );
}

export function removeTeamFromGroup(
  groupId: number,
  teamId: number,
): Promise<ChampionshipGroup> {
  return champFetch<ChampionshipGroup>(
    `/api/championships/groups/${groupId}/teams/${teamId}`,
    { method: "DELETE" },
  );
}

export function generateGroupMatches(
  championshipId: number,
  payload?: { groupId?: number },
): Promise<Match[]> {
  return champFetch<Match[]>(
    `/api/championships/${championshipId}/matches/generate`,
    {
      method: "POST",
      body: JSON.stringify(payload || {}),
    },
  );
}

export function fetchChampionshipMatches(
  championshipId: number,
  query?: { groupId?: number; stage?: string; status?: string },
): Promise<Match[]> {
  const params = new URLSearchParams();
  if (query?.groupId) params.set("groupId", String(query.groupId));
  if (query?.stage) params.set("stage", query.stage);
  if (query?.status) params.set("status", query.status);
  const qs = params.toString();
  return champFetch<Match[]>(
    `/api/championships/${championshipId}/matches${qs ? `?${qs}` : ""}`,
  );
}

export function createChampionshipMatch(
  championshipId: number,
  payload: {
    homeTeamId: number;
    awayTeamId: number;
    scheduledAt: string;
    groupId?: number;
    round?: number;
    venue?: string;
    location?: string;
    stage?: string;
  },
): Promise<Match> {
  return champFetch<Match>(
    `/api/championships/${championshipId}/matches`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function fetchChampionshipMatch(matchId: number): Promise<Match> {
  return champFetch<Match>(`/api/championships/matches/${matchId}`);
}

export function updateChampionshipMatch(
  matchId: number,
  payload: {
    status?: MatchStatus;
    scheduledAt?: string;
    venue?: string | null;
    location?: string | null;
    notes?: string | null;
    round?: number | null;
    minute?: number | null;
    homeScore?: number;
    awayScore?: number;
  },
): Promise<Match> {
  return champFetch<Match>(`/api/championships/matches/${matchId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function setChampionshipMatchResult(
  matchId: number,
  payload: { homeScore: number; awayScore: number },
): Promise<Match> {
  return champFetch<Match>(
    `/api/championships/matches/${matchId}/result`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteChampionshipMatch(matchId: number): Promise<void> {
  return champFetch<void>(`/api/championships/matches/${matchId}`, {
    method: "DELETE",
  });
}

export function fetchGroupStandings(groupId: number): Promise<StandingRow[]> {
  return champFetch<StandingRow[]>(
    `/api/championships/groups/${groupId}/standings`,
  );
}

export function fetchChampionshipStandings(
  championshipId: number,
): Promise<GroupStandingsBlock[]> {
  return champFetch<GroupStandingsBlock[]>(
    `/api/championships/${championshipId}/standings`,
  );
}

export function startPlayoff(
  championshipId: number,
  payload?: { playoffOnly?: boolean; tieBreakTeamIds?: number[] },
): Promise<{
  qualifiedTeamIds: number[];
  matches: Match[];
  seeds?: Array<{
    seed: number | null;
    label: string;
    teamId: number;
    name?: string | null;
    directToSemiFinal?: boolean;
  }>;
  format?: string;
  groupCount?: number;
  seeding: {
    teamCount: number;
    prelimMatchCount: number;
    openingStage?: string | null;
  };
}> {
  return champFetch(`/api/championships/${championshipId}/start-playoff`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

export function fetchVisibleChampionships(): Promise<ChampionshipListItem[]> {
  return champFetch<ChampionshipListItem[]>("/api/championships/public");
}

export function fetchVisibleChampionship(
  id: number,
): Promise<ChampionshipListItem> {
  return champFetch<ChampionshipListItem>(`/api/championships/public/${id}`);
}

export function fetchVisibleChampionshipStandings(
  championshipId: number,
): Promise<GroupStandingsBlock[]> {
  return champFetch<GroupStandingsBlock[]>(
    `/api/championships/public/${championshipId}/standings`,
  );
}

export function fetchVisibleChampionshipMatches(
  championshipId: number,
  query?: { groupId?: number; stage?: string; status?: string },
): Promise<Match[]> {
  const params = new URLSearchParams();
  if (query?.groupId) params.set("groupId", String(query.groupId));
  if (query?.stage) params.set("stage", query.stage);
  if (query?.status) params.set("status", query.status);
  const qs = params.toString();
  return champFetch<Match[]>(
    `/api/championships/public/${championshipId}/matches${qs ? `?${qs}` : ""}`,
  );
}

export function fetchVisibleChampionshipStatistics(
  championshipId: number,
): Promise<PlayerStatistics[]> {
  return champFetch<PlayerStatistics[]>(
    `/api/championships/public/${championshipId}/statistics`,
  );
}

export function fetchVisibleChampionshipMatch(matchId: number): Promise<Match> {
  return champFetch<Match>(`/api/championships/public/matches/${matchId}`);
}
