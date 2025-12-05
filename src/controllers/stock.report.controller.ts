import { Request, Response, NextFunction } from "express";
import { getStockSummary, getStockDetail } from "../services/stock.report.service";
import { responseBuilder } from "../utils/response.builder";

export const getStockSummaryController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as any;
    const userStoreId = req.user?.storeId as number | undefined;
    const report = await getStockSummary(query, userStoreId);
    res.status(200).json(responseBuilder(200, "Stock summary report retrieved successfully", { data: report }));
  } catch (error) {
    next(error);
  }
};

export const getStockDetailController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as any;
    const userStoreId = req.user?.storeId as number | undefined;
    const report = await getStockDetail(query, userStoreId);
    res.status(200).json(responseBuilder(200, "Stock detail report retrieved successfully", { data: report }));
  } catch (error) {
    next(error);
  }
};