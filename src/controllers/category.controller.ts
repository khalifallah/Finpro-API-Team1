import { Request , Response } from "express";
import * as categoryService from "../services/category.service";

export const getCategories = async (req: Request , res: Response) => {
    try {
        const categories = await categoryService.getCategories();
        res.json(categories);
    } catch (err) {
        res.status(500).json({error: "Failed to fetch categories"});
    }
};

// Super Admin Section only

export const createCategory = async (req: Request, res: Response) => {
    try {
        const category = await categoryService.createCategory(req.body);
        res.status(201).json(category);
    } catch (err: any) {
        if (err?.message?.includes("unique")) res.status(400).json({ error: err.message});
        else res.status(500).json({error: "Failed to create category"});
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const category = await categoryService.updateCategory(parseInt(req.params.id), req.body);
        res.json(category);
    } catch (err: any) {
        if (err?.message?.includes("unique")) res.status(400).json({ error: err.message});
        else res.status(500).json({error: "Failed to update category"});
    }
};

// with deletion confirmation
export const deleteCategory = async (req: Request, res: Response) => {
    try {

        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid category ID or must be a number" });
        }
        
        await categoryService.deleteCategory(id);

        res.status(204).send();
    } catch (err: any) {
        res.status(400).json({error: "Failed to delete category"});
    }
};

export const getDeletedCategories = async (req: Request, res: Response) => {
    try {
        const query = {
            page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
            limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 10,
            sortBy: req.query.sortBy === "name" ? "name" : "createdAt",
            sortOrder: req.query.sortOrder === "asc" ? "asc" : "desc"
        };
        const result = await categoryService.getDeletedCategories(query);
        res.json(result);
    } catch (err) {
        res.status(500).json({error: "Failed to fetch deleted categories"});
    }
};

export const restoreCategory = async (req: Request, res: Response) => {
    try {
        const category = await categoryService.restoreCategory(parseInt(req.params.id));
        res.json(category);
    } catch (err: any) {
        res.status(400).json({error: err.message || "Failed to restore category"});
    }
};