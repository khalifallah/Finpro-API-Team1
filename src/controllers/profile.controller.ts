import { Request, Response, NextFunction } from "express";
import { ProfileService } from "../services/profile.service";
import AppError from "../errors/app.error";
import { responseBuilder } from "../utils/response.builder";
import prisma from "../libs/prisma";

const profileService = new ProfileService();

// Helper function to get user ID from request
const getUserId = (req: Request): number => {
  if (!req.user) {
    throw new AppError("User not authenticated", 401);
  }

  // Handle different JWT token structures
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

export class ProfileController {
  // Get user profile
  static async getProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);
      const profile = await profileService.getUserProfile(userId);

      res.status(200).json(
        responseBuilder(200, "Profile retrieved successfully", {
          profile,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Update user profile
  static async updateProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);
      const { fullName, email, currentPassword, newPassword } = req.body;
      const file = req.file;

      const updatedProfile = await profileService.updateUserProfile(
        userId,
        { fullName, email, currentPassword, newPassword },
        file
      );

      let message = "Profile updated successfully";
      if (email && email !== req.user?.email) {
        message += ". Please check your email for verification.";
      }

      res.status(200).json(
        responseBuilder(200, message, {
          profile: updatedProfile,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Update email with password confirmation
  static async updateEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);
      const { email, currentPassword } = req.body;

      const updatedProfile = await profileService.updateEmail(userId, {
        email,
        currentPassword,
      });

      res.status(200).json(
        responseBuilder(
          200,
          "Email updated successfully. Please check your email for verification.",
          {
            profile: updatedProfile,
          }
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Request email verification
  static async requestVerification(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);
      await profileService.requestEmailVerification(userId);

      res
        .status(200)
        .json(responseBuilder(200, "Verification email sent successfully", {}));
    } catch (error) {
      next(error);
    }
  }

  // Delete profile photo
  static async deleteProfilePhoto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);
      const profileService = new ProfileService();
      const updatedProfile = await profileService.updateUserProfile(
        userId,
        {},
        undefined
      );

      res.status(200).json(
        responseBuilder(200, "Profile photo removed successfully", {
          profile: updatedProfile,
        })
      );
    } catch (error) {
      next(error);
    }
  }
  static async getUserVouchers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);

      const userVouchers = await prisma.userVoucher.findMany({
        where: {
          userId: userId,
          deletedAt: null,
        },
        include: {
          voucher: {
            select: {
              id: true,
              code: true,
              description: true,
              type: true,
              value: true,
              target: true,
              minPurchaseAmount: true,
              maxDiscountAmount: true,
              expiresAt: true,
              is_active: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.status(200).json(
        responseBuilder(200, "Vouchers retrieved successfully", {
          vouchers: userVouchers,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}
