import { prisma } from "../config/db.js";
import { userBriefSelect } from "../utils/helpers.js";
import { emitToUser } from "../socket/socket.emit.js";

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

  if (emitEvent) {
    emitToUser(userId, "notification_received", {
      notification: formatNotification(notification),
      unreadCount: await getUnreadCount(userId),
    });
  }

  return notification;
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

  const friendRequestIds = notifications
    .filter((item) => item.type === "FRIEND_REQUEST" && item.entityId)
    .map((item) => Number(item.entityId))
    .filter((id) => Number.isInteger(id) && id > 0);

  const championshipInviteIds = notifications
    .filter((item) => item.type === "CHAMPIONSHIP_INVITE" && item.entityId)
    .map((item) => Number(item.entityId))
    .filter((id) => Number.isInteger(id) && id > 0);

  const [friendRequests, championshipInvites] = await Promise.all([
    friendRequestIds.length > 0
      ? prisma.friendRequest.findMany({
          where: { id: { in: friendRequestIds } },
          select: { id: true, status: true },
        })
      : Promise.resolve([]),
    championshipInviteIds.length > 0
      ? prisma.championshipTeamInvite.findMany({
          where: { id: { in: championshipInviteIds } },
          select: {
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
          },
        })
      : Promise.resolve([]),
  ]);

  const friendRequestStatusMap = new Map(
    friendRequests.map((request) => [request.id, request.status]),
  );
  const championshipInviteMap = new Map(
    championshipInvites.map((invite) => [invite.id, invite]),
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
