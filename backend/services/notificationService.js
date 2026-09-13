import { prisma } from "../config/db.js";
import { userBriefSelect } from "../utils/helpers.js";
import { emitToUser } from "../socket/socket.emit.js";

const championshipInviteSelect = {
  id: true,
  status: true,
  championship: { select: { id: true, name: true, logo: true } },
  team: {
    select: {
      id: true,
      name: true,
      logo: true,
      captainId: true,
    },
  },
};

const leagueInviteSelect = {
  id: true,
  status: true,
  league: { select: { id: true, name: true, logo: true } },
  team: {
    select: {
      id: true,
      name: true,
      logo: true,
      captainId: true,
    },
  },
};

const joinRequestSelect = {
  id: true,
  status: true,
  league: { select: { id: true, name: true, logo: true } },
  team: {
    select: {
      id: true,
      name: true,
      logo: true,
      captainId: true,
    },
  },
};

const championshipJoinRequestSelect = {
  id: true,
  status: true,
  championship: { select: { id: true, name: true, logo: true } },
  team: {
    select: {
      id: true,
      name: true,
      logo: true,
      captainId: true,
    },
  },
};

export const formatNotification = (notification, extra = {}) => ({
  id: notification.id,
  userId: notification.userId,
  actorId: notification.actorId,
  type: notification.type,
  entityId: notification.entityId,
  isRead: notification.isRead,
  createdAt: notification.createdAt,
  actor: notification.actor ?? null,
  ...extra,
});

async function extrasForNotification(notification) {
  const entityId = Number(notification.entityId);
  if (!notification.entityId || !Number.isInteger(entityId) || entityId <= 0) {
    return {};
  }

  if (notification.type === "FRIEND_REQUEST") {
    const request = await prisma.friendRequest.findUnique({
      where: { id: entityId },
      select: { id: true, status: true },
    });
    return {
      friendRequestStatus: request?.status ?? "PENDING",
    };
  }

  if (notification.type === "CHAMPIONSHIP_INVITE") {
    const invite = await prisma.championshipTeamInvite.findUnique({
      where: { id: entityId },
      select: championshipInviteSelect,
    });
    return {
      championshipInviteStatus: invite?.status ?? "PENDING",
      championshipInvite: invite,
    };
  }

  if (notification.type === "LEAGUE_INVITE") {
    const invite = await prisma.leagueTeamInvite.findUnique({
      where: { id: entityId },
      select: leagueInviteSelect,
    });
    return {
      leagueInviteStatus: invite?.status ?? "PENDING",
      leagueInvite: invite,
    };
  }

  if (notification.type === "JOIN_REQUEST") {
    const request = await prisma.leagueJoinRequest.findUnique({
      where: { id: entityId },
      select: joinRequestSelect,
    });
    return {
      joinRequestStatus: request?.status ?? "PENDING",
      joinRequest: request,
    };
  }

  if (notification.type === "CHAMPIONSHIP_JOIN_REQUEST") {
    const request = await prisma.championshipJoinRequest.findUnique({
      where: { id: entityId },
      select: championshipJoinRequestSelect,
    });
    return {
      championshipJoinRequestStatus: request?.status ?? "PENDING",
      championshipJoinRequest: request,
    };
  }

  return {};
}

export const createNotification = async ({
  userId,
  actorId,
  type,
  entityId,
  emitEvent = true,
}) => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      actorId: actorId ?? null,
      type,
      entityId: entityId != null ? String(entityId) : null,
    },
    include: {
      actor: { select: userBriefSelect },
    },
  });

  const extra = await extrasForNotification(notification);
  const formatted = formatNotification(notification, extra);

  if (emitEvent) {
    emitToUser(userId, "notification_received", {
      notification: formatted,
      unreadCount: await getUnreadCount(userId),
    });
  }

  return formatted;
};

export const markFriendRequestNotificationsRead = async (userId, requestId) => {
  await prisma.notification.updateMany({
    where: {
      userId,
      type: "FRIEND_REQUEST",
      entityId: String(requestId),
    },
    data: { isRead: true },
  });
};

export const getUnreadCount = async (userId) =>
  prisma.notification.count({
    where: { userId, isRead: false },
  });

