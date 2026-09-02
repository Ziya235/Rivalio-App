import { Server } from "socket.io";
import { authenticateSocket } from "./socket.auth.js";
import { registerSocketHandlers } from "./socket.handlers.js";
import { addConnection, removeConnection } from "./presence.js";
import { clearUserFromConversationRooms } from "./conversationRooms.js";
import { setIo } from "./socket.emit.js";
import { prisma } from "../config/db.js";

export const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  setIo(io);
  io.use(authenticateSocket);

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);
    addConnection(userId, socket.id);

    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });

    io.emit("user_presence_changed", {
      userId,
      online: true,
      lastSeenAt: new Date(),
    });

    registerSocketHandlers(io, socket);

    socket.on("disconnect", async () => {
      const remaining = removeConnection(userId, socket.id);
      clearUserFromConversationRooms(userId);

      if (remaining === 0) {
        const lastSeenAt = new Date();
        await prisma.user.update({
          where: { id: userId },
          data: { lastSeenAt },
        });

        io.emit("user_presence_changed", {
          userId,
          online: false,
          lastSeenAt,
        });
      }
    });
  });

  return io;
};

export { isUserOnline } from "./presence.js";
export { emitToUser, emitToConversation } from "./socket.emit.js";
export { isUserInConversationRoom } from "./conversationRooms.js";
