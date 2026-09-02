import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  createDirectConversation,
  getConversations,
  getMessages,
} from "../controllers/conversationController.js";

const router = Router();

router.use(authMiddleware);

router.get("/", getConversations);
router.post("/direct/:userId", createDirectConversation);
router.get("/:conversationId/messages", getMessages);

export default router;
