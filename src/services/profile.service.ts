import {
  IUpdateProfileParam,
  IUserProfileResponse,
  IEmailUpdateRequest,
} from "../types/user.types";
import prisma from "../libs/prisma";
import { hashPassword, comparePassword } from "../libs/bcrypt";
import { generateJWT } from "../libs/jwt";
import AppError from "../errors/app.error";
import { processImage } from "../utils/file.util";
import { EmailService } from "./email.service";

const emailService = new EmailService();

export class ProfileService {
  // Get complete user profile with additional data
  async getUserProfile(userId: number): Promise<IUserProfileResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          referralCode: {
            select: { code: true },
          },
          cart: {
            include: {
              cartItems: {
                select: { id: true },
              },
            },
          },
          orders: {
            select: { id: true },
          },
        },
      });
      if (!user) {
        throw new AppError("User not found", 404);
      }
      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        photoUrl: user.photoUrl || undefined,
        storeId: user.storeId || undefined,
        emailVerifiedAt: user.emailVerifiedAt || undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        referralCode: user.referralCode?.code,
        cartItemCount: user.cart?.cartItems.length || 0,
        orderCount: user.orders.length,
      };
    } catch (error) {
      console.error("Get user profile error:", error);
      throw new AppError("Failed to retrieve user profile", 500);
    }
  }

  // Update user profile with comprehensive validation
  async updateUserProfile(
    userId: number,
    updateData: IUpdateProfileParam,
    file?: Express.Multer.File
  ): Promise<IUserProfileResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError("User not found", 404);
      }
      return await prisma.$transaction(async (tx) => {
        const updatePayload: any = {};
        // Handle profile photo upload
        if (file) {
          try {
            const imageUrl = await processImage(file);
            updatePayload.photoUrl = imageUrl;
          } catch (error) {
            throw new AppError("Failed to process profile photo", 400);
          }
        }
        // Handle full name update
        if (updateData.fullName && updateData.fullName !== user.fullName) {
          if (
            updateData.fullName.length < 2 ||
            updateData.fullName.length > 100
          ) {
            throw new AppError(
              "Full name must be between 2 and 100 characters",
              400
            );
          }
          updatePayload.fullName = updateData.fullName;
        }
        // Handle email update with re-verification
        if (updateData.email && updateData.email !== user.email) {
          await this.handleEmailUpdate(userId, updateData.email, tx);
          updatePayload.email = updateData.email;
          updatePayload.emailVerifiedAt = null;
        }
        // Handle password change
        if (updateData.newPassword) {
          await this.handlePasswordChange(
            userId,
            updateData.currentPassword!,
            updateData.newPassword,
            tx
          );
          // Note: Password is updated in a separate operation below
        }

        // Update basic profile info
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: updatePayload,
          include: {
            referralCode: {
              select: { code: true },
            },
            cart: {
              include: {
                cartItems: {
                  select: { id: true },
                },
              },
            },
            orders: {
              select: { id: true },
            },
          },
        });

        // Update password separately if needed
        if (updateData.newPassword) {
          const hashedPassword = await hashPassword(updateData.newPassword);
          await tx.user.update({
            where: { id: userId },
            data: { passwordHash: hashedPassword },
          });
        }

        // Send verification email if email was changed
        if (updateData.email && updateData.email !== user.email) {
          const verificationToken = generateJWT({
            userId: updatedUser.id,
            email: updatedUser.email,
            type: "email_verification",
          });

          await emailService.sendVerificationEmail(
            updatedUser.email,
            verificationToken
          );
        }

        return {
          id: updatedUser.id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          role: updatedUser.role,
          photoUrl: updatedUser.photoUrl || undefined,
          storeId: updatedUser.storeId || undefined,
          emailVerifiedAt: updatedUser.emailVerifiedAt || undefined,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
          referralCode: updatedUser.referralCode?.code,
          cartItemCount: updatedUser.cart?.cartItems.length || 0,
          orderCount: updatedUser.orders.length,
        };
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Update profile error:", error);
      throw new AppError("Failed to update profile", 500);
    }
  }

  // Update email with password confirmation
  async updateEmail(
    userId: number,
    data: IEmailUpdateRequest
  ): Promise<IUserProfileResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          referralCode: {
            select: { code: true },
          },
        },
      });

      if (!user) {
        throw new AppError("User not found", 404);
      }

      if (!user.passwordHash) {
        throw new AppError(
          "Password authentication required for email change",
          400
        );
      }

      // Verify current password
      const isPasswordValid = await comparePassword(
        data.currentPassword,
        user.passwordHash
      );
      if (!isPasswordValid) {
        throw new AppError("Current password is incorrect", 400);
      }

      // Check if new email is already taken
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailExists) {
        throw new AppError("Email is already taken", 400);
      }

      return await prisma.$transaction(async (tx) => {
        // Update email and require re-verification
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            email: data.email,
            emailVerifiedAt: null,
          },
          include: {
            referralCode: {
              select: { code: true },
            },
            cart: {
              include: {
                cartItems: {
                  select: { id: true },
                },
              },
            },
            orders: {
              select: { id: true },
            },
          },
        });
        // Send verification email for new email
        const verificationToken = generateJWT({
          userId: updatedUser.id,
          email: updatedUser.email,
          type: "email_verification",
        });
        await emailService.sendVerificationEmail(
          updatedUser.email,
          verificationToken
        );
        return {
          id: updatedUser.id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          role: updatedUser.role,
          photoUrl: updatedUser.photoUrl || undefined,
          storeId: updatedUser.storeId || undefined,
          emailVerifiedAt: updatedUser.emailVerifiedAt || undefined,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
          referralCode: updatedUser.referralCode?.code,
          cartItemCount: updatedUser.cart?.cartItems.length || 0,
          orderCount: updatedUser.orders.length,
        };
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Update email error:", error);
      throw new AppError("Failed to update email", 500);
    }
  }

  // Request email verification - FIXED VERSION
  async requestEmailVerification(userId: number): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          socialAccounts: true,
        },
      });

      if (!user) {
        throw new AppError("User not found", 404);
      }

      // Check if user is a Google user
      const isGoogleUser = user.socialAccounts.some(
        (account) => account.provider === "google"
      );

      if (isGoogleUser) {
        // For Google users, their email is already verified by Google
        // Just update the emailVerifiedAt if not already set
        if (!user.emailVerifiedAt) {
          await prisma.user.update({
            where: { id: userId },
            data: { emailVerifiedAt: new Date() },
          });
        }
        // Don't send verification email for Google users
        return;
      }

      if (user.emailVerifiedAt) {
        throw new AppError("Email is already verified", 400);
      }

      const verificationToken = generateJWT({
        userId: user.id,
        email: user.email,
        type: "email_verification",
      });

      console.log("Sending verification email to:", user.email);

      await emailService.sendVerificationEmail(user.email, verificationToken);
      console.log("Verification email sent successfully");
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Request email verification error:", error);
      throw new AppError("Failed to send verification email", 500);
    }
  }

  // Private helper methods
  private async handleEmailUpdate(
    userId: number,
    newEmail: string,
    tx: any
  ): Promise<void> {
    const emailExists = await tx.user.findUnique({
      where: { email: newEmail },
    });
    if (emailExists) {
      throw new AppError("Email is already taken", 400);
    }
  }

  private async handlePasswordChange(
    userId: number,
    currentPassword: string,
    newPassword: string,
    tx: any
  ): Promise<void> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user.passwordHash) {
      throw new AppError("Password change not available for social login", 400);
    }
    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      user.passwordHash
    );
    if (!isCurrentPasswordValid) {
      throw new AppError("Current password is incorrect", 400);
    }
    if (newPassword.length < 8) {
      throw new AppError("Password must be at least 8 characters long", 400);
    }
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new AppError(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        400
      );
    }
  }
}
