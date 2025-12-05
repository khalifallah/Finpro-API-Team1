import { Router } from "express";
import { getMonthlySalesController, getSalesByCategoryController, getSalesByProductController } from "../controllers/sales.report.controller";
import { getStockSummaryController, getStockDetailController } from "../controllers/stock.report.controller";
import { adminAuth } from "../middlewares/admin.auth.middleware";
import { validateRequest } from "../middlewares/validator.middleware";
import { salesReportSchema, stockReportSchema } from "../validations/report.validation";

const router = Router();

router.use(adminAuth); // Require admin auth untuk semua report endpoints

// Sales Reports
router.get("/sales/monthly", validateRequest(salesReportSchema), getMonthlySalesController);
router.get("/sales/by-category", validateRequest(salesReportSchema), getSalesByCategoryController);
router.get("/sales/by-product", validateRequest(salesReportSchema), getSalesByProductController);

// Stock Reports
router.get("/stock/summary", validateRequest(stockReportSchema), getStockSummaryController);
router.get("/stock/detail", validateRequest(stockReportSchema), getStockDetailController);

export default router;