import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  createDirectConversation,
  getConversations,
  getMessages,
  getUnreadPeople,
} from "../controllers/conversationController.js";

const router = Router();

router.use(authMiddleware);

router.get("/", getConversations);
router.get("/unread-people", getUnreadPeople);
router.post("/direct/:userId", createDirectConversation);
router.get("/:conversationId/messages", getMessages);

export default router;
