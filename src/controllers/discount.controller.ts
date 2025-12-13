import { Request, Response } from "express";
import * as discountService from "../services/discount.service";
import { DiscountQuery } from "../types/discount.types";
import { discountRuleSchema, updateDiscountRuleSchema, applyDiscountSchema } from "../validations/discount.validation";

// Helper: Parse query parameters for discount rules
const parseDiscountQuery = (query: any): DiscountQuery => ({
    storeId: query.storeId ? parseInt(String(query.storeId)) : undefined,
    productId: query.productId ? parseInt(String(query.productId)) : undefined,
    type: query.type,
    is_active: query.is_active === "true" ? true : query.is_active === "false" ? false : undefined,
    page: query.page ? parseInt(String(query.page), 10) : 1,
    limit: query.limit ? parseInt(String(query.limit), 10) : 10,
    sortBy: query.sortBy === "value" ? "value" : "createdAt",
    sortOrder: query.sortOrder === "asc" ? "asc" : "desc",
});

// Helper: Parse query for deleted rules
const parseDeletedQuery = (query: any) => ({
    page: query.page ? parseInt(String(query.page), 10) : 1,
    limit: query.limit ? parseInt(String(query.limit), 10) : 10,
    sortBy: query.sortBy || "createdAt",
    sortOrder: query.sortOrder || "desc",
});

export const getDiscountRules = async (req: Request, res: Response) => {
    try {
        const query = parseDiscountQuery(req.query);
        const userStoreId = req.jwtPayload?.storeId;
        const result = await discountService.getDiscountRules(query, userStoreId);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message || "Failed to fetch discount rules" });
    }
};

export const getDiscountById = async (req: Request, res: Response) => {
    try {
        const result = await discountService.getDiscountRuleById(parseInt(req.params.id));
        if (!result) return res.status(404).json({ error: "Discount rule not found" });
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message || "Failed to fetch discount rule" });
    }
};

export const createDiscountRule = async (req: Request, res: Response) => {
    try {
        
        await discountRuleSchema.validate(req.body);
        const storeId = req.jwtPayload?.storeId;
                
        if (!storeId) {
            return res.status(400).json({ 
                error: "Store ID is required for STORE_ADMIN !!",
                debug: {
                    jwtPayload: req.jwtPayload,
                    bodyStoreId: req.body.storeId,
                }
            });
        }
        
        // Gunakan storeId dari body (dari frontend), bukan dari JWT
        const finalStoreId = req.body.storeId || storeId;
        
        const rule = await discountService.createDiscountRule(req.body, finalStoreId);
        res.status(201).json(rule);
    } catch (err: any) {
        res.status(400).json({ error: err.message || "Failed to create discount rule" });
    }
};

export const updateDiscountRule = async (req: Request, res: Response) => {
    try {
        await updateDiscountRuleSchema.validate(req.body);
        const rule = await discountService.updateDiscountRule(parseInt(req.params.id), req.body);
        res.json(rule);
    } catch (err: any) {
        res.status(400).json({ error: err.message || "Failed to update discount rule" });
    }
};

export const deleteDiscountRule = async (req: Request, res: Response) => {
    try {
        await discountService.deleteDiscountRule(parseInt(req.params.id));
        res.status(204).send();
    } catch (err: any) {
        res.status(500).json({ error: err.message || "Failed to delete discount rule" });
    }
};

export const getDeletedDiscountRules = async (req: Request, res: Response) => {
    try {
        const query = parseDeletedQuery(req.query);
        const result = await discountService.getDeletedDiscountRules(query);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message || "Failed to fetch deleted discount rules" });
    }
};

export const restoreDiscountRule = async (req: Request, res: Response) => {
    try {
        const rule = await discountService.restoreDiscountRule(parseInt(req.params.id));
        res.json(rule);
    } catch (err: any) {
        res.status(400).json({ error: err.message || "Failed to restore discount rule" });
    }
};

export const applyDiscount = async (req: Request, res: Response) => {
    try {
        await applyDiscountSchema.validate(req.body);
        const result = await discountService.applyDiscount(req.body);
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message || "Failed to apply discount" });
    }
};

export const getDiscountUsages = async (req: Request, res: Response) => {
    try {
        const usages = await discountService.getDiscountUsages(parseInt(req.params.id));
        res.json(usages);
    } catch (err: any) {
        res.status(500).json({ error: err.message || "Failed to fetch discount usages" });
    }
};