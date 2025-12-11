import { Router, Request, Response, NextFunction } from "express";
import { 
  getMonthlySalesController, 
  getSalesByCategoryController, 
  getSalesByProductController 
} from "../controllers/sales.report.controller";
import { 
  getStockSummaryController, 
  getStockDetailController 
} from "../controllers/stock.report.controller";
import { adminAuth } from "../middlewares/admin.auth.middleware";
import { salesReportSchema, stockReportSchema } from "../validations/report.validation";

const router = Router();

// Middleware auth harus di awal
router.use(adminAuth);

// FIXED: Use custom property instead of req.query
const validateSalesQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Convert string query params to numbers
    const queryData = {
      month: req.query.month ? parseInt(req.query.month as string) : undefined,
      year: req.query.year ? parseInt(req.query.year as string) : undefined,
      storeId: req.query.storeId ? parseInt(req.query.storeId as string) : undefined,
    };

    // Validate dengan schema
    const validated = await salesReportSchema.validate(queryData, { abortEarly: false });
    
    // Store di custom property (bukan req.query)
    (req as any).validatedQuery = validated;
    
    next();
  } catch (error: any) {
    return res.status(400).json({
      status: 400,
      message: "Validation failed",
      errors: error.errors || [error.message],
    });
  }
};

const validateStockQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Convert string query params to numbers
    const queryData = {
      month: req.query.month ? parseInt(req.query.month as string) : undefined,
      year: req.query.year ? parseInt(req.query.year as string) : undefined,
      storeId: req.query.storeId ? parseInt(req.query.storeId as string) : undefined,
      productId: req.query.productId ? parseInt(req.query.productId as string) : undefined,
    };

    // Validate dengan schema
    const validated = await stockReportSchema.validate(queryData, { abortEarly: false });
    
    // Store di custom property (bukan req.query)
    (req as any).validatedQuery = validated;
    
    next();
  } catch (error: any) {
    return res.status(400).json({
      status: 400,
      message: "Validation failed",
      errors: error.errors || [error.message],
    });
  }
};

// Routes dengan validation
router.get("/sales/monthly", validateSalesQuery, getMonthlySalesController);
router.get("/sales/by-category", validateSalesQuery, getSalesByCategoryController);
router.get("/sales/by-product", validateSalesQuery, getSalesByProductController);

router.get("/stock/summary", validateStockQuery, getStockSummaryController);
router.get("/stock/detail", validateStockQuery, getStockDetailController);

export default router;