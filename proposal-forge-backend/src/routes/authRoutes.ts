import { Router } from "express";
import * as authController from "../controllers/authController";
import { auth } from "../middleware/auth";

const router = Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/me", auth, authController.me);
router.put("/change-password", auth, authController.changePassword);
router.put("/settings", auth, authController.updateSettings);

export default router;
