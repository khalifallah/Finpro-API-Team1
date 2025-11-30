import { PrismaClient } from "../generated/prisma-client";
import { CreateStockRequest , UpdateStockRequest, StockResponse , StockJournalResponse, StockQuery } from "../types/stock.types";

const prisma = new PrismaClient();

// Helper function to map Prisma Stock to StockResponse
const transformStockToResponse = (stock: any) : StockResponse => ({
    id: stock.id,
    productId: stock.productId,
    storeId: stock.storeId,
    quantity: stock.quantity,
    product: stock.product,
    store: stock.store,
    createdAt: stock.createdAt,
    updatedAt: stock.updatedAt,
});

// Get stocks with pagination/filtering/sorting
export const getStocks = async (query: StockQuery , userStoreId?: number): Promise<{stocks: StockResponse[]; total: number}> => {
    const {storeId = userStoreId, productId, page = 1, limit = 10, sortBy = "createdAt" , sortOrder = "desc" } = query;
    const skip = (page -1) * limit;
    const where : any = {deletedAt: null};

    if (storeId) where.storeId = storeId;
    if (productId) where.productId = productId;

    const stocks = await prisma.productStock.findMany({
        where,
        include: {product: true, store: true},
        skip, take: limit, orderBy: { [sortBy]: sortOrder },
    });
    const total = await prisma.productStock.count({where});
    return {stocks: stocks.map(transformStockToResponse), total};
};

// GET Stock by ID
export const getStockById = async (id: number): Promise<StockResponse | null> => {
    const stock = await prisma.productStock.findUnique({
        where: {id},
        include: {product: true, store: true},
    });
    
    if (!stock || stock.deletedAt !== null) {
        return null;
    }
    return transformStockToResponse(stock);
};

// Create new stock entry (super admin only, as it sets store)
export const createStock = async (data: CreateStockRequest): Promise<StockResponse> => {
    const stock = await prisma.productStock.create({
        data,
        include: {product: true, store: true},
    });
    return transformStockToResponse(stock);
};

// Update stock: Create journal entry and update quantity
export const updateStock = async (id: number, data: UpdateStockRequest, adminId: number, reason: string): Promise<StockResponse> => {
    const existingStock = await prisma.productStock.findUnique({ where: { id } });
    
    if (!existingStock) throw new Error("Stock not found");
    
    if (existingStock.deletedAt !== null) {
        throw new Error("Cannot update deleted stock");
    }

    const quantityChange = data.quantity - existingStock.quantity;
    await prisma.stockJournal.create({
        data: { productStockId: id, adminId, quantityChange, reason }
    });

    const updatedStock = await prisma.productStock.update({
        where: { id },
        data: { quantity: data.quantity },
        include: { product: true, store: true }
    });
    return transformStockToResponse(updatedStock);
};

// Delete Stock (with confirmation)
export const deleteStock = async (id: number, adminId: number): Promise<void> => {
    try {
        const existingStock = await prisma.productStock.findUnique({ where: { id } });
        if (!existingStock) throw new Error("Stock not found");

        // Log deletion as journal entry
        await prisma.stockJournal.create({
            data: {
                productStockId: id,
                adminId,
                quantityChange: 0,
                reason: "Stock Deleted"
            }
        });

        // Soft delete
        await prisma.productStock.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
    } catch (err: any) {
        throw err;
    }
};


// Restore deleted stock
export const restoreStock = async (id: number, adminId: number): Promise<StockResponse> => {
    try {
        const existingStock = await prisma.productStock.findUnique({ where: { id } });
        if (!existingStock) throw new Error("Stock not found");

        if (existingStock.deletedAt === null) {
            throw new Error("Stock is not deleted");
        }

        // Log restoration as journal entry
        await prisma.stockJournal.create({
            data: {
                productStockId: id,
                adminId,
                quantityChange: 0,
                reason: "Stock Restored"
            }
        });

        // Restore by setting deletedAt to null
        const restoredStock = await prisma.productStock.update({
            where: { id },
            data: { deletedAt: null },
            include: { product: true, store: true }
        });
        return transformStockToResponse(restoredStock);
    } catch (err: any) {
        throw err;
    }
};

// GET Journals for a stock
export const getStockJournals = async (stockId: number): Promise<StockJournalResponse[]> => {
    const journals = await prisma.stockJournal.findMany({
        where: {productStockId: stockId},
        include: {admin: {select: {id: true, fullName: true} } },
    });
    return journals as StockJournalResponse[];
};