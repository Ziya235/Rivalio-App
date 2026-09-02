import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { createRateLimiter } from "../middlewares/rateLimitMiddleware.js";
import {
  createFriendRequest,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  acceptRequest,
  rejectRequest,
  getFriends,
  deleteFriend,
  getFriendStatus,
} from "../controllers/friendController.js";
import { getUserPresence } from "../controllers/presenceController.js";

const router = Router();

const friendRequestLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  keyPrefix: "friend-request",
});

router.use(authMiddleware);

router.get("/status/:userId", getFriendStatus);
router.get("/presence/:userId", getUserPresence);
router.get("/", getFriends);
router.post("/requests", friendRequestLimiter, createFriendRequest);
router.get("/requests/incoming", getIncomingFriendRequests);
router.get("/requests/outgoing", getOutgoingFriendRequests);
router.patch("/requests/:id/accept", acceptRequest);
router.patch("/requests/:id/reject", rejectRequest);
router.delete("/:userId", deleteFriend);

export default router;
