import express from "express";
import {
  cancelChallenge,
  createChallenge,
  listMyChallengeNotifications,
  listChallenges,
  requestChallenge,
  respondChallengeRequest,
} from "../controllers/challengeController.js";
import {
  createFriendly,
  createPlayerSearch,
  listMyPlayerSearchNotifications,
  listPlayerSearches,
  requestJoinPlayerSearch,
  respondPlayerSearchRequest,
} from "../controllers/playerSearchController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/challenges", authMiddleware, listChallenges);
router.get(
  "/me/challenge-notifications",
  authMiddleware,
  listMyChallengeNotifications,
);
router.post("/challenges", authMiddleware, createChallenge);
router.post("/challenges/:challengeId/requests", authMiddleware, requestChallenge);
router.post(
  "/challenge-requests/:requestId/respond",
  authMiddleware,
  respondChallengeRequest,
);
router.delete("/challenges/:challengeId", authMiddleware, cancelChallenge);

router.get("/player-searches", authMiddleware, listPlayerSearches);
router.get(
  "/me/player-search-notifications",
  authMiddleware,
  listMyPlayerSearchNotifications,
);
router.post("/player-searches", authMiddleware, createPlayerSearch);
router.post("/friendlies", authMiddleware, createFriendly);
router.post(
  "/player-searches/:searchId/requests",
  authMiddleware,
  requestJoinPlayerSearch,
);
router.post(
  "/player-search-requests/:requestId/respond",
  authMiddleware,
  respondPlayerSearchRequest,
);

export default router;
