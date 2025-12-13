import { PrismaClient } from "../generated/prisma-client";
import {
  ProductQuery,
  CreateProductRequest,
  UpdateProductRequest,
  ProductResponse,
  DBProduct,
  UpdateProductData,
} from "../types/product.types";
import { processImage } from "../utils/file.util";

const prisma = new PrismaClient();

// Helper function to transform DBProduct to ProductResponse(DTO)
const transformProductToResponse = (
  product: DBProduct,
  stock: number
): ProductResponse => {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.defaultPrice,
    category: product.category,
    productImages: product.productImages,
    stock,
    canAddToCart: stock > 0,
  };
};
export const getProducts = async (
  query: ProductQuery,
  userStoreId?: number
): Promise<{ products: ProductResponse[]; total: number }> => {
  const {
    search,
    categoryId,
    storeId = userStoreId || 1,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;
  const skip = (page - 1) * limit;
  const where: any = { deletedAt: null };

  if (search) where.name = { contains: search, mode: "insensitive" };
  if (categoryId) where.categoryId = categoryId;

  const products = await prisma.product.findMany({
    where,
    include: {
      category: true,
      productImages: true,
      productStocks: {
        where: {
          storeId: storeId,
          deletedAt: null,
        },
      },
    },
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
  });

  const productsWithStock = await Promise.all(
    products.map(async (p) => {
      // Use the already loaded productStocks instead of querying again
      const stock = p.productStocks[0]?.quantity || 0;
      return transformProductToResponse(p as DBProduct, stock);
    })
  );

  const total = await prisma.product.count({ where });
  return { products: productsWithStock, total };
};

export const getProductById = async (
  id: number,
  storeId?: number
): Promise<ProductResponse | null> => {
  const product = await prisma.product.findUnique({
    where: { id, deletedAt: null },
    include: { category: true, productImages: true },
  });
  if (!product) return null;

  const stock = await prisma.productStock.findFirst({
    where: { productId: id, storeId },
  });
  return transformProductToResponse(product as DBProduct, stock?.quantity || 0);
};

export const createProduct = async (
  data: CreateProductRequest,
  images: Express.Multer.File[]
): Promise<ProductResponse> => {
  try {
    // Add check for soft-deleted product with same name (or name + category) to prevent duplication
    const existingDeleted = await prisma.product.findFirst({
      where: {
        name: data.name,
        categoryId: data.categoryId,
        deletedAt: { not: null },
      },
    });
    if (existingDeleted) {
      throw new Error(
        "A deleted product with the same name and category exists. Restore it instead."
      );
    }

    if (!images || images.length === 0) {
      throw new Error("At least one product image is required.");
    }

    const imageUrls: string[] = await Promise.all(
      images.map((img) => processImage(img))
    );

    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        defaultPrice: data.price,
        categoryId: data.categoryId,
        productImages: { create: imageUrls.map((url) => ({ imageUrl: url })) },
      },
      include: { category: true, productImages: true },
    });
    return transformProductToResponse(product as DBProduct, 0);
  } catch (err) {
    throw err;
  }
};

export const updateProduct = async (
  id: number,
  data: UpdateProductRequest
): Promise<ProductResponse> => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.deletedAt)
    throw new Error("Product not found or already deleted");
  const updateData: UpdateProductData = {};

  if (data.name) updateData.name = data.name;
  if (data.description) updateData.description = data.description;
  if (data.price) updateData.defaultPrice = data.price;
  if (data.categoryId) updateData.categoryId = data.categoryId;

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
    include: { category: true, productImages: true },
  });
  return transformProductToResponse(product as DBProduct, 0);
};

export const deleteProduct = async (id: number): Promise<void> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { productImages: true, productStocks: true }, // Cek relasi
    });

    if (!product) {
      throw new Error(`Product with ID ${id} not found`);
    }

    if (product.productImages && product.productImages.length > 0) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
    }

    if (product.productStocks && product.productStocks.length > 0) {
      await prisma.productStock.deleteMany({ where: { productId: id } });
    }

    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch (err: any) {
    throw err;
  }
};

// Restore soft-deleted product
export const restoreProduct = async (id: number): Promise<ProductResponse> => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, productImages: true },
  });
  if (!product || !product.deletedAt)
    throw new Error("Product not found or not deleted");

  const restored = await prisma.product.update({
    where: { id },
    data: { deletedAt: null },
    include: { category: true, productImages: true },
  });
  return transformProductToResponse(restored as DBProduct, 0);
};

// Get soft-deleted products with pagination/filtering
export const getDeletedProducts = async (query: ProductQuery): Promise<{ products: ProductResponse[]; total: number; }> => {
    try {
        const { search, categoryId, page = 1, limit = 10, sortBy = "createdAt", sortOrder = 'desc' } = query;
        const skip = (page - 1) * limit;
        const where: any = { deletedAt: { not: null } };
        
        if (search) where.name = { contains: search, mode: "insensitive" };
        if (categoryId) where.categoryId = categoryId;
        
        const products = await prisma.product.findMany({
            where,
            include: { category: true, productImages: true },
            skip, take: limit, orderBy: { [sortBy]: sortOrder }
        });
        const total = await prisma.product.count({ where });
        return { products: products.map(p => transformProductToResponse(p as DBProduct, 0)), total };
    } catch (err) {
        throw err;
    }
};

// Refactor: Add images to existing product
export const addProductImages = async (
    productId: number,
    images: Express.Multer.File[]
): Promise<ProductResponse> => {
    try {
        // Check product exists
        const product = await prisma.product.findUnique({
            where: { id: productId, deletedAt: null },
            include: { category: true, productImages: true },
        });

        if (!product) {
            throw new Error("Product not found");
        }

        // Check max images (5 limit)
        const currentImageCount = product.productImages?.length || 0;
        const maxImages = 5;
        
        if (currentImageCount + images.length > maxImages) {
            throw new Error(
                `Cannot add ${images.length} image(s). Product already has ${currentImageCount} images. Maximum ${maxImages} allowed.`
            );
        }

        if (!images || images.length === 0) {
            throw new Error("No images provided");
        }

        // Process and save images
        const imageUrls: string[] = await Promise.all(
            images.map((img) => processImage(img))
        );

        // Create image records
        await prisma.productImage.createMany({
            data: imageUrls.map((url) => ({
                productId,
                imageUrl: url,
            })),
        });

        // Return updated product
        const updatedProduct = await prisma.product.findUnique({
            where: { id: productId },
            include: { category: true, productImages: true },
        });

        return transformProductToResponse(updatedProduct as DBProduct, 0);
    } catch (err) {
        throw err;
    }
};

// Refactor: Delete specific product image
export const deleteProductImage = async (
    productId: number,
    imageId: number
): Promise<void> => {
    try {
        // Check image exists and belongs to product
        const image = await prisma.productImage.findFirst({
            where: { id: imageId, productId },
        });

        if (!image) {
            throw new Error("Image not found or does not belong to this product");
        }

        // Check minimum images (at least 1 required)
        const imageCount = await prisma.productImage.count({
            where: { productId },
        });

        if (imageCount <= 1) {
            throw new Error("Cannot delete the last image. Product must have at least one image.");
        }

        // Delete image record (file cleanup can be handled separately)
        await prisma.productImage.delete({
            where: { id: imageId },
        });
    } catch (err: any) {
        throw err;
    }
};
