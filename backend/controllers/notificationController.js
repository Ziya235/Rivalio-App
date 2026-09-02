import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} from "../services/notificationService.js";

const handleServiceError = (res, error) => {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Internal server error",
  });
};

export const getNotifications = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const data = await listNotifications(req.user.id, { limit });
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in getNotifications:", error);
    return handleServiceError(res, error);
  }
};

export const getUnreadNotificationsCount = async (req, res) => {
  try {
    const unreadCount = await getUnreadCount(req.user.id);
    return res.json({ success: true, data: { unreadCount } });
  } catch (error) {
    console.log("Error in getUnreadNotificationsCount:", error);
    return handleServiceError(res, error);
  }
};

export const readNotification = async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    const unreadCount = await markNotificationRead(req.user.id, notificationId);

    if (unreadCount === null) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.json({ success: true, data: { unreadCount } });
  } catch (error) {
    console.log("Error in readNotification:", error);
    return handleServiceError(res, error);
  }
};

export const readAllNotifications = async (req, res) => {
  try {
    const unreadCount = await markAllNotificationsRead(req.user.id);
    return res.json({ success: true, data: { unreadCount } });
  } catch (error) {
    console.log("Error in readAllNotifications:", error);
    return handleServiceError(res, error);
  }
};
