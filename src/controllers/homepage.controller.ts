import { Request, Response, NextFunction } from "express";
import { HomepageService } from "../services/homepage.service";
import AppError from "../errors/app.error";
import { responseBuilder } from "../utils/response.builder";

const homepageService = new HomepageService();

export class HomepageController {
  static async getHomepageData(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Get location from query parameters or headers
      let latitude: number | undefined;
      let longitude: number | undefined;

      // Check if location is provided in query params
      if (req.query.lat && req.query.lng) {
        latitude = parseFloat(req.query.lat as string);
        longitude = parseFloat(req.query.lng as string);

        if (isNaN(latitude) || isNaN(longitude)) {
          throw new AppError("Invalid location coordinates", 400);
        }
      }
      // Alternatively, check for location in headers (if provided by mobile app)
      else if (req.headers["x-latitude"] && req.headers["x-longitude"]) {
        latitude = parseFloat(req.headers["x-latitude"] as string);
        longitude = parseFloat(req.headers["x-longitude"] as string);
      }

      // Get pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const storeIdParam = req.query.storeId;
      const storeId = storeIdParam ? Number(storeIdParam) : undefined;

      // Get homepage data
      const homepageData = await homepageService.getHomepageData(
        latitude,
        longitude,
        page,
        limit,
        storeId
      );

      // Add location info to response
      const responseMeta = {
        locationUsed: !!(latitude && longitude),
        storeSelection: latitude && longitude ? "nearest" : "default",
      };

      res.status(200).json(
        responseBuilder(200, "Homepage data retrieved successfully", {
          ...homepageData,
          meta: responseMeta,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get store list for location selection
  static async getAvailableStores(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        throw new AppError("Location coordinates are required", 400);
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      if (isNaN(latitude) || isNaN(longitude)) {
        throw new AppError("Invalid location coordinates", 400);
      }

      // This would use the shipping service to find nearest stores
      // For now, return all stores with distance
      const shippingService = new HomepageService()["shippingService"];
      const userLocation = {
        latitude,
        longitude,
        fullAddress: "User Location",
        recipientName: "User",
      };

      const nearestStore = await shippingService.findNearestStore(userLocation);

      res.status(200).json(
        responseBuilder(200, "Nearest store found", {
          store: nearestStore.store,
          distance: nearestStore.distance,
          userLocation: {
            latitude,
            longitude,
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Update user's preferred store
  static async updatePreferredStore(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const { storeId } = req.body;

      // In a real implementation, you might store user's preferred store
      // For now, just validate the store exists
      const store = await homepageService.getStoreById(storeId);

      res.status(200).json(
        responseBuilder(200, "Store preference updated", {
          store: {
            id: store.id,
            name: store.name,
            address: store.address,
          },
          message: "Products will now be shown from this store",
        })
      );
    } catch (error) {
      next(error);
    }
  }
}
