import prisma from "../libs/prisma";
import AppError from "../errors/app.error";

export interface CreateStoreRequest {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface UpdateStoreRequest {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface StoreResponse {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  users: Array<{
    id: number;
    fullName: string;
    email: string;
    role: string;
  }>;
  productCount: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export class StoreService {
  // Get all stores with pagination and filtering
  async getStores(query: PaginationQuery): Promise<{
    stores: StoreResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get stores with related data
    const stores = await prisma.store.findMany({
      where,
      include: {
        users: {
          where: { deletedAt: null },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        productStocks: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    // Get total count
    const total = await prisma.store.count({ where });

    // Transform response
    const transformedStores: StoreResponse[] = stores.map((store) => ({
      id: store.id,
      name: store.name,
      address: store.address || "",
      latitude: Number(store.latitude),
      longitude: Number(store.longitude),
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      deletedAt: store.deletedAt,
      users: store.users,
      productCount: store.productStocks.length,
    }));

    return {
      stores: transformedStores,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get store by ID
  async getStoreById(id: number): Promise<StoreResponse | null> {
    const store = await prisma.store.findUnique({
      where: { id, deletedAt: null },
      include: {
        users: {
          where: { deletedAt: null },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        productStocks: {
          where: { deletedAt: null },
          select: { id: true },
        },
        shippingConfigs: {
          where: { deletedAt: null },
          select: {
            id: true,
            serviceName: true,
            serviceCode: true,
            cost: true,
            estimatedDays: true,
            isActive: true,
          },
        },
      },
    });

    if (!store) {
      return null;
    }

    return {
      id: store.id,
      name: store.name,
      address: store.address || "",
      latitude: Number(store.latitude),
      longitude: Number(store.longitude),
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      deletedAt: store.deletedAt,
      users: store.users,
      productCount: store.productStocks.length,
    };
  }

  // Create new store
  async createStore(data: CreateStoreRequest): Promise<StoreResponse> {
    // Check if store with similar name already exists
    const existingStore = await prisma.store.findFirst({
      where: {
        name: data.name,
        deletedAt: null,
      },
    });

    if (existingStore) {
      throw new AppError("Store with this name already exists", 400);
    }

    const store = await prisma.store.create({
      data: {
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
      },
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        productStocks: {
          select: { id: true },
        },
      },
    });

    return {
      id: store.id,
      name: store.name,
      address: store.address || "",
      latitude: Number(store.latitude),
      longitude: Number(store.longitude),
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      deletedAt: store.deletedAt,
      users: store.users,
      productCount: store.productStocks.length,
    };
  }

  // Update store
  async updateStore(
    id: number,
    data: UpdateStoreRequest
  ): Promise<StoreResponse> {
    // Check if store exists and is not deleted
    const existingStore = await prisma.store.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingStore) {
      throw new AppError("Store not found", 404);
    }

    // Check if name is being changed and conflicts with another store
    if (data.name && data.name !== existingStore.name) {
      const duplicateStore = await prisma.store.findFirst({
        where: {
          name: data.name,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (duplicateStore) {
        throw new AppError("Store with this name already exists", 400);
      }
    }

    const updatedStore = await prisma.store.update({
      where: { id },
      data,
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        productStocks: {
          select: { id: true },
        },
      },
    });

    return {
      id: updatedStore.id,
      name: updatedStore.name,
      address: updatedStore.address || "",
      latitude: Number(updatedStore.latitude),
      longitude: Number(updatedStore.longitude),
      createdAt: updatedStore.createdAt,
      updatedAt: updatedStore.updatedAt,
      deletedAt: updatedStore.deletedAt,
      users: updatedStore.users,
      productCount: updatedStore.productStocks.length,
    };
  }

  // Delete store (soft delete)
  async deleteStore(id: number): Promise<void> {
    const store = await prisma.store.findUnique({
      where: { id, deletedAt: null },
    });

    if (!store) {
      throw new AppError("Store not found", 404);
    }

    // Check if store has active admins
    const storeAdmins = await prisma.user.findMany({
      where: {
        storeId: id,
        role: "STORE_ADMIN",
        deletedAt: null,
      },
    });

    if (storeAdmins.length > 0) {
      throw new AppError(
        "Cannot delete store that has active store admins. Please reassign or remove store admins first.",
        400
      );
    }

    // Soft delete the store
    await prisma.store.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Assign store admin to store
  async assignStoreAdmin(userId: number, storeId: number): Promise<any> {
    // Check if user exists and is a store admin
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.role !== "STORE_ADMIN") {
      throw new AppError(
        "User must be a STORE_ADMIN to be assigned to a store",
        400
      );
    }

    // Check if store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId, deletedAt: null },
    });

    if (!store) {
      throw new AppError("Store not found", 404);
    }

    // Update user with storeId
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { storeId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        storeId: true,
        store: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    return updatedUser;
  }

  // Remove store admin from store
  async removeStoreAdmin(userId: number): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.role !== "STORE_ADMIN") {
      throw new AppError("User is not a store admin", 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { storeId: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        storeId: true,
      },
    });

    return updatedUser;
  }

  // Get available store admins (not assigned to any store)
  async getAvailableStoreAdmins(): Promise<any[]> {
    const storeAdmins = await prisma.user.findMany({
      where: {
        role: "STORE_ADMIN",
        storeId: null,
        deletedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return storeAdmins;
  }

  // Get store admins by store ID
  async getStoreAdminsByStoreId(storeId: number): Promise<any[]> {
    const storeAdmins = await prisma.user.findMany({
      where: {
        storeId,
        role: "STORE_ADMIN",
        deletedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
        emailVerifiedAt: true,
      },
    });

    return storeAdmins;
  }

  // Get deleted stores
  async getDeletedStores(query: PaginationQuery): Promise<{
    stores: StoreResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: { not: null },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    const stores = await prisma.store.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        productStocks: {
          select: { id: true },
        },
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const total = await prisma.store.count({ where });

    const transformedStores: StoreResponse[] = stores.map((store) => ({
      id: store.id,
      name: store.name,
      address: store.address || "",
      latitude: Number(store.latitude),
      longitude: Number(store.longitude),
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      deletedAt: store.deletedAt,
      users: store.users,
      productCount: store.productStocks.length,
    }));

    return {
      stores: transformedStores,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Restore deleted store
  async restoreStore(id: number): Promise<StoreResponse> {
    const store = await prisma.store.findUnique({
      where: { id },
    });

    if (!store) {
      throw new AppError("Store not found", 404);
    }

    if (!store.deletedAt) {
      throw new AppError("Store is not deleted", 400);
    }

    const restoredStore = await prisma.store.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        productStocks: {
          select: { id: true },
        },
      },
    });

    return {
      id: restoredStore.id,
      name: restoredStore.name,
      address: restoredStore.address || "",
      latitude: Number(restoredStore.latitude),
      longitude: Number(restoredStore.longitude),
      createdAt: restoredStore.createdAt,
      updatedAt: restoredStore.updatedAt,
      deletedAt: restoredStore.deletedAt,
      users: restoredStore.users,
      productCount: restoredStore.productStocks.length,
    };
  }
}
