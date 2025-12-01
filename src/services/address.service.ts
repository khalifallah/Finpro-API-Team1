import prisma from "../libs/prisma";
import AppError from "../errors/app.error";

export interface ICreateAddressParam {
  userId: number;
  label?: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  recipientName: string;
  recipientPhone?: string;
  isMain?: boolean;
}

export interface IUpdateAddressParam {
  label?: string;
  fullAddress?: string;
  latitude?: number;
  longitude?: number;
  recipientName?: string;
  recipientPhone?: string;
  isMain?: boolean;
}

export class AddressService {
  // Create new address
  async createAddress(data: ICreateAddressParam): Promise<any> {
    try {
      return await prisma.$transaction(async (tx) => {
        // If setting as main address, unset other main addresses
        if (data.isMain) {
          await tx.userAddress.updateMany({
            where: {
              userId: data.userId,
              isMain: true,
              deletedAt: null,
            },
            data: {
              isMain: false,
            },
          });
        }

        // Create new address
        const address = await tx.userAddress.create({
          data: {
            userId: data.userId,
            label: data.label,
            fullAddress: data.fullAddress,
            latitude: data.latitude,
            longitude: data.longitude,
            recipientName: data.recipientName,
            recipientPhone: data.recipientPhone,
            isMain: data.isMain || false,
          },
        });

        return address;
      });
    } catch (error) {
      console.error("Create address error:", error);
      throw new AppError("Failed to create address", 500);
    }
  }

  // Get user addresses
  async getUserAddresses(userId: number): Promise<any[]> {
    try {
      const addresses = await prisma.userAddress.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        orderBy: [{ isMain: "desc" }, { createdAt: "desc" }],
      });

      return addresses;
    } catch (error) {
      console.error("Get user addresses error:", error);
      throw new AppError("Failed to retrieve addresses", 500);
    }
  }

  // Get address by ID
  async getAddressById(addressId: number, userId: number): Promise<any> {
    try {
      const address = await prisma.userAddress.findFirst({
        where: {
          id: addressId,
          userId,
          deletedAt: null,
        },
      });

      if (!address) {
        throw new AppError("Address not found", 404);
      }

      return address;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Get address by ID error:", error);
      throw new AppError("Failed to retrieve address", 500);
    }
  }

  // Update address
  async updateAddress(
    addressId: number,
    userId: number,
    data: IUpdateAddressParam
  ): Promise<any> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Check if address exists and belongs to user
        const existingAddress = await tx.userAddress.findFirst({
          where: {
            id: addressId,
            userId,
            deletedAt: null,
          },
        });

        if (!existingAddress) {
          throw new AppError("Address not found", 404);
        }

        // If setting as main address, unset other main addresses
        if (data.isMain) {
          await tx.userAddress.updateMany({
            where: {
              userId,
              isMain: true,
              deletedAt: null,
              id: { not: addressId },
            },
            data: {
              isMain: false,
            },
          });
        }

        // Update address
        const updatedAddress = await tx.userAddress.update({
          where: { id: addressId },
          data: {
            ...data,
            updatedAt: new Date(),
          },
        });

        return updatedAddress;
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Update address error:", error);
      throw new AppError("Failed to update address", 500);
    }
  }

  // Delete address
  async deleteAddress(addressId: number, userId: number): Promise<void> {
    try {
      const address = await prisma.userAddress.findFirst({
        where: {
          id: addressId,
          userId,
          deletedAt: null,
        },
      });

      if (!address) {
        throw new AppError("Address not found", 404);
      }

      // Soft delete the address
      await prisma.userAddress.update({
        where: { id: addressId },
        data: {
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Delete address error:", error);
      throw new AppError("Failed to delete address", 500);
    }
  }

  // Set address as main
  async setMainAddress(addressId: number, userId: number): Promise<any> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Check if address exists and belongs to user
        const address = await tx.userAddress.findFirst({
          where: {
            id: addressId,
            userId,
            deletedAt: null,
          },
        });

        if (!address) {
          throw new AppError("Address not found", 404);
        }

        // Unset all other main addresses
        await tx.userAddress.updateMany({
          where: {
            userId,
            isMain: true,
            deletedAt: null,
          },
          data: {
            isMain: false,
          },
        });

        // Set this address as main
        const updatedAddress = await tx.userAddress.update({
          where: { id: addressId },
          data: {
            isMain: true,
            updatedAt: new Date(),
          },
        });

        return updatedAddress;
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Set main address error:", error);
      throw new AppError("Failed to set main address", 500);
    }
  }
}
