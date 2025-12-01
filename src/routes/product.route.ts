import { Router } from "express";
import * as productController from "../controllers/product.controller";
import { adminAuth, superAdminAuth } from "../middlewares/admin.auth.middleware";
import { uploadImages } from "../middlewares/upload.middleware";
import { confirmDelete } from "../middlewares/confirm.delete.middleware";

const router = Router();

// Public: Catalog, Search, Details
router.get("/", productController.getProducts);

// SUPER_ADMIN: Restore & GET Soft-Deleted Product (MUST be BEFORE /:id route)
router.use(adminAuth);
router.get("/deleted", superAdminAuth, productController.getDeletedProducts);

// Public: Details by ID (AFTER /deleted to avoid conflict)
router.get("/:id", productController.getProductById);

// SUPER_ADMIN: CRUD Operations
router.post("/", superAdminAuth, uploadImages, productController.createProduct);
router.put("/:id", superAdminAuth, productController.updateProduct);
router.delete("/:id", superAdminAuth, confirmDelete, productController.deleteProduct);
router.put("/:id/restore", superAdminAuth, productController.restoreProduct);

export default router;
