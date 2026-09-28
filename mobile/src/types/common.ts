export type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export type Visibility = "PUBLIC" | "PRIVATE";

export type MatchFormat = "SINGLE" | "HOME_AWAY";

export type UserRole = "USER" | "ADMIN";

/** backend/utils/helpers.js → userBriefSelect */
export type UserBrief = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  image: string | null;
};

export type TeamBrief = {
  id: number;
  name: string;
  shortName?: string | null;
  logo: string | null;
};

/** Every backend response is `{ success, data?, message? }`. */
export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
};
