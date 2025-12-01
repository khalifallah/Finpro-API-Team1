import { Request, Response, NextFunction } from "express";
import {
  UserPasswordService,
  verifyResetTokenService,
  resetPasswordLoggedInService,
} from "../../services/auth/auth.service";
import AppError from "../../errors/app.error";
import { responseBuilder } from "../../utils/response.builder";

const authService = new UserPasswordService();

export class AuthPasswordController {
  static async changePassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("User is not authenticated", 401);
      }
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );
      res
        .status(200)
        .json(responseBuilder(200, "Password changed successfully", {}));
    } catch (err) {
      next(err);
    }
  }

  static async requestPasswordReset(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { email } = req.body;
      await authService.requestPasswordReset(email);
      res
        .status(200)
        .json(
          responseBuilder(
            200,
            "If an account with that email exists, a password reset link has been sent",
            {}
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);
      res
        .status(200)
        .json(responseBuilder(200, "Password reset successfully", {}));
    } catch (err) {
      next(err);
    }
  }

  static async verifyResetToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { token } = req.body;
      if (!token) {
        throw new AppError("Token is required", 400);
      }
      const result = await verifyResetTokenService(token);
      res.status(200).json(
        responseBuilder(200, "Token is valid", {
          valid: true,
          userId: result.userId,
          message: "Token is valid. You can now reset your password.",
        })
      );
    } catch (err) {
      next(err);
    }
  }

  static async resetPasswordLoggedIn(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }
      const { newPassword } = req.body;
      await resetPasswordLoggedInService(req.user.id, newPassword);
      res
        .status(200)
        .json(
          responseBuilder(
            200,
            "Password reset successfully. Please login again with your new password.",
            {}
          )
        );
    } catch (err) {
      next(err);
    }
  }
}
