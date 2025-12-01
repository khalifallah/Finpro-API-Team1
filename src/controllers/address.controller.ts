import { Request, Response, NextFunction } from "express";
import { AddressService } from "../services/address.service";
import AppError from "../errors/app.error";
import { responseBuilder } from "../utils/response.builder";

const addressService = new AddressService();

// Helper function to get user ID from request
const getUserId = (req: Request): number => {
  if (!req.user) {
    throw new AppError("User not authenticated", 401);
  }

  const userId = req.user.id;

  if (!userId) {
    console.error("User object structure:", req.user);
    throw new AppError("User ID not found in token", 400);
  }

  if (isNaN(Number(userId))) {
    console.error("Invalid user ID:", userId);
    throw new AppError("Invalid user ID format", 400);
  }

  return Number(userId);
};

export class AddressController {
  // Create new address
  static async createAddress(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);
      const {
        label,
        fullAddress,
        latitude,
        longitude,
        recipientName,
        recipientPhone,
        isMain,
      } = req.body;

      const address = await addressService.createAddress({
        userId,
        label,
        fullAddress,
        latitude,
        longitude,
        recipientName,
        recipientPhone,
        isMain,
      });

      res.status(201).json(
        responseBuilder(201, "Address created successfully", {
          address,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get user addresses
  static async getUserAddresses(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);

      const addresses = await addressService.getUserAddresses(userId);

      res.status(200).json(
        responseBuilder(200, "Addresses retrieved successfully", {
          addresses,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get address by ID
  static async getAddressById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);
      const { addressId } = req.params;

      const address = await addressService.getAddressById(
        Number(addressId),
        userId
      );

      res.status(200).json(
        responseBuilder(200, "Address retrieved successfully", {
          address,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Update address
  static async updateAddress(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);
      const { addressId } = req.params;
      const {
        label,
        fullAddress,
        latitude,
        longitude,
        recipientName,
        recipientPhone,
        isMain,
      } = req.body;

      const updatedAddress = await addressService.updateAddress(
        Number(addressId),
        userId,
        {
          label,
          fullAddress,
          latitude,
          longitude,
          recipientName,
          recipientPhone,
          isMain,
        }
      );

      res.status(200).json(
        responseBuilder(200, "Address updated successfully", {
          address: updatedAddress,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Delete address
  static async deleteAddress(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);
      const { addressId } = req.params;

      await addressService.deleteAddress(Number(addressId), userId);

      res
        .status(200)
        .json(responseBuilder(200, "Address deleted successfully", {}));
    } catch (error) {
      next(error);
    }
  }

  // Set address as main
  static async setMainAddress(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);
      const { addressId } = req.params;

      const updatedAddress = await addressService.setMainAddress(
        Number(addressId),
        userId
      );

      res.status(200).json(
        responseBuilder(200, "Address set as main successfully", {
          address: updatedAddress,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}
