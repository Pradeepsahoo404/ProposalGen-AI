import { Router } from "express";
import * as uploadController from "../controllers/uploadController";

const router = Router();

router.post("/", uploadController.uploadFile);
router.post("/logo", uploadController.uploadLogo);

export default router;
