import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getVisibleChampionshipHandler,
  getVisibleMatchHandler,
  getVisibleStandingsHandler,
  getVisibleStatisticsHandler,
  listVisibleChampionshipsHandler,
  listVisibleMatchesHandler,
} from "../controllers/championshipPublicController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", listVisibleChampionshipsHandler);
router.get("/matches/:matchId", getVisibleMatchHandler);
router.get("/:championshipId", getVisibleChampionshipHandler);
router.get("/:championshipId/standings", getVisibleStandingsHandler);
router.get("/:championshipId/matches", listVisibleMatchesHandler);
router.get("/:championshipId/statistics", getVisibleStatisticsHandler);

export default router;
