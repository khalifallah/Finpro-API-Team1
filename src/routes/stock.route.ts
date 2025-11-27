import { Router } from "express";
import * as stockController from "../controllers/stock.controller";
import { adminAuth, superAdminAuth } from "../middlewares/admin.auth.middleware";
import { confirmDelete } from "../middlewares/confirm.delete.middleware";

const router = Router();

router.use(adminAuth); // all Routes require admin auth

// Public to admins: List and details
router.get("/" , stockController.getStocks);
router.get("/:id", stockController.getStockById);
router.get("/:id/journals", stockController.getStockJournals);

//  Super Admin only: CRUD OPS
router.post("/", superAdminAuth, stockController.createStock);
router.put("/:id", stockController.updateStock); // STORE_ADMIN can update their own store's stock
router.delete("/:id", confirmDelete, stockController.deleteStock); // STORE_ADMIN can delete their own store's stock

export default router;