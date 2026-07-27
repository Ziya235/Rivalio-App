export type MatchStatus =
  | "SCHEDULED"
  | "LIVE"
  | "FINISHED"
  | "CANCELLED"
  | "POSTPONED";

export type MatchType = "LEAGUE" | "FRIENDLY";

export type MatchEventType =
  | "GOAL"
  | "OWN_GOAL"
  | "YELLOW_CARD"
  | "RED_CARD"
  | "SUBSTITUTION"
  | "NOTE";

export type MatchTeam = {
  id: number;
  name: string;
  shortName: string | null;
  logo: string | null;
};

export type MatchPlayer = {
  id: number;
  firstName: string;
  lastName: string;
  shirtNumber: number | null;
  photo: string | null;
  teamId: number;
};

export type MatchLeagueInfo = {
  id: number;
  name: string;
  logo: string | null;
  season: string | null;
  createdById?: number;
};

export type MatchEvent = {
  id: number;
  matchId: number;
  type: MatchEventType;
  minute: number;
  teamId: number | null;
  playerId: number | null;
  assistPlayerId: number | null;
  playerInId: number | null;
  playerOutId: number | null;
  note: string | null;
  createdAt: string;
  team: MatchTeam | null;
  player: MatchPlayer | null;
  assistPlayer: MatchPlayer | null;
  playerIn: MatchPlayer | null;
  playerOut: MatchPlayer | null;
};

export type Match = {
  id: number;
  leagueId: number;
  homeTeamId: number;
  awayTeamId: number;
  round: number | null;
  matchType: MatchType;
  status: MatchStatus;
  scheduledAt: string;
  venue: string | null;
  notes: string | null;
  homeScore: number;
  awayScore: number;
  minute: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  league: MatchLeagueInfo;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  events?: MatchEvent[];
};

export type LeagueTeamOption = {
  id: number;
  name: string;
  shortName: string | null;
  logo: string | null;
  playersCount: number;
};
