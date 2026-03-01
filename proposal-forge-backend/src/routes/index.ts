import { Router } from "express";
import proposalRoutes from "./proposalRoutes";
import authRoutes from "./authRoutes";
import * as proposalController from "../controllers/proposalController";
import * as templateController from "../controllers/templateController";

const router = Router();

router.get("/templates", templateController.getTemplates);
router.get("/view-shared/:token", proposalController.viewSharedHandler);
router.use("/auth", authRoutes);
router.use("/proposals", proposalRoutes);

export default router;
