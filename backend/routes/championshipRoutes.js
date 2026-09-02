import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";
import { permissionMiddleware } from "../middlewares/permissionMiddleware.js";
import {
  addGroupTeamHandler,
  addTeamHandler,
  championshipStandingsHandler,
  createChampionshipHandler,
  createGroupsHandler,
  createMatchHandler,
  deleteChampionshipHandler,
  deleteGroupHandler,
  deleteMatchHandler,
  generateMatchesHandler,
  getChampionshipHandler,
  getMatchHandler,
  groupStandingsHandler,
  listChampionshipsHandler,
  listGroupsHandler,
  listMatchesHandler,
  listTeamsHandler,
  removeGroupTeamHandler,
  removeTeamHandler,
  setMatchResultHandler,
  startGroupStageHandler,
  startPlayoffHandler,
  transitionStatusHandler,
  updateChampionshipHandler,
  updateGroupHandler,
  updateMatchHandler,
} from "../controllers/championshipController.js";

const router = express.Router();

const adminRead = [
  authMiddleware,
  adminMiddleware,
  permissionMiddleware("football", "create"),
];
const adminWrite = [
  authMiddleware,
  adminMiddleware,
  permissionMiddleware("football", "update"),
];

// Static path segments BEFORE /:championshipId
router.get("/", ...adminRead, listChampionshipsHandler);
router.post("/", ...adminRead, createChampionshipHandler);

router.patch("/groups/:groupId", ...adminWrite, updateGroupHandler);
router.delete("/groups/:groupId", ...adminWrite, deleteGroupHandler);
router.post("/groups/:groupId/teams", ...adminWrite, addGroupTeamHandler);
router.delete(
  "/groups/:groupId/teams/:teamId",
  ...adminWrite,
  removeGroupTeamHandler,
);
router.get("/groups/:groupId/standings", ...adminRead, groupStandingsHandler);

router.get("/matches/:matchId", ...adminRead, getMatchHandler);
router.patch("/matches/:matchId", ...adminWrite, updateMatchHandler);
router.put("/matches/:matchId/result", ...adminWrite, setMatchResultHandler);
router.delete("/matches/:matchId", ...adminWrite, deleteMatchHandler);

router.get("/:championshipId", ...adminRead, getChampionshipHandler);
router.patch("/:championshipId", ...adminWrite, updateChampionshipHandler);
router.delete("/:championshipId", ...adminWrite, deleteChampionshipHandler);
router.post("/:championshipId/status", ...adminWrite, transitionStatusHandler);
router.post(
  "/:championshipId/start-group-stage",
  ...adminWrite,
  startGroupStageHandler,
);
router.post(
  "/:championshipId/start-playoff",
  ...adminWrite,
  startPlayoffHandler,
);

router.get("/:championshipId/teams", ...adminRead, listTeamsHandler);
router.post("/:championshipId/teams", ...adminWrite, addTeamHandler);
router.delete(
  "/:championshipId/teams/:teamId",
  ...adminWrite,
  removeTeamHandler,
);

router.get("/:championshipId/groups", ...adminRead, listGroupsHandler);
router.post("/:championshipId/groups", ...adminWrite, createGroupsHandler);

router.get(
  "/:championshipId/standings",
  ...adminRead,
  championshipStandingsHandler,
);

router.get("/:championshipId/matches", ...adminRead, listMatchesHandler);
router.post("/:championshipId/matches", ...adminWrite, createMatchHandler);
router.post(
  "/:championshipId/matches/generate",
  ...adminWrite,
  generateMatchesHandler,
);

export default router;
