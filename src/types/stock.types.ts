export interface CreateStockRequest {
    productId: number;
    storeId: number;
    quantity: number;
}

export interface UpdateStockRequest {
    quantity: number; //! Only quantity can be updated directly; journals handle changes
}

export interface StockResponse {
    id: number;
    productId: number;
    storeId: number;
    quantity: number;
    product: {id: number; name: string};
    store: {id: number; name: string};
    createdAt: Date;
    updatedAt: Date;
}

export interface StockJournalResponse {
    id: number;
    productStockId: number;
    adminId: number;
    orderId?: number;
    quantityChange: number;
    reason: string;
    createdAt: Date;
}

export interface StockQuery {
    storeId?: number;
    productId?: number;
    page?: number;
    limit?: number;
    sortBy? : "quantity" | "createdAt";
    sortOrder?: "asc" | "desc";
}