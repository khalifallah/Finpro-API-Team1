import { Request, Response } from "express";
import * as stockService from "../services/stock.service";
import { StockQuery } from "../types/stock.types";
import { stockSchema, updateStockSchema } from "../validations/stock.validation";

// Helper: Parse query parameters for stocks
const parseStockQuery = (query: any): StockQuery => ({
    storeId: query.storeId ? parseInt(String(query.storeId)) : undefined,
    productId: query.productId ? parseInt(String(query.productId)) : undefined,
    page: query.page ? parseInt(String(query.page), 10) : 1,
    limit: query.limit ? parseInt(String(query.limit), 10) : 10,
    sortBy: query.sortBy === "quantity" ? "quantity" : "createdAt",
    sortOrder: query.sortOrder === "asc" ? "asc" : "desc",
});

export const getStocks = async (req: Request, res: Response) => {
    try {
        const query = parseStockQuery(req.query);
        const userStoreId = req.jwtPayload?.storeId;
        const result = await stockService.getStocks(query, userStoreId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch stocks" });
    }
};

export const getStockById = async (req: Request, res: Response) => {
    try {
        const result = await stockService.getStockById(parseInt(req.params.id));
        if (!result) {
            return res.status(404).json({ error: "Stock not found" });
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch stock" });
    }
};

// PATCHED: Allow all admins to create stock with store validation
export const createStock = async (req: Request, res: Response) => {
    try {
        const userRole = req.jwtPayload?.role;
        const userStoreId = req.jwtPayload?.storeId;

        let stockData = { ...req.body };

        // Store Admin: Auto-assign to their own store
        if (userRole === 'STORE_ADMIN') {
            if (!userStoreId) {
                return res.status(403).json({ 
                    error: "Store Admin must be assigned to a store" 
                });
            }
            
            // If storeId provided, validate it matches their store
            if (stockData.storeId && stockData.storeId !== userStoreId) {
                return res.status(403).json({ 
                    error: "Store Admin can only create stock for their own store" 
                });
            }
            
            // Auto-assign storeId to their store
            stockData.storeId = userStoreId;
        }

        // Super Admin: Must provide storeId
        if (userRole === 'SUPER_ADMIN' && !stockData.storeId) {
            return res.status(400).json({ 
                error: "Super Admin must specify a store for the stock" 
            });
        }

        await stockSchema.validate(stockData);
        const stock = await stockService.createStock(stockData);
        res.status(201).json(stock);
    } catch (err: any) {
        res.status(400).json({ error: err.message || "Failed to create stock" });
    }
};

// PATCHED: Add store validation for Store Admin
export const updateStock = async (req: Request, res: Response) => {
    try {
        await updateStockSchema.validate(req.body);

        const stockId = parseInt(req.params.id);

        if (isNaN(stockId)) {
            return res.status(400).json({ error: "Invalid stock ID" });
        }

        // Get existing stock to check store ownership
        const existingStock = await stockService.getStockById(stockId);
        if (!existingStock) {
            return res.status(404).json({ error: "Stock not found" });
        }

        // Store Admin can only update stock from their own store
        const userStoreId = req.jwtPayload?.storeId;
        const userRole = req.jwtPayload?.role;

        if (userRole === 'STORE_ADMIN' && userStoreId && existingStock.storeId !== userStoreId) {
            return res.status(403).json({
                error: "Store Admin can only update stock from their own store"
            });
        }

        // Store Admin cannot change storeId
        if (userRole === 'STORE_ADMIN' && req.body.storeId && req.body.storeId !== userStoreId) {
            return res.status(403).json({
                error: "Store Admin cannot change store assignment"
            });
        }

        const adminId = req.jwtPayload!.id;
        const reason = req.body.reason || "Manual Stock Update";
        const stock = await stockService.updateStock(stockId, req.body, adminId, reason);
        res.json(stock);
    } catch (err: any) {
        if (err.message.includes("deleted")) {
            return res.status(410).json({ error: err.message });
        }
        res.status(400).json({ error: err.message || "Failed to update stock" });
    }
};

export const deleteStock = async (req: Request, res: Response) => {
    try {
        const stockId = parseInt(req.params.id);

        if (isNaN(stockId)) {
            return res.status(400).json({ error: "Invalid stock ID" });
        }

        const stock = await stockService.getStockById(stockId);
        if (!stock) {
            return res.status(404).json({ error: "Stock not found" });
        }

        // Store Admin can only delete stock from their own store
        const userStoreId = req.jwtPayload?.storeId;
        const userRole = req.jwtPayload?.role;

        if (userRole === 'STORE_ADMIN' && userStoreId && stock.storeId !== userStoreId) {
            return res.status(403).json({
                error: "Store Admin can only delete stock from their own store"
            });
        }

        const adminId = req.jwtPayload!.id;
        await stockService.deleteStock(stockId, adminId);

        res.status(204).send();
    } catch (err: any) {
        res.status(500).json({ error: err.message || "Failed to delete stock" });
    }
};

export const restoreStock = async (req: Request, res: Response) => {
    try {
        const stockId = parseInt(req.params.id);

        if (isNaN(stockId)) {
            return res.status(400).json({ error: "Invalid stock ID" });
        }

        const existingStock = await stockService.getStockById(stockId);

        // Store Admin can only restore stock from their own store
        const userStoreId = req.jwtPayload?.storeId;
        const userRole = req.jwtPayload?.role;

        if (userRole === 'STORE_ADMIN' && userStoreId && existingStock && existingStock.storeId !== userStoreId) {
            return res.status(403).json({
                error: "Store Admin can only restore stock from their own store"
            });
        }

        const adminId = req.jwtPayload!.id;
        const stock = await stockService.restoreStock(stockId, adminId);
        res.json(stock);
    } catch (err: any) {
        if (err.message.includes("not deleted")) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message || "Failed to restore stock" });
    }
};

export const getStockJournals = async (req: Request, res: Response) => {
    try {
        const journals = await stockService.getStockJournals(parseInt(req.params.id));
        res.json(journals);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch stock journals" });
    }
};