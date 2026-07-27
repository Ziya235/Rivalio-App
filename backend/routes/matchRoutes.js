import express from "express";
import {
  addMatchEvent,
  createMatch,
  deleteMatch,
  deleteMatchEvent,
  getMatchById,
  listLeagueMatches,
  listMyMatches,
  updateMatch,
} from "../controllers/matchController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";
import { permissionMiddleware } from "../middlewares/permissionMiddleware.js";
import { optionalAuthMiddleware } from "../middlewares/optionalAuthMiddleware.js";

const router = express.Router();

router.get(
  "/matches/mine",
  authMiddleware,
  adminMiddleware,
  listMyMatches,
);

router.get("/leagues/:leagueId/matches", optionalAuthMiddleware, listLeagueMatches);
router.get("/matches/:matchId", optionalAuthMiddleware, getMatchById);

router.post(
  "/leagues/:leagueId/matches",
  authMiddleware,
  adminMiddleware,
  permissionMiddleware("football", "create"),
  createMatch,
);

router.patch(
  "/matches/:matchId",
  authMiddleware,
  adminMiddleware,
  permissionMiddleware("football", "update"),
  updateMatch,
);

router.delete(
  "/matches/:matchId",
  authMiddleware,
  adminMiddleware,
  permissionMiddleware("football", "update"),
  deleteMatch,
);

router.post(
  "/matches/:matchId/events",
  authMiddleware,
  adminMiddleware,
  permissionMiddleware("football", "update"),
  addMatchEvent,
);

router.delete(
  "/matches/:matchId/events/:eventId",
  authMiddleware,
  adminMiddleware,
  permissionMiddleware("football", "update"),
  deleteMatchEvent,
);

export default router;
