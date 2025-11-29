import { Request , Response } from "express";
import * as productService from "../services/product.service";
import { ProductQuery } from "../types/product.types";
import { CreateProductRequest } from "../types/product.types";


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

// Super Admin Only Section: CRUD Operations //

// Helper: Convert form-data string to correct types
const parseCreateProductData = (body: any) : CreateProductRequest => ({
    name: String(body.name),
    description: String(body.description),
    price: parseInt(String(body.price), 10),
    categoryId: parseInt(String(body.categoryId), 10),
    storeId: parseInt(String(body.storeId), 10),
});

export const createProduct = async (req: Request, res: Response) => {
    try {
        const parsedData = parseCreateProductData(req.body);
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "At least one product image is required" });
        }

        const product = await productService.createProduct(parsedData, req.files as Express.Multer.File[]);
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
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid product ID" });
        }
        const result = await productService.deleteProduct(id);
        res.status(204).send();

    } catch (err: any) {
        res.status(500).json({ 
            error: err.message || "Failed to delete product",
            code: err.code // to log prisma error
        });
    }
};

export const restoreProduct = async (req: Request, res: Response) => {
    try {
        const product = await productService.restoreProduct(parseInt(req.params.id));
        res.json(product);
    } catch (err: any) {
        res.status(400).json({ error: err.message || "Failed to restore product" });
    }
};

export const getDeletedProducts = async (req: Request, res: Response) => {
    try {
        const query = parseProductQuery(req.query);
        const result = await productService.getDeletedProducts(query);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch deleted products" });
    }
};