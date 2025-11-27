import { Request, Response, NextFunction } from "express";
import {
  FindUserByEmail,
  RegisterService,
  LoginService,
  UserPasswordService,
  ActivateUserService,
  SetPasswordService,
  verifyResetTokenService,
  resetPasswordLoggedInService,
} from "../services/auth.service";
import AppError from "../errors/app.error";
import { responseBuilder } from "../utils/response.builder";

const authService = new UserPasswordService();

export async function RegisterController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await RegisterService(req.body);

    res.status(201).json(
      responseBuilder(
        201,
        "Registration successful. Please check your email to verify and set your password.",
        {
          user: {
            id: data.id,
            email: data.email,
            fullName: data.fullName,
            role: data.role,
          },
        }
      )
    );
  } catch (err) {
    next(err);
  }
}

export async function ActivationController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await ActivateUserService(req.params.token);

    res.status(200).json(
      responseBuilder(200, result.message, {
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
          emailVerifiedAt: result.user.emailVerifiedAt,
        },
        needsPassword: result.needsPassword, // Include this flag
      })
    );
  } catch (err) {
    next(err);
  }
}

export async function SetPasswordController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await SetPasswordService(req.body);

    res.status(200).json(
      responseBuilder(200, result.message, {
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
          emailVerifiedAt: result.user.emailVerifiedAt,
        },
      })
    );
  } catch (err) {
    next(err);
  }
}

export async function LoginController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await LoginService(req.body);

    res.status(200).json(
      responseBuilder(200, "Login successful", {
        user: data.user,
        token: data.token,
      })
    );
  } catch (err) {
    next(err);
  }
}

export async function getCurrentUserController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("User is not authenticated", 401);
    }

    const user = await FindUserByEmail(req.user.email);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.status(200).json(
      responseBuilder(200, "User data retrieved successfully", {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          photoUrl: user.photoUrl,
          storeId: user.storeId,
          emailVerifiedAt: user.emailVerifiedAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      })
    );
  } catch (err) {
    next(err);
  }
}

export const AuthPasswordController = {
  async changePassword(
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
  },

  async requestPasswordReset(req: Request, res: Response, next: NextFunction) {
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
  },

  async resetPassword(
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
  },
};

export async function VerifyResetTokenController(
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

    res.status(200).json(responseBuilder(200, "Token is valid", result));
  } catch (err) {
    next(err);
  }
}

export async function ResetPasswordLoggedInController(
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

export async function ResendVerificationController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;
    const user = await FindUserByEmail(email);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.emailVerifiedAt) {
      throw new AppError("Email is already verified", 400);
    }

    // Generate new verification token
    const { generateJWT } = require("../libs/jwt");
    const EmailService = require("./email.service").EmailService;
    const emailService = new EmailService();

    const verificationToken = generateJWT({
      userId: user.id,
      email: user.email,
      type: "email_verification_with_password",
      needsPassword: !user.passwordHash,
    });

    await emailService.sendVerificationEmail(user.email, verificationToken);

    res
      .status(200)
      .json(responseBuilder(200, "Verification email sent successfully", {}));
  } catch (err) {
    next(err);
  }
}
