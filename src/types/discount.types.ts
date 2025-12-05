export interface CreateDiscountRuleRequest {
  productId?: number;
  description: string;
  type: "BOGO" | "DIRECT_PERCENTAGE" | "DIRECT_NOMINAL";
  value?: number;
  minPurchase?: number;
  maxDiscountAmount?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface UpdateDiscountRuleRequest {
  description?: string;
  value?: number;
  minPurchase?: number;
  maxDiscountAmount?: number;
  startDate?: Date;
  endDate?: Date;
  is_active?: boolean;
}

export interface DiscountRuleResponse {
  id: number;
  storeId: number;
  productId?: number;
  description: string;
  type: string;
  value?: number;
  minPurchase: number;
  maxDiscountAmount?: number;
  is_active: boolean;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  product?: { id: number; name: string; };
}

export interface DiscountUsageResponse {
  id: number;
  discountRuleId: number;
  orderId: number;
  amount: number;
  createdAt: Date;
}

export interface DiscountQuery {
  storeId?: number;
  productId?: number;
  type?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "value" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface ApplyDiscountRequest {
  discountRuleId: number;
  orderId: number;
  subtotal: number;
}