import { getToken } from "./auth";

type ApiSuccess<T> = { success: boolean; data: T; message?: string };

async function apiFetch<T>(
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

export type TeamSummary = {
  id: number;
  name: string;
  shortName: string | null;
  logo: string | null;
  city: string | null;
  captainId: number;
  captain?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  _count?: { players: number };
};

export type TeamDetail = TeamSummary & {
  description: string | null;
  leagueStats: {
    matchesPlayed: number;
    goals: number;
    assists: number;
  };
  players: Array<{
    id: number;
    firstName: string;
    lastName: string;
    position: string | null;
    shirtNumber: number | null;
    photo: string | null;
    userId: number | null;
    user?: {
      id: number;
      username: string;
      firstName: string;
      lastName: string;
    } | null;
  }>;
  leagueMemberships: Array<{
    joinedAt: string;
    league: {
      id: number;
      name: string;
      logo: string | null;
      visibility: string;
      status: string;
      season: string | null;
    };
  }>;
};

export type TeamInvite = {
  id: number;
  status: string;
  message: string | null;
  league: {
    id: number;
    name: string;
    visibility: string;
    season: string | null;
  };
  team: { id: number; name: string };
  createdAt: string;
};

export type TeamPlayerInvite = {
  id: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  position: string | null;
  shirtNumber: number | null;
  message: string | null;
  respondedAt: string | null;
  createdAt: string;
  team: TeamSummary;
  invitedUser: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    image?: string | null;
  };
  invitedBy: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    image?: string | null;
  };
};

export type TeamPlayerInviteNotifications = {
  incoming: TeamPlayerInvite[];
  outcomes: TeamPlayerInvite[];
};

export function fetchTeams(params?: {
  mine?: boolean;
  q?: string;
}): Promise<TeamSummary[]> {
  const search = new URLSearchParams();
  if (params?.mine) search.set("mine", "true");
  if (params?.q) search.set("q", params.q);
  const qs = search.toString();
  return apiFetch<TeamSummary[]>(`/api/teams${qs ? `?${qs}` : ""}`);
}

export function fetchTeam(teamId: number): Promise<TeamDetail> {
  return apiFetch<TeamDetail>(`/api/teams/${teamId}`);
}

export function createTeam(payload: {
  name: string;
  city?: string;
  description?: string;
  shortName?: string;
  logo?: string;
}): Promise<TeamDetail> {
  return apiFetch<TeamDetail>("/api/teams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addPlayerByUsername(
  teamId: number,
  payload: { username: string; position?: string; shirtNumber?: number },
): Promise<unknown> {
  return apiFetch(`/api/teams/${teamId}/players/by-username`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function invitePlayerToTeam(
  teamId: number,
  payload: {
    username: string;
    position?: string;
    shirtNumber?: number;
    message?: string;
  },
): Promise<TeamPlayerInvite> {
  return apiFetch<TeamPlayerInvite>(`/api/teams/${teamId}/player-invites`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMyTeamPlayerInviteNotifications(): Promise<TeamPlayerInviteNotifications> {
  return apiFetch<TeamPlayerInviteNotifications>(
    "/api/me/team-player-invite-notifications",
  );
}

export function respondTeamPlayerInvite(
  inviteId: number,
  action: "accept" | "reject",
): Promise<TeamPlayerInvite> {
  return apiFetch<TeamPlayerInvite>(
    `/api/team-player-invites/${inviteId}/respond`,
    {
      method: "POST",
      body: JSON.stringify({ action }),
    },
  );
}

export function removeTeamPlayer(
  teamId: number,
  playerId: number,
): Promise<void> {
  return apiFetch(`/api/teams/${teamId}/players/${playerId}`, {
    method: "DELETE",
  });
}

export function fetchMyTeamInvites(): Promise<TeamInvite[]> {
  return apiFetch<TeamInvite[]>("/api/me/team-invites");
}

export function respondTeamInvite(
  inviteId: number,
  action: "accept" | "reject",
): Promise<TeamInvite> {
  return apiFetch<TeamInvite>(`/api/team-invites/${inviteId}/respond`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export function requestJoinLeague(
  leagueId: number,
  payload: { teamId: number; message?: string },
): Promise<unknown> {
  return apiFetch(`/api/leagues/${leagueId}/join-requests`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
