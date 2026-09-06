import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { createRateLimiter } from "../middlewares/rateLimitMiddleware.js";
import { getUserProfile, searchUsers } from "../controllers/userController.js";

const router = Router();

const searchLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  keyPrefix: "user-search",
});

router.use(authMiddleware);

router.get("/search", searchLimiter, searchUsers);
router.get("/:userId", getUserProfile);

export default router;
