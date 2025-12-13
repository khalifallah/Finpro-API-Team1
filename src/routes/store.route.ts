import { Router } from "express";
import { StoreController } from "../controllers/store.controller";
import { superAdminAuth } from "../middlewares/admin.auth.middleware";
import { verifyToken } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validator.middleware";
import {
  createStoreSchema,
  updateStoreSchema,
  assignStoreAdminSchema,
} from "../validations/store.validation";

const router = Router();

// All routes require super admin access
router.use(verifyToken);
router.get("/", StoreController.getStores);
router.use(superAdminAuth);

// Store Management Routes
router.get("/deleted", StoreController.getDeletedStores);
router.get("/:id", StoreController.getStoreById);
router.post(
  "/",
  validateRequest(createStoreSchema),
  StoreController.createStore
);
router.put(
  "/:id",
  validateRequest(updateStoreSchema),
  StoreController.updateStore
);
router.delete("/:id", StoreController.deleteStore);
router.patch("/:id/restore", StoreController.restoreStore);

// Assign Store Admin Routes
router.post(
  "/assign-admin",
  validateRequest(assignStoreAdminSchema),
  StoreController.assignStoreAdmin
);
router.delete("/remove-admin/:userId", StoreController.removeStoreAdmin);
router.get("/available-admins", StoreController.getAvailableStoreAdmins);
router.get("/:storeId/admins", StoreController.getStoreAdminsByStoreId);

export default router;
