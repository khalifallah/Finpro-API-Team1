import { Request, Response } from "express";
import { getMonthlySales, getSalesByCategory, getSalesByProduct } from "../services/sales.report.service";

// Get User Store ID dari jwtPayload
const getUserStoreId = (req: Request): number | undefined => {
  try {
    const payload = (req as any).jwtPayload;  // pakai req.jwtPayload
    console.log("📌 JWT Payload:", payload);
    
    if (payload?.storeId) return payload.storeId;
    if (payload?.store?.id) return payload.store.id;
    
    return undefined;
  } catch (error) {
    console.error("Error getting store ID:", error);
    return undefined;
  }
};

// Monthly Sales
export const getMonthlySalesController = async (req: Request, res: Response) => {
  try {
    // Read from validatedQuery (already validated & converted to numbers)
    const validatedData = (req as any).validatedQuery;
    const { month, year, storeId } = validatedData;
    const userStoreId = getUserStoreId(req);

    console.log("📊 Controller received validated data:");
    console.log("  - month:", month, typeof month);
    console.log("  - year:", year, typeof year);
    console.log("  - storeId (query):", storeId, typeof storeId);
    console.log("  - userStoreId:", userStoreId);

    const query = {
      month,
      year,
      storeId: storeId || userStoreId,
    };

    console.log("📊 Final query object:", query);

    const data = await getMonthlySales(query, userStoreId);

    return res.status(200).json({
      status: 200,
      message: "Monthly sales report retrieved successfully",
      data,
    });
  } catch (error: any) {
    console.error("❌ Error in getMonthlySalesController:", error);
    return res.status(error.status || 500).json({
      status: error.status || 500,
      message: error.message || "Internal server error",
    });
  }
};

// Sales By Category
export const getSalesByCategoryController = async (req: Request, res: Response) => {
  try {
    const validatedData = (req as any).validatedQuery;
    const { month, year, storeId } = validatedData;
    const userStoreId = getUserStoreId(req);

    const query = {
      month,
      year,
      storeId: storeId || userStoreId,
    };

    const data = await getSalesByCategory(query, userStoreId);

    return res.status(200).json({
      status: 200,
      message: "Sales by category report retrieved successfully",
      data,
    });
  } catch (error: any) {
    return res.status(error.status || 500).json({
      status: error.status || 500,
      message: error.message || "Internal server error",
    });
  }
};

// Sales By Product
export const getSalesByProductController = async (req: Request, res: Response) => {
  try {
    const validatedData = (req as any).validatedQuery;
    const { month, year, storeId } = validatedData;
    const userStoreId = getUserStoreId(req);

    const query = {
      month,
      year,
      storeId: storeId || userStoreId,
    };

    const data = await getSalesByProduct(query, userStoreId);

    return res.status(200).json({
      status: 200,
      message: "Sales by product report retrieved successfully",
      data,
    });
  } catch (error: any) {
    return res.status(error.status || 500).json({
      status: error.status || 500,
      message: error.message || "Internal server error",
    });
  }
};