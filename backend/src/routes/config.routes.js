import { Router } from "express";
import { getConfig, updateConfig } from "../controller/config.controller.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Publicly available to check for updates/links
router.get("/", getConfig);

// Protected admin-only update
router.put("/", protectRoute, requireAdmin, updateConfig);

export default router;
