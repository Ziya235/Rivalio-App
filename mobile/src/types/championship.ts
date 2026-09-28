import type { MatchFormat, RequestStatus, Visibility } from "./common";
import type { MatchStage } from "./match";

export type ChampionshipStatus =
  | "DRAFT"
  | "REGISTRATION"
  | "GROUP_STAGE"
  | "PLAYOFF"
  | "COMPLETED"
  | "FINISHED"
  | "CANCELLED";

export type ChampionshipFormat = "GROUP_AND_PLAYOFF" | "PLAYOFF_ONLY";

export type ChampionshipTeamBrief = {
  id: number;
  name: string;
  shortName: string | null;
  logo: string | null;
};

export type ChampionshipGroup = {
  id: number;
  championshipId: number;
  name: string;
  teamSlots: number | null;
  qualifyCount: number;
  sortOrder: number;
  teams: Array<{ id: number; teamId: number; seed: number; team: ChampionshipTeamBrief }>;
};

export type ChampionshipTeamInvite = {
  id: number;
  teamId: number;
  status: RequestStatus;
  createdAt: string;
  team: ChampionshipTeamBrief & { captainId?: number };
};

export type ChampionshipJoinRequest = {
  id: number;
  teamId: number;
  status: RequestStatus;
  message?: string | null;
  createdAt?: string;
  team: ChampionshipTeamBrief & { city?: string | null };
  requestedBy?: { id: number; username: string; firstName: string; lastName: string };
};

/** backend/services/championshipService.js → formatChampionship (+ public extras) */
export type Championship = {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  format: ChampionshipFormat;
  matchFormat?: MatchFormat;
  visibility?: Visibility;
  status: ChampionshipStatus;
  startDate: string | null;
  endDate: string | null;
  maxTeams: number | null;
  defaultQualifyCount: number;
  createdById: number;
  teamCount: number;
  groupCount: number;
  matchCount: number;
  teams: Array<{ id: number; teamId: number; joinedAt: string; team: ChampionshipTeamBrief }>;
  pendingInvites?: ChampionshipTeamInvite[];
  groups: ChampionshipGroup[];
  currentStage?: MatchStage | null;
  progress?: { total: number; finished: number; live: number };
  myTeams?: ChampionshipTeamBrief[];
  canView?: boolean;
  myJoinRequests?: Array<{ id: number; teamId: number; status: RequestStatus }>;
  createdAt: string;
};

export type ChampionshipStandingRow = {
  rank: number;
  teamId: number;
  team: ChampionshipTeamBrief;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

export type GroupStandingsBlock = {
  groupId: number;
  groupName: string;
  qualifyCount?: number;
  standings: ChampionshipStandingRow[];
};

export type ChampionshipPlayerStat = {
  id: number;
  firstName: string;
  lastName: string;
  shirtNumber: number | null;
  photo: string | null;
  teamId: number;
  team: ChampionshipTeamBrief;
  goals: number;
  assists: number;
  matchesPlayed: number;
};

export type ChampionshipStatistics = {
  players: ChampionshipPlayerStat[];
};

/** Returned in a 409 body with code PLAYOFF_TIE when seeding needs a manual order. */
export type PlayoffTieGroup = {
  id: string;
  title: string;
  teams: Array<{ teamId: number; name: string; points: number; goalDiff: number; goalsFor: number }>;
};

export type CreateChampionshipPayload = {
  name: string;
  description?: string;
  sportCode: "FOOTBALL";
  format: ChampionshipFormat;
  matchFormat: MatchFormat;
  maxTeams: number;
  startDate: string;
  visibility: Visibility;
};

export type CreateGroupsPayload = {
  groupCount: number;
  teamSlots?: number;
  perGroupSlots?: number[];
  autoAssign: boolean;
};
