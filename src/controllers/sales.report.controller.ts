import { Request, Response, NextFunction } from "express";
import { getMonthlySales, getSalesByCategory, getSalesByProduct } from "../services/sales.report.service";
import { responseBuilder } from "../utils/response.builder";

export const getMonthlySalesController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as any;
    const userStoreId = req.user?.storeId as number | undefined;
    const report = await getMonthlySales(query, userStoreId);
    res.status(200).json(responseBuilder(200, "Monthly sales report retrieved successfully", { data: report }));
  } catch (error) {
    next(error);
  }
};

export const getSalesByCategoryController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as any;
    const userStoreId = req.user?.storeId as number | undefined;
    const report = await getSalesByCategory(query, userStoreId);
    res.status(200).json(responseBuilder(200, "Sales by category report retrieved successfully", { data: report }));
  } catch (error) {
    next(error);
  }
};

export const getSalesByProductController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as any;
    const userStoreId = req.user?.storeId as number | undefined;
    const report = await getSalesByProduct(query, userStoreId);
    res.status(200).json(responseBuilder(200, "Sales by product report retrieved successfully", { data: report }));
  } catch (error) {
    next(error);
  }
};