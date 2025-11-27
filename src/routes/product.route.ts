import { Router } from "express";
import * as productController from "../controllers/product.controller";
import { adminAuth, superAdminAuth } from "../middlewares/admin.auth.middleware";
import { uploadImages } from "../middlewares/upload.middleware";
import { confirmDelete } from "../middlewares/confirm.delete.middleware";

const router = Router();

// Public: Catalog , Search , Details
router.get("/", productController.getProducts);
router.get("/:id", productController.getProductById);

// SUPER_ADMIN: CRUD Operations | via middlewares
router.use(adminAuth);
router.post("/", superAdminAuth, uploadImages, productController.createProduct);
router.put("/:id", superAdminAuth, productController.updateProduct);
router.delete("/:id", superAdminAuth, confirmDelete, productController.deleteProduct);

export default router;
