import { Router } from "express";
import * as categoryController from "../controllers/category.controller";
import { adminAuth, superAdminAuth } from "../middlewares/admin.auth.middleware";
import { confirmDelete } from "../middlewares/confirm.delete.middleware";

const router = Router();

// SUPER_ADMIN: CRUD Operations | via middlewares
router.use(adminAuth);
router.get("/" , categoryController.getCategories);
router.post("/" , superAdminAuth, categoryController.createCategory);
router.put("/:id" , superAdminAuth, categoryController.updateCategory);
router.delete("/:id" , superAdminAuth, confirmDelete, categoryController.deleteCategory);

router.get("/deleted", superAdminAuth, categoryController.getDeletedCategories);
router.put("/:id/restore", superAdminAuth, categoryController.restoreCategory);

export default router;