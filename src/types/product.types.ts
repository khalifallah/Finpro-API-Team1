export interface ProductQuery {
    search?: string;
    categoryId?: number;
    storeId?: number;
    page?: number;
    limit?: number;
    sortBy?: "name" | "price" | "createdAt";
    sortOrder?: "asc" | "desc";
}

export interface CreateProductRequest {
    name: string;
    description: string;
    price: number;
    categoryId: number;
    storeId: number;
}

export interface UpdateProductRequest {
    name?: string;
    description?: string;
    price?: number;
    categoryId?: number;
}

export interface ProductResponse {
    id: number;
    name: string;
    description: string;
    price: number;
    category: {id: number; name: string;};
    images: {id: number; imageUrl: string;}[];
    stock: number; // from ProductStock
    canAddToCart: boolean; // true if stock > 0
}