export const listNotifications = async (userId, { limit = 50 } = {}) => {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        actor: { select: userBriefSelect },
      },
    }),
    getUnreadCount(userId),
  ]);

  const entityIdsForType = (type) =>
    notifications
      .filter((item) => item.type === type && item.entityId)
      .map((item) => Number(item.entityId))
      .filter((id) => Number.isInteger(id) && id > 0);

  const friendRequestIds = entityIdsForType("FRIEND_REQUEST");
  const championshipInviteIds = entityIdsForType("CHAMPIONSHIP_INVITE");
  const leagueInviteIds = entityIdsForType("LEAGUE_INVITE");
  const joinRequestIds = entityIdsForType("JOIN_REQUEST");
  const championshipJoinRequestIds = entityIdsForType(
    "CHAMPIONSHIP_JOIN_REQUEST",
  );

  const [
    friendRequests,
    championshipInvites,
    leagueInvites,
    joinRequests,
    championshipJoinRequests,
  ] = await Promise.all([
    friendRequestIds.length > 0
      ? prisma.friendRequest.findMany({
          where: { id: { in: friendRequestIds } },
          select: { id: true, status: true },
        })
      : Promise.resolve([]),
    championshipInviteIds.length > 0
      ? prisma.championshipTeamInvite.findMany({
          where: { id: { in: championshipInviteIds } },
          select: championshipInviteSelect,
        })
      : Promise.resolve([]),
    leagueInviteIds.length > 0
      ? prisma.leagueTeamInvite.findMany({
          where: { id: { in: leagueInviteIds } },
          select: leagueInviteSelect,
        })
      : Promise.resolve([]),
    joinRequestIds.length > 0
      ? prisma.leagueJoinRequest.findMany({
          where: { id: { in: joinRequestIds } },
          select: joinRequestSelect,
        })
      : Promise.resolve([]),
    championshipJoinRequestIds.length > 0
      ? prisma.championshipJoinRequest.findMany({
          where: { id: { in: championshipJoinRequestIds } },
          select: championshipJoinRequestSelect,
        })
      : Promise.resolve([]),
  ]);

  const friendRequestStatusMap = new Map(
    friendRequests.map((request) => [request.id, request.status]),
  );
  const championshipInviteMap = new Map(
    championshipInvites.map((invite) => [invite.id, invite]),
  );
  const leagueInviteMap = new Map(
    leagueInvites.map((invite) => [invite.id, invite]),
  );
  const joinRequestMap = new Map(
    joinRequests.map((request) => [request.id, request]),
  );
  const championshipJoinRequestMap = new Map(
    championshipJoinRequests.map((request) => [request.id, request]),
  );

  return {
    notifications: notifications.map((notification) => {
      if (notification.type === "FRIEND_REQUEST" && notification.entityId) {
        return formatNotification(notification, {
          friendRequestStatus:
            friendRequestStatusMap.get(Number(notification.entityId)) ?? null,
        });
      }
      if (notification.type === "CHAMPIONSHIP_INVITE" && notification.entityId) {
        const invite =
          championshipInviteMap.get(Number(notification.entityId)) ?? null;
        return formatNotification(notification, {
          championshipInviteStatus: invite?.status ?? null,
          championshipInvite: invite,
        });
      }
      if (notification.type === "LEAGUE_INVITE" && notification.entityId) {
        const invite =
          leagueInviteMap.get(Number(notification.entityId)) ?? null;
        return formatNotification(notification, {
          leagueInviteStatus: invite?.status ?? null,
          leagueInvite: invite,
        });
      }
      if (notification.type === "JOIN_REQUEST" && notification.entityId) {
        const request =
          joinRequestMap.get(Number(notification.entityId)) ?? null;
        return formatNotification(notification, {
          joinRequestStatus: request?.status ?? null,
          joinRequest: request,
        });
      }
      if (
        notification.type === "CHAMPIONSHIP_JOIN_REQUEST" &&
        notification.entityId
      ) {
        const request =
          championshipJoinRequestMap.get(Number(notification.entityId)) ??
          null;
        return formatNotification(notification, {
          championshipJoinRequestStatus: request?.status ?? null,
          championshipJoinRequest: request,
        });
      }
      return formatNotification(notification);
    }),
    unreadCount,
  };
};

export const markNotificationRead = async (userId, notificationId) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) return null;

  if (!notification.isRead) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  return getUnreadCount(userId);
};

export const markAllNotificationsRead = async (userId) => {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return 0;
};
