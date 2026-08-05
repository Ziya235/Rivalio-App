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

export type Challenge = {
  id: number;
  createdById: number;
  teamId: number;
  scheduledAt: string;
  venue: string;
  notes: string | null;
  status: string;
  team: {
    id: number;
    name: string;
    logo: string | null;
    city: string | null;
    captainId: number;
    captain?: { username: string; firstName: string; lastName: string };
  };
  requests: Array<{
    id: number;
    status: string;
    team: { id: number; name: string };
  }>;
};

export type ChallengeNotificationRequest = {
  id: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  team: {
    id: number;
    name: string;
    logo: string | null;
    city: string | null;
    captainId: number;
  };
  requestedBy?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    image?: string | null;
  };
  challenge: {
    id: number;
    scheduledAt: string;
    venue: string;
    notes: string | null;
    status: string;
    team: {
      id: number;
      name: string;
      logo: string | null;
      city: string | null;
      captainId: number;
    };
    acceptedTeam: {
      id: number;
      name: string;
      logo: string | null;
      city: string | null;
      captainId: number;
    } | null;
  };
};

export type ChallengeNotifications = {
  incoming: ChallengeNotificationRequest[];
  outcomes: ChallengeNotificationRequest[];
};

export type PlayerSearch = {
  id: number;
  scheduledAt: string;
  venue: string;
  notes: string | null;
  playersNeeded: number;
  playersFilled: number;
  spotsLeft: number;
  status: string;
  createdById: number;
  hostTeam: {
    id: number;
    name: string;
    logo: string | null;
    city: string | null;
    captainId: number;
    captain?: { username: string; firstName: string; lastName: string };
    players?: Array<{
      id: number;
      firstName: string;
      lastName: string;
      position: string | null;
    }>;
  };
  opponentTeam: { id: number; name: string; logo: string | null } | null;
  requests: Array<{
    id: number;
    status: string;
    user: {
      id: number;
      username: string;
      firstName: string;
      lastName: string;
    };
  }>;
};

export type PlayerSearchNotificationRequest = {
  id: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  user?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    image?: string | null;
  };
  playerSearch: {
    id: number;
    scheduledAt: string;
    venue: string;
    notes: string | null;
    hostTeam: {
      id: number;
      name: string;
      logo: string | null;
      city: string | null;
      captainId: number;
    };
    opponentTeam: {
      id: number;
      name: string;
      logo: string | null;
      city: string | null;
      captainId: number;
    } | null;
  };
};

export type PlayerSearchNotifications = {
  incoming: PlayerSearchNotificationRequest[];
  outcomes: PlayerSearchNotificationRequest[];
};

export function fetchChallenges(): Promise<Challenge[]> {
  return apiFetch<Challenge[]>("/api/challenges");
}

export function fetchMyChallengeNotifications(): Promise<ChallengeNotifications> {
  return apiFetch<ChallengeNotifications>("/api/me/challenge-notifications");
}

export function createChallenge(payload: {
  teamId: number;
  scheduledAt: string;
  venue: string;
  notes?: string;
}): Promise<Challenge> {
  return apiFetch<Challenge>("/api/challenges", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function requestChallenge(
  challengeId: number,
  payload: { teamId: number; message?: string },
): Promise<unknown> {
  return apiFetch(`/api/challenges/${challengeId}/requests`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function respondChallengeRequest(
  requestId: number,
  action: "accept" | "reject",
): Promise<unknown> {
  return apiFetch(`/api/challenge-requests/${requestId}/respond`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export function fetchPlayerSearches(): Promise<PlayerSearch[]> {
  return apiFetch<PlayerSearch[]>("/api/player-searches");
}

export function fetchMyPlayerSearchNotifications(): Promise<PlayerSearchNotifications> {
  return apiFetch<PlayerSearchNotifications>(
    "/api/me/player-search-notifications",
  );
}

export function createFriendly(payload: {
  homeTeamId: number;
  awayTeamId: number;
  scheduledAt: string;
  venue: string;
  notes?: string;
  playersNeeded?: number;
}): Promise<unknown> {
  return apiFetch("/api/friendlies", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createPlayerSearch(payload: {
  hostTeamId: number;
  opponentTeamId: number;
  scheduledAt: string;
  venue: string;
  notes?: string;
  playersNeeded: number;
}): Promise<PlayerSearch> {
  return apiFetch<PlayerSearch>("/api/player-searches", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function requestJoinPlayerSearch(
  searchId: number,
  message?: string,
): Promise<unknown> {
  return apiFetch(`/api/player-searches/${searchId}/requests`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function respondPlayerSearchRequest(
  requestId: number,
  action: "accept" | "reject",
): Promise<unknown> {
  return apiFetch(`/api/player-search-requests/${requestId}/respond`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}
