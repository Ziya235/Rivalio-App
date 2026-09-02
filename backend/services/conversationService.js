import { prisma } from "../config/db.js";
import { userBriefSelect } from "../utils/helpers.js";
import { assertFriendship } from "./friendService.js";
import { createNotification } from "./notificationService.js";
import { isUserInConversationRoom } from "../socket/conversationRooms.js";

export const MAX_MESSAGE_LENGTH = 5000;

export const validateMessageContent = (content) => {
  if (typeof content !== "string") {
    const error = new Error("Message content is required");
    error.status = 400;
    throw error;
  }

  const trimmed = content.trim();
  if (!trimmed) {
    const error = new Error("Message cannot be empty");
    error.status = 400;
    throw error;
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    const error = new Error(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`);
    error.status = 400;
    throw error;
  }

  return trimmed;
};

export const getParticipant = async (conversationId, userId) =>
  prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

export const assertParticipant = async (conversationId, userId) => {
  const participant = await getParticipant(conversationId, userId);
  if (!participant) {
    const error = new Error("You are not a participant in this conversation");
    error.status = 403;
    throw error;
  }
  return participant;
};

export const findDirectConversation = async (userIdA, userIdB) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      type: "DIRECT",
      participants: {
        every: {
          userId: { in: [userIdA, userIdB] },
        },
      },
      AND: [
        { participants: { some: { userId: userIdA } } },
        { participants: { some: { userId: userIdB } } },
      ],
    },
    include: {
      participants: {
        include: { user: { select: userBriefSelect } },
      },
    },
  });

  return (
    conversations.find((conversation) => conversation.participants.length === 2) ??
    null
  );
};

export const getOrCreateDirectConversation = async (currentUserId, otherUserId) => {
  const otherId = Number(otherUserId);
  if (!Number.isInteger(otherId) || otherId <= 0) {
    const error = new Error("Valid userId is required");
    error.status = 400;
    throw error;
  }

  if (currentUserId === otherId) {
    const error = new Error("You cannot start a conversation with yourself");
    error.status = 400;
    throw error;
  }

  await assertFriendship(currentUserId, otherId);

  const existing = await findDirectConversation(currentUserId, otherId);
  if (existing) {
    return formatConversation(existing, currentUserId);
  }

  const conversation = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      participants: {
        create: [{ userId: currentUserId }, { userId: otherId }],
      },
    },
    include: {
      participants: {
        include: { user: { select: userBriefSelect } },
      },
    },
  });

  return formatConversation(conversation, currentUserId);
};

export const formatConversation = (conversation, currentUserId, extras = {}) => {
  const otherParticipant = conversation.participants.find(
    (participant) => participant.userId !== currentUserId,
  );

  return {
    id: conversation.id,
    type: conversation.type,
    otherParticipant: otherParticipant?.user ?? null,
    lastMessage: extras.lastMessage ?? null,
    lastMessageAt: extras.lastMessageAt ?? conversation.updatedAt,
    unreadCount: extras.unreadCount ?? 0,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
};

export const listConversations = async (userId) => {
  const participations = await prisma.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          participants: {
            include: { user: { select: userBriefSelect } },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: { select: userBriefSelect },
            },
          },
        },
      },
    },
  });

  const formatted = await Promise.all(
    participations.map(async (participation) => {
      const { conversation } = participation;
      const lastMessage = conversation.messages[0] ?? null;
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          deletedAt: null,
          senderId: { not: userId },
          createdAt: participation.lastReadAt
            ? { gt: participation.lastReadAt }
            : undefined,
        },
      });

      return formatConversation(conversation, userId, {
        lastMessage: lastMessage ? formatMessage(lastMessage) : null,
        lastMessageAt: lastMessage?.createdAt ?? conversation.updatedAt,
        unreadCount,
      });
    }),
  );

  return formatted.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
};

export const formatMessage = (message, readByOthers = false) => ({
  id: message.id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  content: message.content,
  clientMessageId: message.clientMessageId,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
  deletedAt: message.deletedAt,
  sender: message.sender ?? null,
  readByOthers,
});

export const getConversationMessages = async (
  userId,
  conversationId,
  { cursor, limit = 30 } = {},
) => {
  await assertParticipant(conversationId, userId);

  const take = Math.min(Math.max(Number(limit) || 30, 1), 100);

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,
      ...(cursor
        ? {
            id: { lt: Number(cursor) },
          }
        : {}),
    },
    orderBy: { id: "desc" },
    take,
    include: {
      sender: { select: userBriefSelect },
    },
  });

  const participant = await getParticipant(conversationId, userId);
  const otherParticipants = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: userId } },
  });

  const formatted = messages.reverse().map((message) => {
    const readByOthers =
      message.senderId === userId &&
      otherParticipants.some(
        (other) =>
          other.lastReadAt && other.lastReadAt >= message.createdAt,
      );

    return formatMessage(message, readByOthers);
  });

  const nextCursor = messages.length === take ? messages[0]?.id ?? null : null;

  return {
    messages: formatted,
    nextCursor,
    hasMore: messages.length === take,
  };
};

export const sendMessage = async (
  senderId,
  { conversationId, content, clientMessageId },
) => {
  const trimmed = validateMessageContent(content);
  const convId = Number(conversationId);

  if (!Number.isInteger(convId) || convId <= 0) {
    const error = new Error("Valid conversationId is required");
    error.status = 400;
    throw error;
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: convId },
    include: {
      participants: true,
    },
  });

  if (!conversation) {
    const error = new Error("Conversation not found");
    error.status = 404;
    throw error;
  }

  await assertParticipant(convId, senderId);

  if (conversation.type === "DIRECT") {
    const other = conversation.participants.find(
      (participant) => participant.userId !== senderId,
    );
    if (other) {
      await assertFriendship(senderId, other.userId);
    }
  }

  if (clientMessageId) {
    const existing = await prisma.message.findUnique({
      where: {
        conversationId_clientMessageId: {
          conversationId: convId,
          clientMessageId: String(clientMessageId),
        },
      },
      include: {
        sender: { select: userBriefSelect },
      },
    });

    if (existing) {
      return formatMessage(existing, false);
    }
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId: convId,
        senderId,
        content: trimmed,
        clientMessageId: clientMessageId ? String(clientMessageId) : null,
      },
      include: {
        sender: { select: userBriefSelect },
      },
    });

    await tx.conversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    });

    return created;
  });

  const formatted = formatMessage(message, false);

  const recipients = conversation.participants.filter(
    (participant) => participant.userId !== senderId,
  );

  for (const recipient of recipients) {
    const inRoom = isUserInConversationRoom(recipient.userId, convId);
    if (!inRoom) {
      await createNotification({
        userId: recipient.userId,
        actorId: senderId,
        type: "NEW_MESSAGE",
        entityId: convId,
      });
    }
  }

  return formatted;
};

export const markMessagesRead = async (userId, conversationId, upToMessageId) => {
  await assertParticipant(conversationId, userId);

  const readAt = new Date();

  await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: { conversationId, userId },
    },
    data: { lastReadAt: readAt },
  });

  const unreadMessages = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,
      senderId: { not: userId },
      ...(upToMessageId ? { id: { lte: Number(upToMessageId) } } : {}),
    },
    select: { id: true },
  });

  if (unreadMessages.length > 0) {
    await prisma.messageReadReceipt.createMany({
      data: unreadMessages.map((message) => ({
        messageId: message.id,
        userId,
        readAt,
      })),
      skipDuplicates: true,
    });
  }

  const otherParticipants = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: userId } },
    select: { userId: true },
  });

  return {
    conversationId,
    readByUserId: userId,
    readAt,
    upToMessageId: upToMessageId ?? null,
    notifyUserIds: otherParticipants.map((participant) => participant.userId),
  };
};

export const assertDirectFriendshipForConversation = async (conversationId, userId) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: true },
  });

  if (!conversation || conversation.type !== "DIRECT") return;

  const other = conversation.participants.find(
    (participant) => participant.userId !== userId,
  );

  if (other) {
    await assertFriendship(userId, other.userId);
  }
};
