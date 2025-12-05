import prisma from "../libs/prisma";
import { StockReportQuery, StockSummaryReport, StockDetailReport } from "../types/report.types";
import AppError from "../errors/app.error";

export const getStockSummary = async (query: StockReportQuery, userStoreId?: number): Promise<StockSummaryReport[]> => {
  try {
    const { month, year, storeId } = query;
    const finalStoreId = storeId || userStoreId;
    
    const dateStart = new Date(year, month - 1, 1);
    const dateEnd = new Date(year, month, 1);

    // Get journals for changes
    const journals = await prisma.stockJournal.findMany({
      where: {
        createdAt: { gte: dateStart, lt: dateEnd },
        ...(finalStoreId ? { productStock: { storeId: finalStoreId } } : {}),
      },
      include: { productStock: { include: { product: true } } },
    });

    // Aggregate changes
    const grouped = journals.reduce((acc, journal) => {
      const key = journal.productStock.productId;
      if (!acc[key]) {
        acc[key] = {
          productId: journal.productStock.productId,
          productName: journal.productStock.product.name,
          totalAdded: 0,
          totalSubtracted: 0,
          storeId: journal.productStock.storeId,
        };
      }
      if (journal.quantityChange > 0) {
        acc[key].totalAdded += journal.quantityChange;
      } else {
        acc[key].totalSubtracted += Math.abs(journal.quantityChange);
      }
      return acc;
    }, {} as Record<number, any>);

    // Get current stock for finalStock
    const productIds = Object.keys(grouped).map(id => parseInt(id));
    const currentStocks = await prisma.productStock.findMany({
      where: {
        productId: { in: productIds },
        ...(finalStoreId ? { storeId: finalStoreId } : {}),
      },
      select: { productId: true, quantity: true },
    });

    const stockMap = currentStocks.reduce((map, stock) => {
      map[stock.productId] = stock.quantity;
      return map;
    }, {} as Record<number, number>);

    return Object.values(grouped).map(s => ({
      ...s,
      finalStock: stockMap[s.productId] || 0, // current quantity as final stock
      month,
      year,
      storeId: finalStoreId || null,
    }));
  } catch (error) {
    throw new AppError("Failed to fetch stock summary", 500);
  }
};

export const getStockDetail = async (query: StockReportQuery, userStoreId?: number): Promise<StockDetailReport[]> => {
  try {
    const { month, year, storeId, productId } = query;
    const finalStoreId = storeId || userStoreId;
    
    const dateStart = new Date(year, month - 1, 1);
    const dateEnd = new Date(year, month, 1);

    const details = await prisma.stockJournal.findMany({
      where: {
        createdAt: { gte: dateStart, lt: dateEnd },
        ...(finalStoreId ? { productStock: { storeId: finalStoreId } } : {}),
        ...(productId ? { productStock: { productId } } : {}),
      },
      include: { productStock: { include: { product: true } } },
    });

    return details.map(d => ({
      productId: d.productStock.productId,
      productName: d.productStock.product.name,
      changeType: d.reason,
      quantity: d.quantityChange,
      reason: d.reason,
      createdAt: d.createdAt,
      month,
      year,
      storeId: d.productStock.storeId,
    }));
  } catch (error) {
    throw new AppError("Failed to fetch stock detail", 500);
  }
};