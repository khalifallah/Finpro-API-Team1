import { Request, Response } from "express";
import { getStockSummary, getStockDetail } from "../services/stock.report.service";

// Get User Store ID dari jwtPayload
const getUserStoreId = (req: Request): number | undefined => {
  try {
    const payload = (req as any).jwtPayload;  // pakai req.jwtPayload
    console.log("📌 JWT Payload:", payload);
    
    if (payload?.storeId) return payload.storeId;
    if (payload?.store?.id) return payload.store.id;
    
    return undefined;
  } catch (error) {
    return undefined;
  }
};

// Stock Summary
export const getStockSummaryController = async (req: Request, res: Response) => {
  try {
    const validatedData = (req as any).validatedQuery;
    const { month, year, storeId } = validatedData;
    const userStoreId = getUserStoreId(req);

    const query = {
      month,
      year,
      storeId: storeId || userStoreId,
    };

    const data = await getStockSummary(query, userStoreId);

    return res.status(200).json({
      status: 200,
      message: "Stock summary report retrieved successfully",
      data,
    });
  } catch (error: any) {
    return res.status(error.status || 500).json({
      status: error.status || 500,
      message: error.message || "Internal server error",
    });
  }
};

// Stock Detail
export const getStockDetailController = async (req: Request, res: Response) => {
  try {
    const validatedData = (req as any).validatedQuery;
    const { month, year, storeId, productId } = validatedData;
    const userStoreId = getUserStoreId(req);

    const query = {
      month,
      year,
      storeId: storeId || userStoreId,
      productId,
    };

    const data = await getStockDetail(query, userStoreId);

    return res.status(200).json({
      status: 200,
      message: "Stock detail report retrieved successfully",
      data,
    });
  } catch (error: any) {
    return res.status(error.status || 500).json({
      status: error.status || 500,
      message: error.message || "Internal server error",
    });
  }
};