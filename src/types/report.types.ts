export interface SalesReportQuery {
  month: number; // 1-12
  year: number;
  storeId?: number; // optional, for filtering
}

export interface StockReportQuery {
  month: number;
  year: number;
  storeId?: number;
  productId?: number; // for detail per product
}

export interface MonthlySalesReport {
  month: number;
  year: number;
  totalSales: number;
  totalOrders: number;
  storeId: number | null; // null untuk super admin all
}

export interface SalesByCategoryReport {
  categoryId: number;
  categoryName: string;
  totalSales: number;
  month: number;
  year: number;
  storeId: number | null; // null untuk super admin all
}

export interface SalesByProductReport {
  productId: number;
  productName: string;
  totalSales: number;
  totalQuantity: number;
  month: number;
  year: number;
  storeId: number | null; // null untuk super admin all
}

export interface StockSummaryReport {
  productId: number;
  productName: string;
  totalAdded: number;
  totalSubtracted: number;
  finalStock: number;
  month: number;
  year: number;
  storeId: number | null; // null untuk super admin all
}

export interface StockDetailReport {
  productId: number;
  productName: string;
  changeType: string;
  quantity: number;
  reason?: string;
  createdAt: Date;
  month: number;
  year: number;
  storeId?: number;
}