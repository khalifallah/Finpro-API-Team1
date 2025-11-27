import { Request, Response, NextFunction } from "express";
import { ProfileService } from "../services/profile.service";
import AppError from "../errors/app.error";
import { responseBuilder } from "../utils/response.builder";

const profileService = new ProfileService();

export class ProfileController {
  // Get user profile
  static async getProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const profile = await profileService.getUserProfile(req.user.id);

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
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const { fullName, email, currentPassword, newPassword } = req.body;
      const file = req.file;

      const updatedProfile = await profileService.updateUserProfile(
        req.user.id,
        { fullName, email, currentPassword, newPassword },
        file
      );

      let message = "Profile updated successfully";
      if (email && email !== req.user.email) {
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
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const { email, currentPassword } = req.body;

      const updatedProfile = await profileService.updateEmail(req.user.id, {
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
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      await profileService.requestEmailVerification(req.user.id);

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
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const profileService = new ProfileService();
      const updatedProfile = await profileService.updateUserProfile(
        req.user.id,
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
}
