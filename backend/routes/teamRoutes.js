import express from "express";
import { deleteTeam } from "../controllers/teamController.js";
import {
  inviteTeamToLeague,
  listLeagueInvites,
  listLeagueJoinRequests,
  listMyTeamInvites,
  removeTeamFromLeague,
  requestJoinPublicLeague,
  respondJoinRequest,
  respondTeamInvite,
} from "../controllers/leagueRequestController.js";
import {
  addPlayerByUsername,
  createUserTeam,
  getTeamById,
  listTeams,
  removeTeamPlayer,
} from "../controllers/userTeamController.js";
import {
  invitePlayerToTeam,
  listMyTeamPlayerInviteNotifications,
  respondTeamPlayerInvite,
} from "../controllers/teamPlayerInviteController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";
import { permissionMiddleware } from "../middlewares/permissionMiddleware.js";

const router = express.Router();

// —— User teams ——
router.get("/teams", authMiddleware, listTeams);
router.post("/teams", authMiddleware, createUserTeam);
router.get("/teams/:teamId", authMiddleware, getTeamById);
router.post("/teams/:teamId/players/by-username", authMiddleware, addPlayerByUsername);
router.post(
  "/teams/:teamId/player-invites",
  authMiddleware,
  invitePlayerToTeam,
);
router.delete("/teams/:teamId/players/:playerId", authMiddleware, removeTeamPlayer);
router.get(
  "/me/team-player-invite-notifications",
  authMiddleware,
  listMyTeamPlayerInviteNotifications,
);
router.post(
  "/team-player-invites/:inviteId/respond",
  authMiddleware,
  respondTeamPlayerInvite,
);

// —— League invites / join requests ——
router.get("/me/team-invites", authMiddleware, listMyTeamInvites);
router.post("/team-invites/:inviteId/respond", authMiddleware, respondTeamInvite);

router.post(
  "/leagues/:leagueId/team-invites",
  authMiddleware,
  adminMiddleware,
  permissionMiddleware("football", "create"),
  inviteTeamToLeague,
);
router.get(
  "/leagues/:leagueId/team-invites",
  authMiddleware,
  adminMiddleware,
  listLeagueInvites,
);

router.post(
  "/leagues/:leagueId/join-requests",
  authMiddleware,
  requestJoinPublicLeague,
);
router.get(
  "/leagues/:leagueId/join-requests",
  authMiddleware,
  adminMiddleware,
  listLeagueJoinRequests,
);
router.post(
  "/league-join-requests/:requestId/respond",
  authMiddleware,
  adminMiddleware,
  respondJoinRequest,
);

router.delete(
  "/leagues/:leagueId/teams/:teamId",
  authMiddleware,
  adminMiddleware,
  permissionMiddleware("football", "update"),
  removeTeamFromLeague,
);

// backward-compat alias
router.delete(
  "/leagues/:leagueId/teams/:teamId/legacy",
  authMiddleware,
  adminMiddleware,
  permissionMiddleware("football", "update"),
  deleteTeam,
);

export default router;
