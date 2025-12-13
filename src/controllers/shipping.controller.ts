import { Request, Response, NextFunction } from "express";
import { ShippingService } from "../services/shipping.service";
import { CheckoutService } from "../services/checkout.service";
import AppError from "../errors/app.error";
import { responseBuilder } from "../utils/response.builder";

const shippingService = new ShippingService();
const checkoutService = new CheckoutService();

export class ShippingController {
  // Calculate shipping cost untuk address tertentu
  static async calculateShipping(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const { addressId, weight, storeId } = req.body; // Add storeId

      if (!addressId) {
        throw new AppError("Address ID is required", 400);
      }

      // Dapatkan address
      const address = await shippingService.getAddressById(
        addressId,
        req.user.id
      );

      // *** FIX: Use provided storeId or find nearest ***
      let selectedStore;
      if (storeId) {
        // Use the provided store
        selectedStore = await shippingService.getStoreById(storeId);
      } else {
        // Cari store terdekat jika tidak ada storeId
        const nearestStore = await shippingService.findNearestStore(address);
        selectedStore = nearestStore.store;
      }

      // Hitung shipping cost
      const shippingResult = await shippingService.calculateShippingForCheckout(
        selectedStore.id,
        address,
        weight || 1000 // Default weight 1kg
      );

      res.status(200).json(
        responseBuilder(200, "Shipping cost calculated successfully", {
          shippingOptions: shippingResult.availableServices,
          distance: shippingResult.distance,
          store: selectedStore,
          address: address,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get checkout preview
  static async getCheckoutPreview(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const { addressId, storeId } = req.query; // Add storeId

      const preview = await checkoutService.getCheckoutPreview(
        req.user.id,
        addressId ? Number(addressId) : undefined,
        storeId ? Number(storeId) : undefined // Pass storeId to service
      );

      res.status(200).json(
        responseBuilder(200, "Checkout preview retrieved successfully", {
          preview,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Validate checkout sebelum proses
  static async validateCheckout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const { addressId, shippingMethod, storeId } = req.body; // Add storeId

      if (!addressId || !shippingMethod) {
        throw new AppError("Address ID and shipping method are required", 400);
      }

      const validation = await checkoutService.validateCheckout({
        userId: req.user.id,
        addressId,
        shippingMethod,
        storeId, // Pass storeId if provided
      });

      res.status(200).json(
        responseBuilder(200, "Checkout validation successful", {
          isValid: validation.isValid,
          userAddress: validation.userAddress,
          selectedStore: validation.selectedStore,
          shippingCost: validation.shippingCost,
          distance: validation.distance,
          subtotal: validation.subtotal,
          availableShippingMethods: validation.availableShippingMethods,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get nearest store to user
  static async getNearestStore(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const { addressId } = req.query;

      if (!addressId) {
        throw new AppError("Address ID is required", 400);
      }

      // Dapatkan address
      const address = await shippingService.getAddressById(
        Number(addressId),
        req.user.id
      );

      // Cari store terdekat
      const nearestStore = await shippingService.findNearestStore(address);

      res.status(200).json(
        responseBuilder(200, "Nearest store found successfully", {
          store: nearestStore.store,
          distance: nearestStore.distance,
          userAddress: address,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Calculate distance between address and store
  static async calculateDistance(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { addressLat, addressLng, storeId } = req.body;

      if (!addressLat || !addressLng || !storeId) {
        throw new AppError(
          "Address coordinates and store ID are required",
          400
        );
      }

      // Dapatkan store
      const store = await shippingService.getStoreById(storeId);

      // Hitung jarak
      const distance = shippingService.calculateDistance(
        { latitude: addressLat, longitude: addressLng },
        { latitude: Number(store.latitude), longitude: Number(store.longitude) }
      );

      res.status(200).json(
        responseBuilder(200, "Distance calculated successfully", {
          distance: parseFloat(distance.toFixed(2)),
          store,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}
