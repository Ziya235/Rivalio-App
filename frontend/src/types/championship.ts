export type ChampionshipStatus =
  | "DRAFT"
  | "REGISTRATION"
  | "GROUP_STAGE"
  | "PLAYOFF"
  | "COMPLETED"
  | "CANCELLED";

export type ChampionshipFormat = "GROUP_AND_PLAYOFF" | "PLAYOFF_ONLY";

export type ChampionshipMatchFormat = "SINGLE" | "HOME_AWAY";

export type MatchStage =
  | "GROUP_STAGE"
  | "PRELIMINARY"
  | "ROUND_OF_16"
  | "QUARTER_FINAL"
  | "SEMI_FINAL"
  | "FINAL";

export type ChampionshipTeamBrief = {
  id: number;
  name: string;
  shortName: string | null;
  logo: string | null;
};

export type ChampionshipGroupTeam = {
  id: number;
  teamId: number;
  seed: number;
  team: ChampionshipTeamBrief;
  joinedAt: string;
};

export type ChampionshipGroup = {
  id: number;
  championshipId: number;
  name: string;
  teamSlots: number | null;
  qualifyCount: number;
  sortOrder: number;
  teams: ChampionshipGroupTeam[];
  createdAt?: string;
  updatedAt?: string;
};

export type ChampionshipTeamRow = {
  id: number;
  teamId: number;
  joinedAt: string;
  team: ChampionshipTeamBrief;
};

export type ChampionshipProgress = {
  total: number;
  finished: number;
  live: number;
};

export type Championship = {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  format: ChampionshipFormat;
  matchFormat?: ChampionshipMatchFormat;
  status: ChampionshipStatus;
  startDate: string | null;
  endDate: string | null;
  maxTeams: number | null;
  defaultQualifyCount: number;
  sportId: number;
  createdById: number;
  sport?: { id: number; name: string; code: string };
  createdBy?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  teamCount: number;
  groupCount: number;
  matchCount: number;
  teams: ChampionshipTeamRow[];
  groups: ChampionshipGroup[];
  currentStage?: MatchStage | null;
  progress?: ChampionshipProgress;
  myTeams?: ChampionshipTeamBrief[];
  createdAt: string;
  updatedAt: string;
};

export type StandingRow = {
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
  standings: StandingRow[];
};

export type PlayoffTieGroup = {
  id: string;
  title: string;
  teams: Array<{
    teamId: number;
    name: string;
    points: number;
    goalDiff: number;
    goalsFor: number;
    won: number;
  }>;
};

export type ChampionshipListItem = Championship & {
  currentStage: MatchStage | null;
  progress: ChampionshipProgress;
  myTeams: ChampionshipTeamBrief[];
};

export type PlayerStatistics = {
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
  goalsPerMatch: number;
};

export type UserFacingChampStatus = "Upcoming" | "Active" | "Finished";
