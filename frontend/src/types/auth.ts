export type UserRole = "USER" | "ADMIN";

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

export type RegisterPayload = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  dateOfBirth: string;
  role?: UserRole;
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
  image?: string | null;
};

export type AuthResponse = {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
};

export type MeResponse = {
  success: boolean;
  data: {
    user: User;
  };
};

export type ApiError = {
  success: false;
  message: string;
};
