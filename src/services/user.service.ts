import { PrismaClient } from "../generated/prisma-client";
import { hashPassword } from "../libs/bcrypt";
import {
  CreateUserRequest,
  UpdateUserRequest,
  UserResponse,
} from "../types/user.types";

const prisma = new PrismaClient();

// ✅ COMPLETE: getAllUsers dengan Prisma query
export const getAllUsers = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  role?: string
): Promise<{ users: UserResponse[]; total: number }> => {
  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = { deletedAt: null };

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { fullName: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role) {
    where.role = role;
  }

  // ✅ Execute Prisma query dengan Promise.all()
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        storeId: true,
        emailVerifiedAt: true,
        createdAt: true,
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  console.log("✅ getAllUsers result:", { users: users.length, total });
  return { users, total };
};

export const getStoreAdmins = async (): Promise<UserResponse[]> => {
  const users = await prisma.user.findMany({
    where: {
      role: "STORE_ADMIN",
      deletedAt: null,
    },
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
        },
      },
      emailVerifiedAt: true,
      createdAt: true,
    },
  });
  return users;
};

export const createStoreAdmin = async (
  data: CreateUserRequest & { role?: "STORE_ADMIN" | "SUPER_ADMIN" }
): Promise<UserResponse> => {
  const role = data.role || "STORE_ADMIN";

  // Validasi: STORE_ADMIN harus punya store
  if (role === "STORE_ADMIN" && !data.storeId) {
    throw new Error("Store is required for STORE_ADMIN role");
  }

  const hashedPassword = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      passwordHash: hashedPassword,
      role,
      storeId: data.storeId || null,
      emailVerifiedAt: new Date(),
    },
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
        },
      },
      createdAt: true,
    },
  });
  return user;
};

export const updateUser = async (
  id: number,
  data: UpdateUserRequest & { role?: string; password?: string }
): Promise<UserResponse> => {
  // Validasi: jika role = STORE_ADMIN, harus ada storeId
  if (data.role === "STORE_ADMIN" && !data.storeId) {
    throw new Error("Store is required for STORE_ADMIN role");
  }

  const updateData: any = { ...data };
  if (data.password) {
    updateData.passwordHash = await hashPassword(data.password);
    delete updateData.password;
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
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
        },
      },
      emailVerifiedAt: true,
      createdAt: true,
    },
  });
  return user;
};

export const deleteUser = async (id: number): Promise<void> => {
  // Soft delete
  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};
