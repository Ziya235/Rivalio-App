import express from "express";
import { optionalAuthMiddleware } from "../middlewares/optionalAuthMiddleware.js";
import {
  getLeagues,
  getLeagueById,
  getLeagueStandings,
  getLeagueTeams,
  getLeagueTeamById,
  getLeaguePlayers,
  getTeamPlayers,
  getTeamPlayerById,
} from "../controllers/leagueGetController.js";

const router = express.Router();

router.use(optionalAuthMiddleware);

router.get("/", getLeagues);
router.get("/:leagueId", getLeagueById);
router.get("/:leagueId/standings", getLeagueStandings);
router.get("/:leagueId/teams", getLeagueTeams);
router.get("/:leagueId/teams/:teamId", getLeagueTeamById);
router.get("/:leagueId/players", getLeaguePlayers);
router.get("/:leagueId/teams/:teamId/players", getTeamPlayers);
router.get("/:leagueId/teams/:teamId/players/:playerId", getTeamPlayerById);

export default router;
