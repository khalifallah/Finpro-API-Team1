import { Request, Response, NextFunction } from "express";
import * as userService from "../services/user.service";
import { StoreService } from "../services/store.service";
import AppError from "../errors/app.error";
import { responseBuilder } from "../utils/response.builder";

const storeService = new StoreService();

export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const role = req.query.role as string;

    console.log("📋 getAllUsers called:", { page, limit, search, role });

    // ✅ Validasi input
    if (page < 1 || limit < 1) {
      return res.status(400).json(
        responseBuilder(400, "Invalid pagination parameters", {})
      );
    }

    const { users, total } = await userService.getAllUsers(
      page,
      limit,
      search,
      role
    );

    console.log("✅ Returning users:", { count: users.length, total });

    res.status(200).json(
      responseBuilder(200, "Users retrieved successfully", {
        users,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      })
    );
  } catch (err) {
    console.error("❌ getAllUsers error:", err);
    next(err);
  }
};

export const getStoreAdmins = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const admins = await userService.getStoreAdmins();
    res.status(200).json(
      responseBuilder(200, "Store admins retrieved successfully", {
        admins,
      })
    );
  } catch (err) {
    console.error("❌ getStoreAdmins error:", err);
    next(err);
  }
};

export const createStoreAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await userService.createStoreAdmin({
      ...req.body,
      role: req.body.role || "STORE_ADMIN",
    });
    res.status(201).json(
      responseBuilder(201, "User created successfully", {
        user,
      })
    );
  } catch (err) {
    console.error("❌ createStoreAdmin error:", err);
    next(err);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await userService.updateUser(
      parseInt(req.params.id),
      req.body
    );
    res.status(200).json(
      responseBuilder(200, "User updated successfully", {
        user,
      })
    );
  } catch (err) {
    console.error("❌ updateUser error:", err);
    next(err);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await userService.deleteUser(parseInt(req.params.id));
    res.status(200).json(
      responseBuilder(200, "User deleted successfully", {})
    );
  } catch (err) {
    console.error("❌ deleteUser error:", err);
    next(err);
  }
};
