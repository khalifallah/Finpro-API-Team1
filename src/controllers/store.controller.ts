import { Request, Response, NextFunction } from "express";
import { StoreService } from "../services/store.service";
import AppError from "../errors/app.error";
import { responseBuilder } from "../utils/response.builder";

const storeService = new StoreService();

export class StoreController {
  // Get all stores
  static async getStores(req: Request, res: Response, next: NextFunction) {
    try {
      const query = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as "asc" | "desc",
      };

      const result = await storeService.getStores(query);

      res.status(200).json(
        responseBuilder(200, "Stores retrieved successfully", {
          stores: result.stores,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get store by ID
  static async getStoreById(req: Request, res: Response, next: NextFunction) {
    try {
      const storeId = parseInt(req.params.id);
      if (isNaN(storeId)) {
        throw new AppError("Invalid store ID", 400);
      }

      const store = await storeService.getStoreById(storeId);

      if (!store) {
        throw new AppError("Store not found", 404);
      }

      res.status(200).json(
        responseBuilder(200, "Store retrieved successfully", {
          store,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Create new store
  static async createStore(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, address, latitude, longitude } = req.body;

      const store = await storeService.createStore({
        name,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      });

      res.status(201).json(
        responseBuilder(201, "Store created successfully", {
          store,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Update store
  static async updateStore(req: Request, res: Response, next: NextFunction) {
    try {
      const storeId = parseInt(req.params.id);
      if (isNaN(storeId)) {
        throw new AppError("Invalid store ID", 400);
      }

      const { name, address, latitude, longitude } = req.body;

      const updateData: any = {};
      if (name) updateData.name = name;
      if (address) updateData.address = address;
      if (latitude) updateData.latitude = parseFloat(latitude);
      if (longitude) updateData.longitude = parseFloat(longitude);

      const store = await storeService.updateStore(storeId, updateData);

      res.status(200).json(
        responseBuilder(200, "Store updated successfully", {
          store,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Delete store
  static async deleteStore(req: Request, res: Response, next: NextFunction) {
    try {
      const storeId = parseInt(req.params.id);
      if (isNaN(storeId)) {
        throw new AppError("Invalid store ID", 400);
      }

      // Check for confirmation
      const confirm = req.query.confirm === "yes";
      if (!confirm) {
        throw new AppError(
          "Confirmation required: add ?confirm=yes to delete store",
          400
        );
      }

      await storeService.deleteStore(storeId);

      res
        .status(200)
        .json(responseBuilder(200, "Store deleted successfully", {}));
    } catch (error) {
      next(error);
    }
  }

  // Assign store admin to store
  static async assignStoreAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId, storeId } = req.body;

      if (!userId || !storeId) {
        throw new AppError("User ID and Store ID are required", 400);
      }

      const user = await storeService.assignStoreAdmin(
        parseInt(userId),
        parseInt(storeId)
      );

      res.status(200).json(
        responseBuilder(200, "Store admin assigned successfully", {
          user,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Remove store admin from store
  static async removeStoreAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        throw new AppError("Invalid user ID", 400);
      }

      const user = await storeService.removeStoreAdmin(userId);

      res.status(200).json(
        responseBuilder(200, "Store admin removed from store successfully", {
          user,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get available store admins (not assigned to any store)
  static async getAvailableStoreAdmins(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const storeAdmins = await storeService.getAvailableStoreAdmins();

      res.status(200).json(
        responseBuilder(200, "Available store admins retrieved successfully", {
          storeAdmins,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get store admins by store ID
  static async getStoreAdminsByStoreId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const storeId = parseInt(req.params.storeId);
      if (isNaN(storeId)) {
        throw new AppError("Invalid store ID", 400);
      }

      const storeAdmins = await storeService.getStoreAdminsByStoreId(storeId);

      res.status(200).json(
        responseBuilder(200, "Store admins retrieved successfully", {
          storeAdmins,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get deleted stores
  static async getDeletedStores(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as "asc" | "desc",
      };

      const result = await storeService.getDeletedStores(query);

      res.status(200).json(
        responseBuilder(200, "Deleted stores retrieved successfully", {
          stores: result.stores,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Restore deleted store
  static async restoreStore(req: Request, res: Response, next: NextFunction) {
    try {
      const storeId = parseInt(req.params.id);
      if (isNaN(storeId)) {
        throw new AppError("Invalid store ID", 400);
      }

      const store = await storeService.restoreStore(storeId);

      res.status(200).json(
        responseBuilder(200, "Store restored successfully", {
          store,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}
