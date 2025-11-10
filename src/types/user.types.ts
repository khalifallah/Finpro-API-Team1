import { UserRole } from '../generated/prisma-client';

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  storeId?: number | null; // Untuk STORE_ADMIN
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  role?: UserRole;
  storeId?: number | null; // Izinkan null untuk menghapus asosiasi store
}

export interface UserResponse {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  storeId?: number | null;
  createdAt: Date;
}