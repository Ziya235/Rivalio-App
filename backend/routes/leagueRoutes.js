import express from "express";
import { createLeague } from "../controllers/leagueController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";
import { permissionMiddleware } from "../middlewares/permissionMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware, // authMiddleware: check if the user is authenticated
  adminMiddleware,
  permissionMiddleware("football", "create"),
  createLeague
);

export default router;