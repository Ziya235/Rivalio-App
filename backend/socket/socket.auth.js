import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";

export const authenticateSocket = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true },
    });

    if (!user) {
      return next(new Error("Unauthorized"));
    }

    socket.userId = user.id;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
};
