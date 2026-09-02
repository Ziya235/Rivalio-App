import { prisma } from "../config/db.js";
import { userBriefSelect } from "../utils/helpers.js";
import { areFriendsWhere, canonicalPair } from "../utils/friendship.js";
import {
  createNotification,
  markFriendRequestNotificationsRead,
} from "./notificationService.js";
import { emitToUser } from "../socket/socket.emit.js";

const friendRequestInclude = {
  sender: { select: userBriefSelect },
  receiver: { select: userBriefSelect },
};

export const formatFriendRequest = (request) => ({
  id: request.id,
  senderId: request.senderId,
  receiverId: request.receiverId,
  status: request.status,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
  sender: request.sender,
  receiver: request.receiver,
});

export const getFriendshipStatus = async (currentUserId, otherUserId) => {
  const otherId = Number(otherUserId);
  if (currentUserId === otherId) {
    return { status: "SELF" };
  }

  const friendship = await prisma.friendship.findUnique({
    where: { user1Id_user2Id: areFriendsWhere(currentUserId, otherId) },
  });

  if (friendship) {
    return { status: "FRIENDS", friendshipId: friendship.id };
  }

  const [incoming, outgoing] = await Promise.all([
    prisma.friendRequest.findFirst({
      where: {
        senderId: otherId,
        receiverId: currentUserId,
        status: "PENDING",
      },
      include: friendRequestInclude,
    }),
    prisma.friendRequest.findFirst({
      where: {
        senderId: currentUserId,
        receiverId: otherId,
        status: "PENDING",
      },
      include: friendRequestInclude,
    }),
  ]);

  if (incoming) {
    return {
      status: "INCOMING_PENDING",
      request: formatFriendRequest(incoming),
    };
  }

  if (outgoing) {
    return {
      status: "OUTGOING_PENDING",
      request: formatFriendRequest(outgoing),
    };
  }

  return { status: "NONE" };
};

export const sendFriendRequest = async (senderId, receiverId) => {
  const receiver = Number(receiverId);

  if (!Number.isInteger(receiver) || receiver <= 0) {
    const error = new Error("Valid receiverId is required");
    error.status = 400;
    throw error;
  }

  if (senderId === receiver) {
    const error = new Error("You cannot send a friend request to yourself");
    error.status = 400;
    throw error;
  }

  const receiverUser = await prisma.user.findUnique({
    where: { id: receiver },
    select: { id: true },
  });

  if (!receiverUser) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  const existingFriendship = await prisma.friendship.findUnique({
    where: { user1Id_user2Id: areFriendsWhere(senderId, receiver) },
  });

  if (existingFriendship) {
    const error = new Error("You are already friends with this user");
    error.status = 409;
    throw error;
  }

  const existingRequest = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId, receiverId: receiver, status: "PENDING" },
        { senderId: receiver, receiverId: senderId, status: "PENDING" },
      ],
    },
  });

  if (existingRequest) {
    const error = new Error("A pending friend request already exists");
    error.status = 409;
    throw error;
  }

  const priorRequest = await prisma.friendRequest.findUnique({
    where: { senderId_receiverId: { senderId, receiverId: receiver } },
  });

  let friendRequest;

  if (priorRequest && priorRequest.status !== "PENDING") {
    friendRequest = await prisma.friendRequest.update({
      where: { id: priorRequest.id },
      data: { status: "PENDING", updatedAt: new Date() },
      include: friendRequestInclude,
    });
  } else if (priorRequest) {
    const error = new Error("A pending friend request already exists");
    error.status = 409;
    throw error;
  } else {
    friendRequest = await prisma.friendRequest.create({
      data: { senderId, receiverId: receiver },
      include: friendRequestInclude,
    });
  }

  await createNotification({
    userId: receiver,
    actorId: senderId,
    type: "FRIEND_REQUEST",
    entityId: friendRequest.id,
  });

  emitToUser(receiver, "friend_request_received", {
    friendRequestId: friendRequest.id,
    sender: friendRequest.sender,
    createdAt: friendRequest.createdAt,
  });

  return formatFriendRequest(friendRequest);
};

