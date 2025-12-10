import { Request, Response, NextFunction } from "express";
import { AddressService } from "../services/address.service";
import { appErrorHandler } from "../errors/handlers/app.error.handler";
import { validateRequest } from "../middlewares/validator.middleware";
import {
  createAddressSchema,
  updateAddressSchema,
} from "../validations/address.validation";

export class AddressController {
  private addressService: AddressService;

  constructor() {
    this.addressService = new AddressService();
  }

  // Create new address
  async createAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const addressData = {
        ...req.body,
        userId: parseInt(userId.toString()),
        latitude: parseFloat(req.body.latitude) || 0,
        longitude: parseFloat(req.body.longitude) || 0,
        isMain: req.body.isMain || false,
      };

      const address = await this.addressService.createAddress(addressData);

      res.status(201).json({
        status: 201,
        message: "Address created successfully",
        data: address,
      });
    } catch (error) {
      appErrorHandler(error, next);
    }
  }

  // Get user addresses
  async getUserAddresses(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const addresses = await this.addressService.getUserAddresses(
        parseInt(userId.toString())
      );

      res.status(200).json({
        status: 200,
        message: "Addresses retrieved successfully",
        data: addresses,
      });
    } catch (error) {
      appErrorHandler(error, next);
    }
  }

  // Get address by ID
  async getAddressById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const addressId = parseInt(req.params.addressId);

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const address = await this.addressService.getAddressById(
        addressId,
        parseInt(userId.toString())
      );

      res.status(200).json({
        status: 200,
        message: "Address retrieved successfully",
        data: address,
      });
    } catch (error) {
      appErrorHandler(error, next);
    }
  }

  // Update address
  async updateAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const addressId = parseInt(req.params.addressId);

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const addressData = {
        ...req.body,
        latitude: req.body.latitude ? parseFloat(req.body.latitude) : undefined,
        longitude: req.body.longitude
          ? parseFloat(req.body.longitude)
          : undefined,
      };

      const address = await this.addressService.updateAddress(
        addressId,
        parseInt(userId.toString()),
        addressData
      );

      res.status(200).json({
        status: 200,
        message: "Address updated successfully",
        data: address,
      });
    } catch (error) {
      appErrorHandler(error, next);
    }
  }

  // Delete address
  async deleteAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const addressId = parseInt(req.params.addressId);

      if (!userId) {
        throw new Error("User not authenticated");
      }

      await this.addressService.deleteAddress(
        addressId,
        parseInt(userId.toString())
      );

      res.status(200).json({
        status: 200,
        message: "Address deleted successfully",
      });
    } catch (error) {
      appErrorHandler(error, next);
    }
  }

  // Set as main address
  async setMainAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const addressId = parseInt(req.params.addressId);

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const address = await this.addressService.setMainAddress(
        addressId,
        parseInt(userId.toString())
      );

      res.status(200).json({
        status: 200,
        message: "Address set as main successfully",
        data: address,
      });
    } catch (error) {
      appErrorHandler(error, next);
    }
  }
}
