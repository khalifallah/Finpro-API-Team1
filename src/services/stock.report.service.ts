import prisma from "../libs/prisma";
import { StockReportQuery, StockSummaryReport, StockDetailReport } from "../types/report.types";
import AppError from "../errors/app.error";

export const getStockSummary = async (query: StockReportQuery, userStoreId?: number): Promise<StockSummaryReport[]> => {
  try {
    const { month, year, storeId } = query;
    const finalStoreId = storeId || userStoreId;
    
    const dateStart = new Date(year, month - 1, 1);
    const dateEnd = new Date(year, month, 1);

    const journals = await prisma.stockJournal.findMany({
      where: {
        createdAt: { gte: dateStart, lt: dateEnd },
        ...(finalStoreId ? { productStock: { storeId: finalStoreId } } : {}),
      },
      include: { productStock: { include: { product: true } } },
    });

    const grouped = journals.reduce((acc, journal) => {
      const key = journal.productStock.productId;
      if (!acc[key]) {
        acc[key] = {
          productId: journal.productStock.productId,
          productName: journal.productStock.product.name,
          totalAddition: 0,
          totalReduction: 0,
          storeId: journal.productStock.storeId,
        };
      }
      if (journal.quantityChange > 0) {
        acc[key].totalAddition += journal.quantityChange;
      } else {
        acc[key].totalReduction += Math.abs(journal.quantityChange);
      }
      return acc;
    }, {} as Record<number, any>);

    // Get current stock
    const productIds = Object.keys(grouped).map(id => parseInt(id));
    if (productIds.length === 0) return [];

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

    // PATCH: Map with all required fields
    return Object.values(grouped).map(s => ({
      productId: s.productId,
      productName: s.productName,
      totalAddition: s.totalAddition,
      totalReduction: s.totalReduction,
      finalStock: stockMap[s.productId] || 0,
      month,
      year,
      storeId: s.storeId || finalStoreId || null,
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
      orderBy: { createdAt: 'desc' },
    });

    // PATCH: Map with all required fields
    return details.map(d => ({
      productId: d.productStock.productId,
      productName: d.productStock.product.name,
      date: d.createdAt,
      quantity: d.quantityChange,
      reason: d.reason || 'Unknown',
      type: d.quantityChange > 0 ? 'IN' : 'OUT',
      month,
      year,
      storeId: d.productStock.storeId,
    }));
  } catch (error) {
    throw new AppError("Failed to fetch stock detail", 500);
  }
};