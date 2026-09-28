import type { RequestStatus, UserBrief } from "./common";

type SocialTeam = {
  id: number;
  name: string;
  logo: string | null;
  city: string | null;
  captainId: number;
};

export type ChallengeStatus = "OPEN" | "ACCEPTED" | "CANCELLED" | "EXPIRED";

/** "Oyun təklifi" — GET /api/challenges */
export type Challenge = {
  id: number;
  createdById: number;
  teamId: number;
  scheduledAt: string;
  venue: string;
  notes: string | null;
  status: ChallengeStatus;
  team: SocialTeam & { captain?: { username: string; firstName: string; lastName: string } };
  acceptedTeam?: { id: number; name: string; logo: string | null } | null;
  requests: Array<{
    id: number;
    status: RequestStatus;
    message?: string | null;
    team: { id: number; name: string; logo: string | null };
    requestedBy?: Omit<UserBrief, "id"> & { id?: number };
  }>;
  myRequest: { id: number; status: RequestStatus; teamId: number } | null;
};

export type ChallengeRequestNotice = {
  id: number;
  status: RequestStatus;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  team: SocialTeam;
  requestedBy?: UserBrief;
  challenge: {
    id: number;
    scheduledAt: string;
    venue: string;
    status: ChallengeStatus;
    team: SocialTeam;
    acceptedTeam: SocialTeam | null;
  };
};

export type PlayerSearchStatus = "OPEN" | "FULL" | "CANCELLED" | "EXPIRED";

/** "Oyunçu axtarışı" — GET /api/player-searches */
export type PlayerSearch = {
  id: number;
  scheduledAt: string;
  venue: string;
  notes: string | null;
  playersNeeded: number;
  playersFilled: number;
  spotsLeft: number;
  status: PlayerSearchStatus;
  createdById: number;
  hostTeam: SocialTeam & { captain?: { username: string; firstName: string; lastName: string } };
  opponentTeam: { id: number; name: string; logo: string | null } | null;
  requests: Array<{
    id: number;
    status: RequestStatus;
    message?: string | null;
    user: UserBrief;
  }>;
  myRequest: { id: number; status: RequestStatus } | null;
};

export type PlayerSearchRequestNotice = {
  id: number;
  status: RequestStatus;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  user?: UserBrief;
  playerSearch: {
    id: number;
    scheduledAt: string;
    venue: string;
    hostTeam: SocialTeam;
    opponentTeam: SocialTeam | null;
  };
};

export type CreateChallengePayload = {
  teamId: number;
  scheduledAt: string;
  venue: string;
  notes?: string;
};

export type CreatePlayerSearchPayload = {
  hostTeamId: number;
  scheduledAt: string;
  venue: string;
  notes?: string;
  playersNeeded: number;
};
