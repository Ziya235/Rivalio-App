import express from "express";
import {
  login,
  me,
  register,
  updateProfile,
  updateProfileImage,
} from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { uploadUserImage } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, me);
router.patch("/me", authMiddleware, updateProfile);
router.post(
  "/me/image",
  authMiddleware,
  (req, res, next) => {
    uploadUserImage(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Image upload failed",
        });
      }
      return next();
    });
  },
  updateProfileImage,
);

export default router;
