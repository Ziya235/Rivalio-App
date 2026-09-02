import { prisma } from "../config/db.js";
import { isUserOnline } from "../socket/presence.js";

const handleServiceError = (res, error) => {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Internal server error",
  });
};

export const getUserPresence = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, lastSeenAt: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: {
        userId: user.id,
        online: isUserOnline(user.id),
        lastSeenAt: user.lastSeenAt,
      },
    });
  } catch (error) {
    console.log("Error in getUserPresence:", error);
    return handleServiceError(res, error);
  }
};
