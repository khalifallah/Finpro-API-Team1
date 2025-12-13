export interface SalesReportQuery {
  month: number;
  year: number;
  storeId?: number;
}

export interface MonthlySalesReport {
  month: number;
  year: number;
  totalTransactions: number;    // ✅ ADD THIS
  totalSales: number;
  totalQuantity?: number;       // ✅ ADD THIS (optional)
  storeId: number | null;
}

export interface SalesByCategoryReport {
  categoryId: number;
  categoryName: string;
  quantity: number;
  totalSales: number;
  month: number;
  year: number;
  storeId: number | null;
}

export interface SalesByProductReport {
  productId: number;
  productName: string;
  quantity: number;
  totalSales: number;
  month: number;
  year: number;
  storeId: number | null;
}

export interface StockReportQuery {
  month: number;
  year: number;
  storeId?: number;
  productId?: number;
}

export interface StockSummaryReport {
  productId: number;
  productName: string;
  totalAddition: number;
  totalReduction: number;
  finalStock: number;
  month: number;
  year: number;
  storeId: number | null;
}

export interface StockDetailReport {
  productId: number;
  productName: string;
  date: Date;
  quantity: number;
  reason: string;
  type: 'IN' | 'OUT';
  month: number;
  year: number;
  storeId: number;
}