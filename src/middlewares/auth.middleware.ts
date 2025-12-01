import { NextFunction, Request, Response } from "express";
import prisma from "../libs/prisma";
import { appErrorHandler } from "../errors/handlers/app.error.handler";
import { verifyJWT } from "../libs/jwt";
import TUser from "../models/user.model";
import AppError from "../errors/app.error";
import { oauthService } from "../services/auth/auth.service";

declare global {
  namespace Express {
    interface Request {
      authStatus?: {
        isVerified: boolean;
        permissions: string[];
      };
    }
  }
}

export const uniqueUserGuard = async (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (user) throw new AppError("User already exists", 400);
    next();
  } catch (error) {
    appErrorHandler(error, next);
  }
};

export const adminGuard = async (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("User not authenticated", 401);
    if (req.user.role !== "STORE_ADMIN" && req.user.role !== "SUPER_ADMIN")
      throw new AppError("Access denied: Admins only", 403);
    next();
  } catch (error) {
    appErrorHandler(error, next);
  }
};

export const verifyToken = async (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new AppError("Authorization header missing", 401);
    const token = authHeader.split(" ")[1];
    if (!token) throw new AppError("Token missing", 401);
    const decoded = verifyJWT(token);
    if (!decoded) throw new AppError("Invalid token", 403);
    req.user = decoded as TUser;
    next();
  } catch (error) {
    appErrorHandler(error, next);
  }
};

// Middleware to check if user is verified
export const requireVerifiedUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        emailVerifiedAt: true,
        fullName: true,
        email: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!user.emailVerifiedAt) {
      throw new AppError(
        "Email verification required. Please verify your email to access this resource.",
        403
      );
    }

    next();
  } catch (error) {
    appErrorHandler(error, next);
  }
};

// Middleware to check specific permissions
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }
      const authStatus = await oauthService.getUserAuthStatus(req.user.id);
      if (!authStatus.permissions.includes(permission)) {
        throw new AppError(
          `Insufficient permissions. Required: ${permission}`,
          403
        );
      }
      next();
    } catch (error) {
      appErrorHandler(error, next);
    }
  };
};

// Middleware to check if user can perform cart operations
export const canAddToCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required to add items to cart", 401);
    }

    const authStatus = await oauthService.getUserAuthStatus(req.user.id);

    if (!authStatus.isVerified) {
      throw new AppError("Please verify your email to add items to cart", 403);
    }

    if (!authStatus.permissions.includes("add_to_cart")) {
      throw new AppError("You don't have permission to add items to cart", 403);
    }

    next();
  } catch (error) {
    appErrorHandler(error, next);
  }
};

// Middleware to check if user can place orders
export const canPlaceOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required to place orders", 401);
    }

    const authStatus = await oauthService.getUserAuthStatus(req.user.id);

    if (!authStatus.isVerified) {
      throw new AppError("Please verify your email to place orders", 403);
    }

    if (!authStatus.permissions.includes("place_orders")) {
      throw new AppError("You don't have permission to place orders", 403);
    }

    next();
  } catch (error) {
    appErrorHandler(error, next);
  }
};

// Combined middleware for common verified user operations
export const requireAuthAndVerification = [verifyToken, requireVerifiedUser];

// Middleware to get user auth status and attach to request
export const attachAuthStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user) {
      const authStatus = await oauthService.getUserAuthStatus(req.user.id);
      req.authStatus = authStatus;
    }
    next();
  } catch (error) {
    // Continue even if auth status fails
    next();
  }
};
