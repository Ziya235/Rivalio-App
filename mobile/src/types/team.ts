import type { RequestStatus, UserBrief, Visibility } from "./common";
import type { ChampionshipStatus } from "./championship";
import type { LeagueStatus } from "./league";

/** GET /api/teams (backend/controllers/userTeamController.js → listTeams) */
export type TeamSummary = {
  id: number;
  name: string;
  shortName: string | null;
  logo: string | null;
  city: string | null;
  captainId: number;
  description?: string | null;
  captain?: UserBrief;
  _count?: { players: number };
  leagueMemberships?: Array<{
    league: { id: number; name: string; visibility: Visibility; status: LeagueStatus };
  }>;
};

export type TeamPlayer = {
  id: number;
  firstName: string;
  lastName: string;
  position: string | null;
  shirtNumber: number | null;
  photo: string | null;
  userId: number | null;
  user: UserBrief | null;
};

/** GET /api/teams/:teamId */
export type TeamDetail = Omit<TeamSummary, "leagueMemberships"> & {
  description: string | null;
  leagueStats: { matchesPlayed: number; goals: number; assists: number };
  players: TeamPlayer[];
  leagueMemberships: Array<{
    joinedAt: string;
    league: {
      id: number;
      name: string;
      logo: string | null;
      visibility: Visibility;
      status: LeagueStatus;
      season: string | null;
    };
  }>;
  championshipTeams: Array<{
    joinedAt: string;
    championship: {
      id: number;
      name: string;
      logo: string | null;
      visibility: Visibility;
      status: ChampionshipStatus;
    };
  }>;
};

export type CreateTeamPayload = {
  name: string;
  city?: string;
  shortName?: string;
  description?: string;
  logo?: string;
};

export type TeamPlayerInvite = {
  id: number;
  status: RequestStatus;
  message: string | null;
  respondedAt: string | null;
  createdAt: string;
  team: TeamSummary;
  invitedUser: UserBrief;
  invitedBy: UserBrief;
};

export type IncomingOutcomes<T> = { incoming: T[]; outcomes: T[] };
