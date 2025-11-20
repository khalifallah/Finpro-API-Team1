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
    price: number; // must map to "default price" in db schema Product table
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
    price: number; // from ProductPrice table (default price)
    category: {id: number; name: string;};
    productImages: Array <{id: number; imageUrl: string;}>;
    stock: number; // from ProductStock
    canAddToCart: boolean; // true if stock > 0
}

// Internal Type for DB Queries (More type safety) Mirror to Product table schema - Non DTO
export interface DBProduct {
    id: number;
    name: string;
    description: string;
    defaultPrice: number;
    categoryId: number;
    category: {id: number; name: string;};
    productImages: Array <{id: number; imageUrl: string;}>;
    createdAt?: Date;
    updatedAt?: Date;
}
// Internal Type for Update Product Data (non DTO)
export interface UpdateProductData {
    name?: string;
    description?: string;
    defaultPrice?: number;
    categoryId?: number;
}