import type { Visibility } from "./common";
import type { LeagueStatus } from "./league";

/** GET /api/players/:playerId and GET /api/users/:userId share this shape. */
export type PlayerProfile = {
  id: number;
  userId: number | null;
  username: string | null;
  firstName: string;
  lastName: string;
  image: string | null;
  position: string | null;
  shirtNumber: number | null;
  description: string | null;
  dateOfBirth: string | null;
  workplace: string | null;
  school: string | null;
  stats: { gamesPlayed: number; goals: number; assists: number };
  teams: Array<{
    playerId: number;
    id: number;
    name: string;
    shortName: string | null;
    logo: string | null;
    city: string | null;
  }>;
  leagues: Array<{
    id: number;
    name: string;
    logo: string | null;
    season: string | null;
    visibility: Visibility;
    status: LeagueStatus;
  }>;
};

export type UserSearchHit = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  image: string | null;
  playerId: number | null;
  teamName: string | null;
};
