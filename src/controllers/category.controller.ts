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
        await categoryService.deleteCategory(parseInt(req.params.id));
        res.status(204).send();
    } catch (err) {
        res.status(400).json({error: "Failed to delete category"});
    }
};
