import { Router } from "express";
import * as categoryController from "../controllers/category.controller";
import { adminAuth, superAdminAuth } from "../middlewares/admin.auth.middleware";
import { confirmDelete } from "../middlewares/confirm.delete.middleware";

const router = Router();

// PUBLIC: Get categories (no auth required)
router.get("/", categoryController.getCategories);

// ADMIN ONLY: Everything else
router.use(adminAuth);

// SUPER ADMIN: CRUD Operations
router.post("/", superAdminAuth, categoryController.createCategory);
router.put("/:id", superAdminAuth, categoryController.updateCategory);
router.delete("/:id", superAdminAuth, confirmDelete, categoryController.deleteCategory);

// SUPER ADMIN: Restore & View Deleted
router.get("/deleted", superAdminAuth, categoryController.getDeletedCategories);
router.put("/:id/restore", superAdminAuth, categoryController.restoreCategory);

export default router;