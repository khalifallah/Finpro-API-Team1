import { PrismaClient } from '../generated/prisma-client';
import { ProductQuery , CreateProductRequest , UpdateProductRequest, ProductResponse , DBProduct , UpdateProductData  } from '../types/product.types';
import { processImage } from '../utils/file.util';


const prisma = new PrismaClient();

// Helper function to transform DBProduct to ProductResponse(DTO)
const transformProductToResponse = (product: DBProduct, stock: number) : ProductResponse => {
    return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.defaultPrice,
        category: product.category,
        productImages: product.productImages,
        stock,
        canAddToCart: stock > 0

    }
}

export const getProducts = async (query: ProductQuery, userStoreId?: number): Promise<{products: ProductResponse[]; total: number;}> => {

    const {search, categoryId, storeId = userStoreId, page =1, limit =10, sortBy = "createdAt", sortOrder = 'desc'} = query;
    const skip = (page -1) * limit;
    const where: any = {};

    if (search) where.name = {contains: search, mode: "insensitive"};
    if (categoryId) where.categoryId = categoryId;

    const products = await prisma.product.findMany({
        where,
        include: {category: true, productImages: true},
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
    });

    const productsWithStock = await Promise.all(products.map(async (p) => {
        const stock = await prisma.productStock.findFirst({ where: {productId: p.id, storeId}});
        return transformProductToResponse(p as DBProduct, stock?.quantity || 0);
    }));
    const total = await prisma.product.count({ where});
    return {products: productsWithStock, total};
};

export const getProductById = async (id: number, storeId?: number): Promise<ProductResponse | null> => {
    const product = await prisma.product.findUnique({
        where: {id},
        include: {category: true, productImages: true},
    });
    if (!product) return null;

    const stock = await prisma.productStock.findFirst({where: {productId: id, storeId}});
    return transformProductToResponse(product as DBProduct , stock?.quantity || 0);
};

export const createProduct = async (data: CreateProductRequest, images: Express.Multer.File[]): Promise<ProductResponse> => {
    const imageUrls = await Promise.all(images.map(processImage));

    const product = await prisma.product.create({
        data: {
            name: data.name,
            description: data.description,
            defaultPrice: data.price,
            categoryId: data.categoryId,
            productImages: { create: imageUrls.map((url) => ({imageUrl: url})) } ,
        } ,
        include: {category: true, productImages: true},
    });
    return transformProductToResponse(product as DBProduct, 0);
};

export const updateProduct = async (id: number, data: UpdateProductRequest): Promise<ProductResponse> => {
    const updateData : UpdateProductData = {};

    if (data.name) updateData.name = data.name;
    if (data.description) updateData.description = data.description;
    if (data.price) updateData.defaultPrice = data.price;
    if (data.categoryId) updateData.categoryId = data.categoryId;

    const product = await prisma.product.update({
        where: {id},
        data: updateData,
        include: {category: true, productImages: true},
    });
    return transformProductToResponse(product as DBProduct, 0);
};

export const deleteProduct = async (id: number) : Promise<void> => {
    await prisma.product.delete({where: {id}});
};