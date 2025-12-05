import prisma from "../libs/prisma";
import { SalesReportQuery, MonthlySalesReport, SalesByCategoryReport, SalesByProductReport } from "../types/report.types";
import AppError from "../errors/app.error";

export const getMonthlySales = async (query: SalesReportQuery, userStoreId?: number): Promise<MonthlySalesReport[]> => {
  try {
    const { month, year, storeId } = query;
    const finalStoreId = storeId || userStoreId;
    
    if (!finalStoreId) {
      throw new AppError("Store ID is required", 400);
    }

    const dateStart = new Date(year, month - 1, 1);
    const dateEnd = new Date(year, month, 1);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: dateStart, lt: dateEnd },
        storeId: finalStoreId,
      },
    });

    const totalSales = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrders = orders.length;

    return [{
      month,
      year,
      totalSales,
      totalOrders,
      storeId: finalStoreId,
    }];
  } catch (error) {
    console.error("Error in getMonthlySales:", error);
    throw new AppError("Failed to fetch monthly sales", 500);
  }
};

export const getSalesByCategory = async (query: SalesReportQuery, userStoreId?: number): Promise<SalesByCategoryReport[]> => {
  try {
    const { month, year, storeId } = query;
    const finalStoreId = storeId || userStoreId;
    
    if (!finalStoreId) {
      throw new AppError("Store ID is required", 400);
    }

    const dateStart = new Date(year, month - 1, 1);
    const dateEnd = new Date(year, month, 1);
    
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: dateStart, lt: dateEnd },
          storeId: finalStoreId,
        },
      },
      include: { product: { include: { category: true } } },
    });

    const grouped = orderItems.reduce((acc, item) => {
      const key = item.product.categoryId;
      if (!acc[key]) {
        acc[key] = {
          categoryId: item.product.categoryId,
          categoryName: item.product.category.name,
          totalSales: 0,
        };
      }
      acc[key].totalSales += (item.priceAtPurchase || 0) * (item.quantity || 0);
      return acc;
    }, {} as Record<number, any>);

    return Object.values(grouped).map(s => ({
      ...s,
      month,
      year,
      storeId: finalStoreId,
    }));
  } catch (error) {
    console.error("Error in getSalesByCategory:", error);
    throw new AppError("Failed to fetch sales by category", 500);
  }
};

export const getSalesByProduct = async (query: SalesReportQuery, userStoreId?: number): Promise<SalesByProductReport[]> => {
  try {
    const { month, year, storeId } = query;
    const finalStoreId = storeId || userStoreId;
    
    if (!finalStoreId) {
      throw new AppError("Store ID is required", 400);
    }

    const dateStart = new Date(year, month - 1, 1);
    const dateEnd = new Date(year, month, 1);

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: dateStart, lt: dateEnd },
          storeId: finalStoreId,
        },
      },
      include: { product: true },
    });

    const grouped = orderItems.reduce((acc, item) => {
      const key = item.productId;
      if (!acc[key]) {
        acc[key] = {
          productId: item.productId,
          productName: item.product.name,
          totalSales: 0,
          totalQuantity: 0,
        };
      }
      acc[key].totalSales += (item.priceAtPurchase || 0) * (item.quantity || 0);
      acc[key].totalQuantity += item.quantity || 0;
      return acc;
    }, {} as Record<number, any>);

    return Object.values(grouped).map(s => ({
      ...s,
      month,
      year,
      storeId: finalStoreId,
    }));
  } catch (error) {
    console.error("Error in getSalesByProduct:", error);
    throw new AppError("Failed to fetch sales by product", 500);
  }
};