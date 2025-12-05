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
    const users = await userService.getAllUsers();
    res.status(200).json(
      responseBuilder(200, "Users retrieved successfully", {
        users,
      })
    );
  } catch (err) {
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
    next(err);
  }
};

export const createStoreAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await userService.createStoreAdmin(req.body);
    res.status(201).json(
      responseBuilder(201, "Store admin created successfully", {
        user,
      })
    );
  } catch (err) {
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
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// New function to get users with store information
export const getUsersWithStores = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await userService.getAllUsers();

    // Enhance with store information
    const enhancedUsers = await Promise.all(
      users.map(async (user) => {
        if (user.storeId) {
          const store = await storeService.getStoreById(user.storeId);
          return {
            ...user,
            store: store
              ? {
                  id: store.id,
                  name: store.name,
                  address: store.address,
                }
              : null,
          };
        }
        return { ...user, store: null };
      })
    );

    res.status(200).json(
      responseBuilder(200, "Users with store info retrieved successfully", {
        users: enhancedUsers,
      })
    );
  } catch (err) {
    next(err);
  }
};
