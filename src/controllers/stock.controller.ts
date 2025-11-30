import e, { Request, Response } from "express";
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
        const result = await stockService.getStockById(parseInt(req.params.id))
        if (!result) {
            return res.status(404).json({ error: "Stock not found" }); 
        }
        res.json(result);

    } catch (err) {
        res.status(500).json({error: "Failed to fetch stock" });
    }
};

export const createStock = async (req: Request, res: Response) => {
    try {
        await stockSchema.validate(req.body);
        const stock = await stockService.createStock(req.body);
        res.status(201).json(stock);
    } catch (err: any) {
        res.status(400).json({ error: err.message || "Failed to create stock" });
    }
};

export const updateStock = async (req: Request, res: Response) => {
    try {
        await updateStockSchema.validate(req.body);
        const adminId = req.jwtPayload!.id;
        const reason = req.body.reason || "Manual Stock Update";
        const stock = await stockService.updateStock(parseInt(req.params.id), req.body, adminId, reason);
        res.json(stock);
    } catch (err: any) {
        
        // Return 410 Gone jika stock sudah dihapus
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

        const userStoreId = req.jwtPayload?.storeId;
        if (userStoreId && stock.storeId !== userStoreId) {
            return res.status(403).json({ error: "Unauthorized: Cannot delete stock from another store" });
        }

        const adminId = req.jwtPayload!.id;
        await stockService.deleteStock(stockId, adminId); // Pass adminId

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