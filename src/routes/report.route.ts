import { Router } from "express";
import { getMonthlySalesController, getSalesByCategoryController, getSalesByProductController } from "../controllers/sales.report.controller";
import { getStockSummaryController, getStockDetailController } from "../controllers/stock.report.controller";
import { adminAuth } from "../middlewares/admin.auth.middleware";

const router = Router();

// Middleware auth harus di awal
router.use(adminAuth);

// Sales Reports
router.get("/sales/monthly", getMonthlySalesController);
router.get("/sales/by-category", getSalesByCategoryController);
router.get("/sales/by-product", getSalesByProductController);

// Stock Reports
router.get("/stock/summary", getStockSummaryController);
router.get("/stock/detail", getStockDetailController);

export default router;