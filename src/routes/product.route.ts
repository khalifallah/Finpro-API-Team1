import { Router } from "express";
import * as productController from "../controllers/product.controller";
import { adminAuth, superAdminAuth } from "../middlewares/admin.auth.middleware";
import { uploadImages } from "../middlewares/upload.middleware";
import { confirmDelete } from "../middlewares/confirm.delete.middleware";

const router = Router();

// PUBLIC: Catalog & Search (no auth required)
router.get("/", productController.getProducts);

// PUBLIC: Details by ID (no auth required)
router.get("/:id", productController.getProductById);

// ADMIN ONLY: Everything else
router.use(adminAuth);

// SUPER ADMIN: Restore & View Deleted
router.get("/deleted", superAdminAuth, productController.getDeletedProducts);

// SUPER ADMIN: CRUD Operations
router.post("/", superAdminAuth, uploadImages, productController.createProduct);
router.put("/:id", superAdminAuth, productController.updateProduct);

// Refactor: Image management endpoints
router.post("/:id/images", superAdminAuth, uploadImages, productController.addProductImages);
router.delete("/:id/images/:imageId", superAdminAuth, confirmDelete, productController.deleteProductImage);

// Delete & Restore product
router.delete("/:id", superAdminAuth, confirmDelete, productController.deleteProduct);
router.put("/:id/restore", superAdminAuth, productController.restoreProduct);

export default router;