export const listIncomingRequests = async (userId) => {
  const requests = await prisma.friendRequest.findMany({
    where: { receiverId: userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: friendRequestInclude,
  });
  return requests.map(formatFriendRequest);
};

export const listOutgoingRequests = async (userId) => {
  const requests = await prisma.friendRequest.findMany({
    where: { senderId: userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: friendRequestInclude,
  });
  return requests.map(formatFriendRequest);
};

export const acceptFriendRequest = async (userId, requestId) => {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
    include: friendRequestInclude,
  });

  if (!request) {
    const error = new Error("Friend request not found");
    error.status = 404;
    throw error;
  }

  if (request.receiverId !== userId) {
    const error = new Error("You cannot accept this friend request");
    error.status = 403;
    throw error;
  }

  if (request.status !== "PENDING") {
    const error = new Error("Friend request is no longer pending");
    error.status = 409;
    throw error;
  }

  const [user1Id, user2Id] = canonicalPair(request.senderId, request.receiverId);

  const result = await prisma.$transaction(async (tx) => {
    await tx.friendRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED" },
    });

    const friendship = await tx.friendship.upsert({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      create: { user1Id, user2Id },
      update: {},
    });

    return friendship;
  });

  await markFriendRequestNotificationsRead(userId, requestId);

  await createNotification({
    userId: request.senderId,
    actorId: userId,
    type: "FRIEND_ACCEPTED",
    entityId: result.id,
  });

  emitToUser(userId, "friend_request_resolved", {
    friendRequestId: request.id,
    status: "ACCEPTED",
  });

  emitToUser(request.senderId, "friend_request_accepted", {
    friendRequestId: request.id,
    friendshipId: result.id,
    acceptedBy: request.receiver,
    createdAt: new Date(),
  });

  return { friendship: result, request: formatFriendRequest({ ...request, status: "ACCEPTED" }) };
};

export const rejectFriendRequest = async (userId, requestId) => {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
    include: friendRequestInclude,
  });

  if (!request) {
    const error = new Error("Friend request not found");
    error.status = 404;
    throw error;
  }

  if (request.receiverId !== userId) {
    const error = new Error("You cannot reject this friend request");
    error.status = 403;
    throw error;
  }

  if (request.status !== "PENDING") {
    const error = new Error("Friend request is no longer pending");
    error.status = 409;
    throw error;
  }

  const updated = await prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED" },
    include: friendRequestInclude,
  });

  await markFriendRequestNotificationsRead(userId, requestId);

  emitToUser(userId, "friend_request_resolved", {
    friendRequestId: request.id,
    status: "REJECTED",
  });

  return formatFriendRequest(updated);
};

export const listFriends = async (userId) => {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      user1: { select: userBriefSelect },
      user2: { select: userBriefSelect },
    },
  });

  return friendships.map((friendship) => {
    const friend =
      friendship.user1Id === userId ? friendship.user2 : friendship.user1;
    return {
      friendshipId: friendship.id,
      friend,
      createdAt: friendship.createdAt,
    };
  });
};

export const removeFriend = async (userId, friendUserId) => {
  const otherId = Number(friendUserId);
  if (!Number.isInteger(otherId) || otherId <= 0) {
    const error = new Error("Valid userId is required");
    error.status = 400;
    throw error;
  }

  const friendship = await prisma.friendship.findUnique({
    where: { user1Id_user2Id: areFriendsWhere(userId, otherId) },
  });

  if (!friendship) {
    const error = new Error("Friendship not found");
    error.status = 404;
    throw error;
  }

  await prisma.friendship.delete({ where: { id: friendship.id } });
  return { success: true };
};

export const assertFriendship = async (userIdA, userIdB) => {
  const friendship = await prisma.friendship.findUnique({
    where: { user1Id_user2Id: areFriendsWhere(userIdA, userIdB) },
  });

  if (!friendship) {
    const error = new Error("You must be friends to perform this action");
    error.status = 403;
    throw error;
  }

  return friendship;
};
