import { UserRole } from "../generated/prisma-client";

export interface IRegisterParam {
  fullName: string;
  email: string;
  password?: string; // Make password optional
  role?: UserRole;
  referredBy?: string;
}

export interface ISetPasswordParam {
  token: string;
  password: string;
}

export interface ILoginParam {
  email: string;
  password: string;
}

export interface IUpdateUser {
  file?: Express.Multer.File;
  email: string;
  fullName?: string;
}

export interface IAuthService {
  changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
}

export interface IPasswordService {
  comparePasswords(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
  generateResetToken(userId: number): Promise<string>;
  verifyResetToken(token: string): Promise<{ userId: number }>;
}

export interface IEmailService {
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
  sendVerificationEmail(email: string, token: string): Promise<void>;
}

// Add the missing type definitions here:
export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  storeId?: number | null;
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  role?: UserRole;
  storeId?: number | null;
}

export interface UserResponse {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  storeId?: number | null;
  createdAt: Date;
}

export interface IUpdateProfileParam {
  fullName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface IUserProfileResponse {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  photoUrl?: string;
  storeId?: number;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  referralCode?: string;
  cartItemCount?: number;
  orderCount?: number;
}

export interface IEmailUpdateRequest {
  email: string;
  currentPassword: string;
}
