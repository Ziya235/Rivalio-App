import type { UserRole } from "./common";

/** backend/controllers/authController.js → formatUser */
export type User = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  bio: string | null;
  workplace: string | null;
  school: string | null;
  image: string | null;
  role: UserRole;
  gamesPlayed: number;
  goals: number;
  assists: number;
  permissions: string[];
};

/**
 * The backend also accepts `role`, but the mobile app never sends it: public
 * sign-up always creates a regular USER account.
 */
export type RegisterPayload = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  dateOfBirth: string;
  bio?: string;
  workplace?: string;
  school?: string;
};

export type UpdateProfilePayload = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  bio?: string;
  workplace?: string;
  school?: string;
};
