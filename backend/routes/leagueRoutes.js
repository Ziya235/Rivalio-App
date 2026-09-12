import express from "express";
import {
  createLeague,
  finishLeague,
  startLeague,
} from "../controllers/leagueController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";
import { permissionMiddleware } from "../middlewares/permissionMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  permissionMiddleware("football", "create"),
  createLeague,
);

router.post(
  "/:leagueId/start",
  authMiddleware,
  adminMiddleware,
  permissionMiddleware("football", "update"),
  startLeague,
);

router.post(
  "/:leagueId/finish",
  authMiddleware,
  adminMiddleware,
  permissionMiddleware("football", "update"),
  finishLeague,
);

export default router;