import type { RequestStatus, UserBrief } from "./common";

/** backend/prisma/schema.prisma → NotificationType */
export type NotificationType =
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPTED"
  | "NEW_MESSAGE"
  | "TEAM_INVITE"
  | "LEAGUE_INVITE"
  | "MATCH_INVITE"
  | "JOIN_REQUEST"
  | "CHAMPIONSHIP_INVITE"
  | "CHAMPIONSHIP_JOIN_REQUEST";

type NoticeTeam = { id: number; name: string; logo: string | null; captainId: number };

/** backend/services/notificationService.js → formatNotification + extras */
export type AppNotification = {
  id: number;
  userId: number;
  actorId: number | null;
  type: NotificationType;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
  actor: UserBrief | null;
  friendRequestStatus?: RequestStatus | null;
  championshipInviteStatus?: RequestStatus | null;
  championshipInvite?: {
    id: number;
    status: RequestStatus;
    championship: { id: number; name: string; logo: string | null };
    team: NoticeTeam;
  } | null;
  leagueInviteStatus?: RequestStatus | null;
  leagueInvite?: {
    id: number;
    status: RequestStatus;
    league: { id: number; name: string; logo: string | null };
    team: NoticeTeam;
  } | null;
  joinRequestStatus?: RequestStatus | null;
  joinRequest?: {
    id: number;
    status: RequestStatus;
    league: { id: number; name: string; logo: string | null };
    team: NoticeTeam;
  } | null;
  championshipJoinRequestStatus?: RequestStatus | null;
  championshipJoinRequest?: {
    id: number;
    status: RequestStatus;
    championship: { id: number; name: string; logo: string | null };
    team: NoticeTeam;
  } | null;
};

export type NotificationsResponse = {
  notifications: AppNotification[];
  unreadCount: number;
};
