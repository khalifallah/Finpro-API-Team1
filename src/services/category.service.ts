import { PrismaClient } from "../generated/prisma-client";
import { CreateCategoryRequest , UpdateCategoryRequest , CategoryResponse } from "../types/category.types";

const prisma = new PrismaClient();

export const getCategories = async () : Promise<CategoryResponse[]> => {
    return await prisma.category.findMany({
        where: { deletedAt: null }
    });
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