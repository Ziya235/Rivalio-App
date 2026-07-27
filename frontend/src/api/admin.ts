import { getToken } from "./auth";
import type { ApiSuccess, League, TeamDetail } from "../types/league";
import type {
  Match,
  MatchEvent,
  MatchEventType,
  MatchStatus,
  MatchType,
} from "../types/match";

type CreatedPlayer = {
  id: number;
  firstName: string;
  lastName: string;
  position: string | null;
  shirtNumber: number | null;
  photo: string | null;
  description: string | null;
  teamId: number;
};

async function adminFetch<T>(
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
    throw new Error(
      (data as { message?: string }).message || "Something went wrong",
    );
  }

  return ((data as ApiSuccess<T>).data ?? undefined) as T;
}

export type CreateLeaguePayload = {
  name: string;
  description?: string;
  season?: string;
  visibility?: "PUBLIC" | "PRIVATE";
  logo?: string;
};

export type CreateTeamPayload = {
  name: string;
  shortName?: string;
  logo?: string;
  description?: string;
  city?: string;
  primaryColor?: string;
  secondaryColor?: string;
  foundedYear?: number;
};

export type CreatePlayerPayload = {
  firstName: string;
  lastName: string;
  position?: string;
  shirtNumber?: number;
  photo?: string;
  description?: string;
};

export type CreateMatchPayload = {
  homeTeamId: number;
  awayTeamId: number;
  scheduledAt: string;
  round?: number;
  venue?: string;
  notes?: string;
  matchType?: MatchType;
};

export type UpdateMatchPayload = {
  scheduledAt?: string;
  round?: number | null;
  venue?: string | null;
  notes?: string | null;
  matchType?: MatchType;
  status?: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  minute?: number | null;
};

export type CreateMatchEventPayload = {
  type: MatchEventType;
  minute: number;
  teamId?: number;
  playerId?: number;
  assistPlayerId?: number;
  playerInId?: number;
  playerOutId?: number;
  note?: string;
};

export function createLeague(payload: CreateLeaguePayload): Promise<League> {
  return adminFetch<League>("/api/leagues", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type LeagueInvite = {
  id: number;
  status: string;
  message: string | null;
  team: { id: number; name: string; logo: string | null };
  createdAt: string;
};

export type LeagueJoinRequest = {
  id: number;
  status: string;
  message: string | null;
  team: { id: number; name: string; logo: string | null; city: string | null };
  requestedBy: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
};

/** Invite an existing team (by unique name) into the league. */
export function inviteTeamToLeague(
  leagueId: number,
  payload: { teamName: string; message?: string },
): Promise<LeagueInvite> {
  return adminFetch<LeagueInvite>(`/api/leagues/${leagueId}/team-invites`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchLeagueInvites(leagueId: number): Promise<LeagueInvite[]> {
  return adminFetch<LeagueInvite[]>(`/api/leagues/${leagueId}/team-invites`);
}

export function fetchLeagueJoinRequests(
  leagueId: number,
): Promise<LeagueJoinRequest[]> {
  return adminFetch<LeagueJoinRequest[]>(
    `/api/leagues/${leagueId}/join-requests`,
  );
}

export function respondJoinRequest(
  requestId: number,
  action: "accept" | "reject",
): Promise<LeagueJoinRequest> {
  return adminFetch<LeagueJoinRequest>(
    `/api/league-join-requests/${requestId}/respond`,
    {
      method: "POST",
      body: JSON.stringify({ action }),
    },
  );
}

export function deleteTeam(leagueId: number, teamId: number): Promise<void> {
  return adminFetch<void>(`/api/leagues/${leagueId}/teams/${teamId}`, {
    method: "DELETE",
  });
}

export function createPlayer(
  teamId: number,
  payload: CreatePlayerPayload,
): Promise<CreatedPlayer> {
  return adminFetch<CreatedPlayer>(`/api/teams/${teamId}/players`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deletePlayer(
  leagueId: number,
  teamId: number,
  playerId: number,
): Promise<void> {
  return adminFetch<void>(
    `/api/leagues/${leagueId}/teams/${teamId}/players/${playerId}`,
    { method: "DELETE" },
  );
}

export function fetchMyMatches(params?: {
  leagueId?: number;
  status?: MatchStatus;
}): Promise<Match[]> {
  const search = new URLSearchParams();
  if (params?.leagueId) search.set("leagueId", String(params.leagueId));
  if (params?.status) search.set("status", params.status);
  const qs = search.toString();
  return adminFetch<Match[]>(`/api/matches/mine${qs ? `?${qs}` : ""}`);
}

export function fetchMatch(matchId: number): Promise<Match> {
  return adminFetch<Match>(`/api/matches/${matchId}`);
}

export function createMatch(
  leagueId: number,
  payload: CreateMatchPayload,
): Promise<Match> {
  return adminFetch<Match>(`/api/leagues/${leagueId}/matches`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateMatch(
  matchId: number,
  payload: UpdateMatchPayload,
): Promise<Match> {
  return adminFetch<Match>(`/api/matches/${matchId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteMatch(matchId: number): Promise<void> {
  return adminFetch<void>(`/api/matches/${matchId}`, {
    method: "DELETE",
  });
}

export function addMatchEvent(
  matchId: number,
  payload: CreateMatchEventPayload,
): Promise<{ event: MatchEvent; match: Match }> {
  return adminFetch<{ event: MatchEvent; match: Match }>(
    `/api/matches/${matchId}/events`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteMatchEvent(
  matchId: number,
  eventId: number,
): Promise<Match> {
  return adminFetch<Match>(`/api/matches/${matchId}/events/${eventId}`, {
    method: "DELETE",
  });
}

export type { TeamDetail };
