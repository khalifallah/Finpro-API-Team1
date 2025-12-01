import { UserRole } from "../generated/prisma-client";

export interface IRegisterParam {
  fullName: string;
  email: string;
  password?: string;
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
  verifyResetToken(token: string): Promise<{ userId: number; email: string }>;
}

export interface IEmailService {
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
  sendPasswordResetConfirmation(email: string): Promise<void>;
  sendVerificationEmail(email: string, token: string): Promise<void>;
  sendVerificationExpiredEmail(email: string, newToken: string): Promise<void>;
  sendReferralRewardEmail(
    referringUserEmail: string,
    referringUserName: string,
    newUserEmail: string,
    referralVoucherCode: string,
    rewardDescription: string
  ): Promise<void>;
  sendWelcomeDiscountEmail(
    newUserEmail: string,
    newUserName: string,
    welcomeVoucherCode: string,
    rewardDescription: string
  ): Promise<void>;
}

// Add Google OAuth types
export interface IGoogleUser {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

export interface IOAuthService {
  findOrCreateGoogleUser(googleUser: IGoogleUser): Promise<any>;
  unlinkGoogleAccount(userId: number): Promise<void>;
}

export interface IUserStatus {
  isAuthenticated: boolean;
  isVerified: boolean;
  hasPassword: boolean;
  isGoogleUser: boolean;
  permissions: string[];
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

declare global {
  namespace Express {
    interface User {
      id?: number;
      userId?: number;
      email: string;
      type?: string;
      iat?: number;
      exp?: number;
    }
  }
}

export interface ICreateAddressParam {
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

export interface IAddressResponse {
  id: number;
  userId: number;
  label?: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  isMain: boolean;
  recipientName: string;
  recipientPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}
