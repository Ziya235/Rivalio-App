export type LeagueSport = {
  id: number;
  name: string;
  code: string;
};

export type LeagueCreator = {
  id: number;
  firstName: string;
  lastName: string;
};

export type League = {
  id: number;
  name: string;
  logo: string | null;
  season: string | null;
  description: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  status: "DRAFT" | "ACTIVE" | "FINISHED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  sport: LeagueSport;
  createdBy: LeagueCreator;
  _count: {
    teams: number;
    members: number;
  };
};

export type StandingRow = {
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

export type StandingsResponse = {
  leagueId: number;
  standings: StandingRow[];
};

export type TeamLeagueInfo = {
  id: number;
  name: string;
  logo: string | null;
  season: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  status: "DRAFT" | "ACTIVE" | "FINISHED" | "CANCELLED";
  sport?: LeagueSport;
};

export type TeamStats = {
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

export type TeamPlayer = {
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

export type TeamTopScorer = {
  id: number;
  name: string;
  goals: number;
};

export type TeamTopAssister = {
  id: number;
  name: string;
  assists: number;
};

export type TeamDetail = {
  id: number;
  name: string;
  shortName: string | null;
  logo: string | null;
  description: string | null;
  city: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  foundedYear: number | null;
  createdAt: string;
  updatedAt: string;
  league: TeamLeagueInfo;
  stats: TeamStats;
  topScorer: TeamTopScorer | null;
  topAssister: TeamTopAssister | null;
  avgGoalsPerGame: number;
  winRate: number;
  form: ("W" | "D" | "L")[];
  nextMatch: {
    id: number;
    scheduledAt: string;
    status: string;
    venue: string | null;
    homeTeam: { id: number; name: string; logo: string | null };
    awayTeam: { id: number; name: string; logo: string | null };
  } | null;
  players: TeamPlayer[];
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  message: string;
};
