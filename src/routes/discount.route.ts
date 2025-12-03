import { Router } from "express";
import * as discountController from "../controllers/discount.controller";
import { adminAuth } from "../middlewares/admin.auth.middleware";
import { confirmDelete } from "../middlewares/confirm.delete.middleware";

const router = Router();

router.use(adminAuth);

// Public to admins: List and details
router.get("/", discountController.getDiscountRules);
router.get("/:id/usages", discountController.getDiscountUsages); 
router.get("/:id", discountController.getDiscountById);
router.get("/deleted", discountController.getDeletedDiscountRules);

// STORE_ADMIN: CRUD-OPS
router.post("/", discountController.createDiscountRule);
router.put("/:id/restore", discountController.restoreDiscountRule);
router.put("/:id", discountController.updateDiscountRule);
router.delete("/:id", confirmDelete, discountController.deleteDiscountRule);

// Apply discount by STORE_ADMINS
router.post("/apply", discountController.applyDiscount);

export default router;