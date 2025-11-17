import { Request, Response, NextFunction } from "express";
import { verifyJWT } from "../libs/jwt";
import { UserRole } from "../generated/prisma-client";
import AppError from "../errors/app.error";

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1]; // assume team using Bearer token
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
        const decoded = verifyJWT(token);
        if (decoded.role !== UserRole.STORE_ADMIN && decoded.role !== UserRole.SUPER_ADMIN) {
            return res.status(403).json({ error: "Forbidden: Admins only" });
        }

        req.jwtPayload = decoded; // attach user info to request
        next();
    } catch (err) {
        throw new AppError("Invalid token", 401);
    }   
};

export const superAdminAuth = (req: Request, res: Response, next: NextFunction) => {
    if(req.jwtPayload?.role !== UserRole.SUPER_ADMIN) {
        return res.status(403).json({ error: "Forbidden: Super Admins only" });
    }
    next();
};