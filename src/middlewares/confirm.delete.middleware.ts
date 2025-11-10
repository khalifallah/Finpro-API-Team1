import { Request, Response, NextFunction } from "express";

export const confirmDelete = (req: Request, res: Response, next: NextFunction) => {
    const {confirm} = req.query;
    if (confirm !== "yes") {
        return res.status(400).json({error: "Confirmation required: add ?confirm=yes"});
    }
    next();
}