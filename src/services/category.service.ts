import { PrismaClient } from "../generated/prisma-client";
import { CreateCategoryRequest , UpdateCategoryRequest , CategoryResponse } from "../types/category.types";

const prisma = new PrismaClient();

export const getCategories = async () : Promise<CategoryResponse[]> => {
    return await prisma.category.findMany();
};

export const createCategory = async (data: CreateCategoryRequest) : Promise<CategoryResponse> => {
    const existing = await prisma.category.findUnique({where: {name: data.name}});
    if (existing) throw new Error("Category name must be unique");

    return await prisma.category.create({data});
};

export const updateCategory = async (id: number, data: UpdateCategoryRequest): Promise<CategoryResponse> => {
    if (data.name) {
        const existing = await prisma.category.findFirst({
            where: {
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
    await prisma.category.delete({where: {id}});
};