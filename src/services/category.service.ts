import { PrismaClient } from "../generated/prisma-client";
import { CreateCategoryRequest , UpdateCategoryRequest , CategoryResponse } from "../types/category.types";

const prisma = new PrismaClient();

export const getCategories = async () : Promise<CategoryResponse[]> => {
    return await prisma.category.findMany();
};

export const createCategory = async (data: CreateCategoryRequest) : Promise<CategoryResponse> => {
    return await prisma.category.create({data});
};

export const updateCategory = async (id: number, data: UpdateCategoryRequest): Promise<CategoryResponse> => {
    return await prisma.category.update({
        where: {id},
        data
    });
};

export const deleteCategory = async (id: number) : Promise<void> => {
    await prisma.category.delete({where: {id}});
};