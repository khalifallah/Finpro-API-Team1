import { PrismaClient } from "../generated/prisma-client";
import { CreateCategoryRequest , UpdateCategoryRequest , CategoryResponse } from "../types/category.types";

const prisma = new PrismaClient();

export const getCategories = async (query: { 
  page?: number; 
  limit?: number; 
  sortBy?: string; 
  sortOrder?: string;
  search?: string; //ADD SEARCH
}): Promise<{ categories: CategoryResponse[]; total: number; }> => {
    const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc", search } = query;
    const skip = (page - 1) * limit;
    
    // BUILD WHERE CLAUSE WITH SEARCH
    const where: any = { deletedAt: null };
    
    if (search && search.trim() !== '') {
      where.name = {
        contains: search,
        mode: 'insensitive', // Case-insensitive search
      };
    }

    const categories = await prisma.category.findMany({
        where,
        skip, 
        take: limit, 
        orderBy: { [sortBy]: sortOrder }
    });
    const total = await prisma.category.count({ where });
    return { categories, total };
};

export const createCategory = async (data: CreateCategoryRequest) : Promise<CategoryResponse> => {
    const existing = await prisma.category.findUnique({where: {name: data.name}});
    if (existing) throw new Error("Category name must be unique");

    return await prisma.category.create({data});
};

export const updateCategory = async (id: number, data: UpdateCategoryRequest): Promise<CategoryResponse> => {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new Error("Category not found or already deleted");
    
    if (data.name) {
        const existing = await prisma.category.findFirst({
            where: {
                deletedAt: null,
                name: data.name,
                id: { not: id}
            }
        });
        if (existing) throw new Error("Category name must be unique");
    }
    
    return await prisma.category.update({
        where: {id},
        data
    });
};

export const deleteCategory = async (id: number) : Promise<void> => {
    try {

        const category = await prisma.category.findUnique({where: {id}});
        if (!category) {
            throw new Error(`Category with ID ${id} not found`);
        }
         // soft delete: set deletetAt timestamp
         await prisma.category.update({
            where: {id},
            data: {deletedAt: new Date()}
         });

    } catch (err: any) {
        throw err;
    }
};

export const getDeletedCategories = async (query: { 
  page?: number; 
  limit?: number; 
  sortBy?: string; 
  sortOrder?: string 
})
: Promise<{ categories: CategoryResponse[]; total: number; }> => {
    const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc"} = query;
    const skip = (page -1) * limit;
    const where = {deletedAt: { not: null } };

    const categories = await prisma.category.findMany({
        where,
        skip, 
        take: limit, 
        orderBy: { [sortBy]: sortOrder }
    });
    const total = await prisma.category.count({where});
    return { categories, total };
};

export const restoreCategory = async (id: number): Promise<CategoryResponse> => {
    const category = await prisma.category.findUnique({ where: {id} });
    if (!category || !category.deletedAt) throw new Error("Category not found or not deleted");

    return await prisma.category.update({
        where: {id},
        data: {deletedAt: null}
    });
};