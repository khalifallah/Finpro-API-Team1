import { Request , Response } from "express";
import * as productService from "../services/product.service";
import { ProductQuery } from "../types/product.types";

// ? Helper function to parse query parameters into ProductQuery type // ?
const parseProductQuery = (query: any) : ProductQuery => {
    return {
        search: query.search ? String(query.search) : undefined,
        categoryId: query.categoryId ? parseInt(String(query.categoryId), 10) : undefined,
        storeId: query.storeId ? parseInt(String(query.storeId), 10) : undefined,
        page: query.page ? parseInt(String(query.page) ,10 ) : 1,
        limit: query.limit ? parseInt(String(query.limit) , 10) : 10,
        sortBy: query.sortBy && ["name" , "price" , "createdAt"].includes(query.sortBy) ? query.sortBy : "createdAt",
        sortOrder: query.sortOrder === "asc" ? "asc" : "desc",
    };
};

export const getProducts = async (req: Request, res: Response) => {
    try {
        const query = parseProductQuery(req.query);
        const result = await productService.getProducts(query, query.storeId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch products" });
    }
};

export const getProductById = async (req: Request, res: Response) => {
    try {
        const query = parseProductQuery(req.query);
        const result = await productService.getProductById(parseInt(req.params.id), query.storeId);
        if (!result) return res.status(404).json({ error: "Product not found" });
        res.json(result);

    } catch (err) {
        res.status(500).json({ error: "Failed to fetch product" });
    }
};

// Super Admin Only Section

export const createProduct = async (req: Request, res: Response) => {
    try {
        const product = await productService.createProduct(req.body, req.files as Express.Multer.File[]);
        res.status(201).json(product);
    } catch (err: any) {
        if (err?.message?.includes("unique")) res.status(400).json({ error: err.message});
        else res.status(500).json({ error: "Failed to create product" });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const product = await productService.updateProduct(parseInt(req.params.id), req.body);
        res.json(product);
    } catch (err: any) {
        if (err?.message?.includes("unique")) res.status(400).json({ error: err.message});
        else res.status(500).json({ error: "Failed to update product" });
    }
};

// with deletion confirmation
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const product = await productService.deleteProduct(parseInt(req.params.id));
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: "Failed to delete product" });
    }
};