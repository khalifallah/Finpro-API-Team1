export interface CreateCategoryRequest {
    name: string;
}

export interface UpdateCategoryRequest {
    name?: string;
}

export interface CategoryResponse {
    id: number;
    name: string;
    createdAt: Date;
}