import type { MatchFormat, RequestStatus, Visibility } from "./common";

export type LeagueStatus = "DRAFT" | "ACTIVE" | "FINISHED" | "CANCELLED";

/** backend/controllers/leagueGetController.js → getLeagues / getLeagueById */
export type League = {
  id: number;
  name: string;
  logo: string | null;
  season: string | null;
  description: string | null;
  visibility: Visibility;
  status: LeagueStatus;
  matchFormat?: MatchFormat;
  createdAt: string;
  updatedAt: string;
  sport: { id: number; name: string; code: string };
  createdBy: { id: number; firstName: string; lastName: string };
  canView?: boolean;
  myJoinRequests?: Array<{ id: number; teamId: number; status: RequestStatus }>;
  _count: { teams: number; members: number };
};

export type LeagueStandingRow = {
  teamId: number;
  teamName: string;
  shortName: string | null;
  logo: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type LeagueStandingsResponse = {
  leagueId: number;
  standings: LeagueStandingRow[];
};

export type LeaguePlayerRow = {
  id: number;
  firstName: string;
  lastName: string;
  position: string | null;
  shirtNumber: number | null;
  photo: string | null;
  goals: number;
  assists: number;
  matchesPlayed: number;
  team: { id: number; name: string; shortName: string | null; logo: string | null };
};

export type LeagueTeamPlayer = {
  id: number;
  firstName: string;
  lastName: string;
  position: string | null;
  shirtNumber: number | null;
  photo: string | null;
  goals: number;
  assists: number;
  matchesPlayed: number;
  minutes: number;
};

/** GET /api/leagues/:leagueId/teams/:teamId */
export type LeagueTeamDetail = {
  id: number;
  name: string;
  shortName: string | null;
  logo: string | null;
  description: string | null;
  city: string | null;
  league: { id: number; name: string; status: LeagueStatus; visibility: Visibility };
  stats: {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    position: number | null;
  };
  form: ("W" | "D" | "L")[];
  players: LeagueTeamPlayer[];
};

export type LeagueInvite = {
  id: number;
  status: RequestStatus;
  message: string | null;
  team: { id: number; name: string; logo: string | null };
  createdAt: string;
};

export type LeagueJoinRequest = {
  id: number;
  status: RequestStatus;
  message: string | null;
  team: { id: number; name: string; logo: string | null; city: string | null };
  requestedBy: { id: number; username: string; firstName: string; lastName: string };
  createdAt: string;
};

export type CreateLeaguePayload = {
  name: string;
  description?: string;
  visibility: Visibility;
  logo?: string;
};
