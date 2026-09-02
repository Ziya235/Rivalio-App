import { createRateLimiter } from "../middlewares/rateLimitMiddleware.js";
import {
  sendMessage,
  markMessagesRead,
  assertParticipant,
  assertDirectFriendshipForConversation,
} from "../services/conversationService.js";
import {
  emitToConversation,
  emitToUser,
} from "./socket.emit.js";
import { trackConversationViewer } from "./conversationRooms.js";
import { userBriefSelect } from "../utils/helpers.js";
import { prisma } from "../config/db.js";

const typingState = new Map();
const typingLimiter = new Map();

const canEmitTyping = (key, intervalMs = 1500) => {
  const now = Date.now();
  const last = typingLimiter.get(key) ?? 0;
  if (now - last < intervalMs) return false;
  typingLimiter.set(key, now);
  return true;
};

export const registerSocketHandlers = (io, socket) => {
  const userId = socket.userId;

  socket.on("join_conversation", async ({ conversationId }) => {
    try {
      const convId = Number(conversationId);
      await assertParticipant(convId, userId);
      await assertDirectFriendshipForConversation(convId, userId);

      socket.join(`conversation:${convId}`);
      trackConversationViewer(userId, convId, true);
    } catch (error) {
      socket.emit("error_message", {
        message: error.message || "Failed to join conversation",
      });
    }
  });

  socket.on("leave_conversation", ({ conversationId }) => {
    const convId = Number(conversationId);
    socket.leave(`conversation:${convId}`);
    trackConversationViewer(userId, convId, false);
  });

  socket.on("send_message", async ({ conversationId, content, clientMessageId }) => {
    try {
      const message = await sendMessage(userId, {
        conversationId,
        content,
        clientMessageId,
      });

      emitToConversation(Number(conversationId), "new_message", { message });
    } catch (error) {
      socket.emit("error_message", {
        message: error.message || "Failed to send message",
        clientMessageId,
      });
    }
  });

  socket.on("mark_messages_read", async ({ conversationId, upToMessageId }) => {
    try {
      const result = await markMessagesRead(
        userId,
        Number(conversationId),
        upToMessageId,
      );

      for (const notifyUserId of result.notifyUserIds) {
        emitToUser(notifyUserId, "messages_read", result);
      }
    } catch (error) {
      socket.emit("error_message", {
        message: error.message || "Failed to mark messages as read",
      });
    }
  });

  socket.on("typing_start", async ({ conversationId }) => {
    const convId = Number(conversationId);
    const key = `${userId}:${convId}:start`;
    if (!canEmitTyping(key)) return;

    try {
      await assertParticipant(convId, userId);
      typingState.set(key, Date.now());

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: userBriefSelect,
      });

      socket.to(`conversation:${convId}`).emit("typing_start", {
        conversationId: convId,
        user,
      });
    } catch {
      // ignore typing errors
    }
  });

  socket.on("typing_stop", async ({ conversationId }) => {
    const convId = Number(conversationId);
    const key = `${userId}:${convId}:stop`;
    if (!canEmitTyping(key, 500)) return;

    try {
      await assertParticipant(convId, userId);
      socket.to(`conversation:${convId}`).emit("typing_stop", {
        conversationId: convId,
        userId,
      });
    } catch {
      // ignore typing errors
    }
  });
};
