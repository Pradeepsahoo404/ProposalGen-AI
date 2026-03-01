import { Router } from "express";
import * as proposalController from "../controllers/proposalController";
import { auth } from "../middleware/auth";

const router = Router();

router.use(auth);

router.get("/stats", proposalController.getStats);
router.get("/analytics", proposalController.getAnalytics);
router.get("/", proposalController.getProposals);
router.post("/generate-proposal", proposalController.generateProposalHandler);
router.post("/download-proposal", proposalController.downloadProposalHandler);
router.post("/share", proposalController.shareProposalHandler);
router.get("/:id", proposalController.getProposalById);
router.post("/:id/duplicate", proposalController.duplicateProposal);
router.post("/", proposalController.createProposal);
router.put("/:id", proposalController.updateProposal);
router.delete("/:id", proposalController.deleteProposal);

export default router;
