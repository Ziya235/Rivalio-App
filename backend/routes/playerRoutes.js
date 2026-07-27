import express from "express";
import {
  createPlayer,
  deletePlayer,
} from "../controllers/playerController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";
import { permissionMiddleware } from "../middlewares/permissionMiddleware.js";

const router = express.Router();

router.post(
  "/teams/:teamId/players",
  authMiddleware,
  adminMiddleware,
  permissionMiddleware("football", "create"),
  createPlayer,
);

router.delete(
  "/leagues/:leagueId/teams/:teamId/players/:playerId",
  authMiddleware,
  adminMiddleware,
  permissionMiddleware("football", "update"),
  deletePlayer,
);

export default router;
