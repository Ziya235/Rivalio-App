import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getNotifications,
  getUnreadNotificationsCount,
  readNotification,
  readAllNotifications,
} from "../controllers/notificationController.js";

const router = Router();

router.use(authMiddleware);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadNotificationsCount);
router.patch("/read-all", readAllNotifications);
router.patch("/:id/read", readNotification);

export default router;
