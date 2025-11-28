import { string } from 'yup';
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

export const createProduct = async (
    data: CreateProductRequest, 
    images: Express.Multer.File[]): Promise<ProductResponse> => {
        try {
            console.log("[Debug] createProduct - Input data:", {data, imagesCount: images?.length});
            
            if (!images || images.length === 0) {
                throw new Error("At least one product image is required.");
            }

            console.log("[DEBUG] Processing images...");
            const imageUrls: string[] = await Promise.all(
                images.map((img) => processImage(img))
            );
            console.log("[DEBUG] Image URLs:", imageUrls);
            
            
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

        } catch (err) {
            console.error("Error creating product:", err);
            throw err;
        }
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

export const deleteProduct = async (id: number): Promise<void> => {
    try {
        console.log("[DEBUG] deleteProduct service - ID:", id);

        const product = await prisma.product.findUnique({ 
            where: { id },
            include: { productImages: true, productStocks: true } // Cek relasi
        });
        
        console.log("[DEBUG] Product found:", product);
        
        if (!product) {
            throw new Error(`Product with ID ${id} not found`);
        }

        console.log("[DEBUG] Product has images:", product.productImages?.length || 0);
        console.log("[DEBUG] Product has stocks:", product.productStocks?.length || 0);

        if (product.productImages && product.productImages.length > 0) {
            await prisma.productImage.deleteMany({where: {productId: id}});
            console.log("[DEBUG] Product images deleted");
        }

        if (product.productStocks && product.productStocks.length > 0) {
            await prisma.productStock.deleteMany({ where: { productId: id } });
            console.log("[DEBUG] Product stocks deleted");
        } 

        await prisma.product.delete({ where: { id } });
        console.log("[DEBUG] Product deleted successfully");
    } catch (err: any) {
        console.error("[ERROR] Service delete error - Message:", err.message);
        console.error("[ERROR] Service delete error - Code:", err.code);
        console.error("[ERROR] Full error:", err);
        throw err;
    }
};