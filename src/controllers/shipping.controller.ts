import { Request, Response, NextFunction } from "express";
import { ShippingService } from "../services/shipping.service";
import { CheckoutService } from "../services/checkout.service";
import { RajaOngkirService } from "../services/rajaongkir.service";
import AppError from "../errors/app.error";
import { responseBuilder } from "../utils/response.builder";
import { OrderService } from "../services/order/order.service";

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

      // Validasi address memiliki cityId
      if (!address.cityId) {
        throw new AppError(
          "Please update your address with city information",
          400
        );
      }

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

      // Validasi store memiliki cityId
      if (!selectedStore.cityId) {
        throw new AppError(
          "Selected store does not have city configuration",
          400
        );
      }

      // Hitung shipping cost via RajaOngkir
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

      const { addressId, storeId, voucherCode } = req.query;

      const preview = await checkoutService.getCheckoutPreview(
        req.user.id,
        addressId ? Number(addressId) : undefined,
        storeId ? Number(storeId) : undefined,
        voucherCode ? String(voucherCode) : undefined
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
  static async validateCheckout(req: Request, res: Response) {
    try {
      console.log("[DEBUG] validateCheckout called with body:", req.body);
      console.log("[DEBUG] User ID:", (req as any).user?.id);
      const userId = (req as any).user.id;
      const { addressId, shippingMethod, storeId, voucherCode } = req.body;

      // Validate inputs
      if (!addressId || !shippingMethod || !storeId) {
        throw new AppError("Missing required fields", 400);
      }

      const shippingService = new ShippingService();
      const orderService = new OrderService();

      // Get address
      const address = await shippingService.getAddressById(addressId, userId);

      // Get store
      const store = await shippingService.getStoreById(storeId);

      // Calculate shipping
      const shippingResult = await shippingService.calculateShippingForCheckout(
        storeId,
        address,
        1000, // Default weight, adjust as needed
        shippingMethod
      );

      // Validate checkout (check stock, prices, etc.)
      const validationResult = await orderService.validateCheckout({
        userId,
        storeId,
        addressId,
        shippingMethod,
        voucherCode,
      });

      // Combine results
      const result = {
        ...validationResult,
        distance: shippingResult.distance,
        shippingCost: shippingResult.totalShippingCost,
        availableShippingMethods: shippingResult.availableServices,
        selectedShippingMethod: shippingResult.selectedService,
        address,
        store,
      };

      res.status(200).json({
        status: 200,
        message: "Checkout validation successful",
        data: result,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status((error as any).statusCode).json({
          status: (error as any).statusCode,
          message: error.message,
          data: null,
        });
      } else {
        console.error("Validate checkout error:", error);
        res.status(500).json({
          status: 500,
          message: "Internal server error",
          data: null,
        });
      }
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

  // Get RajaOngkir cities (untuk autocomplete di frontend)
  static async getRajaOngkirCities(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { provinceId } = req.query;

      const rajaongkirService = new RajaOngkirService();
      const cities = await rajaongkirService.getCities(provinceId?.toString());

      res.status(200).json(
        responseBuilder(200, "Cities retrieved successfully", {
          cities,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get RajaOngkir provinces
  static async getRajaOngkirProvinces(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rajaongkirService = new RajaOngkirService();
      const provinces = await rajaongkirService.getProvinces();

      res.status(200).json(
        responseBuilder(200, "Provinces retrieved successfully", {
          provinces,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}
