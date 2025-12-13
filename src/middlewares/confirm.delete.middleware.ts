import { Request, Response, NextFunction } from "express";

export const confirmDelete = (req: Request, res: Response, next: NextFunction) => {
    // Normalize query keys to lowercase to handle case-insensitive
    const normalizedQuery = Object.keys(req.query).reduce((acc: any, key) => {
        acc[key.toLowerCase()] = req.query[key];
        return acc;
    }, {});
    
    const confirm = String(normalizedQuery.confirm || "").toLowerCase().trim();

    if (confirm !== "yes") {
        return res.status(400).json({ 
            error: "Confirmation required: add ?confirm=yes" 
        });
    }
    next();
};