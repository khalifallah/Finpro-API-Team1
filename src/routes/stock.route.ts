import { Router } from "express";
import * as stockController from "../controllers/stock.controller";
import { adminAuth } from "../middlewares/admin.auth.middleware"; 
import { confirmDelete } from "../middlewares/confirm.delete.middleware";

const router = Router();

router.use(adminAuth); // All routes require admin auth

// Public to admins: List and details
router.get("/", stockController.getStocks);
router.get("/:id", stockController.getStockById);
router.get("/:id/journals", stockController.getStockJournals);

// All admins can create stock (store validated in controller)
router.post("/", stockController.createStock);

// All admins: Update stock (authorization checked in controller)
router.put("/:id", stockController.updateStock);

// All admins: Restore deleted stock
router.patch("/:id/restore", stockController.restoreStock);

// All admins: Delete stock with confirmation (authorization checked in controller)
router.delete("/:id", confirmDelete, stockController.deleteStock);

export default router;