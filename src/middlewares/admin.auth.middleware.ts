import { Request, Response, NextFunction } from "express";
import { verifyJWT } from "../libs/jwt";
import { UserRole } from "../generated/prisma-client";
import AppError from "../errors/app.error";

// Middleware untuk admin (store admin dan super admin)
export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = verifyJWT(token);
    if (
      decoded.role !== UserRole.STORE_ADMIN &&
      decoded.role !== UserRole.SUPER_ADMIN
    ) {
      return res.status(403).json({ error: "Forbidden: Admins only" });
    }

    req.jwtPayload = decoded;
    next();
  } catch (err) {
    throw new AppError("Invalid token", 401);
  }
};

// Middleware khusus untuk super admin
export const superAdminAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = verifyJWT(token);
    if (decoded.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Forbidden: Super Admins only" });
    }

    req.jwtPayload = decoded;
    next();
  } catch (err) {
    throw new AppError("Invalid token", 401);
  }
};

// Middleware untuk store admin (hanya bisa akses store mereka sendiri)
export const storeAdminAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = verifyJWT(token);
    if (decoded.role !== UserRole.STORE_ADMIN) {
      return res.status(403).json({ error: "Forbidden: Store Admins only" });
    }

    req.jwtPayload = decoded;
    next();
  } catch (err) {
    throw new AppError("Invalid token", 401);
  }
};
