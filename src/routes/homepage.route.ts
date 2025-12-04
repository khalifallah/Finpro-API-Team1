import { Router } from "express";
import { HomepageController } from "../controllers/homepage.controller";

const router = Router();

// Public routes
router.get("/", HomepageController.getHomepageData);
router.get("/stores/nearest", HomepageController.getAvailableStores);

// Protected route for setting preferred store
// router.patch('/preferred-store', verifyToken, HomepageController.updatePreferredStore);

export default router;
