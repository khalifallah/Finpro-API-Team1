import { IAuthService } from "../../types/user.types";
import prisma from "../../libs/prisma";
import { hashPassword } from "../../libs/bcrypt";
import { PasswordService } from "../password.service";
import { EmailService } from "../email.service";
import { OAuthService } from "./oauth.service";
import AppError from "../../errors/app.error";
import { AuthRegistrationService } from "./auth-registration.service";
import { AuthLoginService } from "./auth-login.service";

const passwordService = new PasswordService();
const emailService = new EmailService();
const oauthService = new OAuthService();
const authRegistrationService = new AuthRegistrationService();
const authLoginService = new AuthLoginService();

// Re-export services for backward compatibility
export {
  authLoginService as FindUserByEmail,
  authRegistrationService as RegisterService,
  authRegistrationService as ActivateUserService,
  authRegistrationService as SetPasswordService,
  authLoginService as LoginService,
  authLoginService as GoogleAuthService,
  authLoginService as UpdateUserService,
  authRegistrationService as ResendVerificationService,
  oauthService,
};

// Password-related functions
export async function verifyResetTokenService(token: string) {
  try {
    if (!token) {
      throw new AppError("Token is required", 400);
    }
    const result = await passwordService.verifyResetToken(token);
    return { valid: true, userId: result.userId };
  } catch (err) {
    if (err instanceof Error && err.message.includes("expired")) {
      throw new AppError("Token has expired", 400);
    }
    if (err instanceof Error && err.message.includes("Invalid")) {
      throw new AppError("Invalid token", 400);
    }
    throw err;
  }
}

export async function resetPasswordLoggedInService(
  userId: number,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  validatePasswordStrength(newPassword);
  const hashedPassword = await passwordService.hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashedPassword },
  });
}

export async function setPasswordForSocialUser(
  userId: number,
  password: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      socialAccounts: true,
    },
  });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  if (user.passwordHash) {
    throw new AppError("Password already set for this account", 400);
  }
  validatePasswordStrength(password);
  const hashedPassword = await hashPassword(password);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashedPassword },
  });
}

export class UserPasswordService implements IAuthService {
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        passwordHash: true,
        socialAccounts: true,
      },
    });
    if (!user) {
      throw new AppError("User not found", 404);
    }
    const isGoogleUser = user.socialAccounts.some(
      (account) => account.provider === "google"
    );
    if (isGoogleUser && !user.passwordHash) {
      throw new AppError(
        "Google users cannot change password. Please set a password first.",
        400
      );
    }
    if (!user.passwordHash) {
      throw new AppError(
        "Password change not allowed for social login users",
        400
      );
    }
    const isMatch = await passwordService.comparePasswords(
      currentPassword,
      user.passwordHash
    );
    if (!isMatch) {
      throw new AppError("Current password is incorrect", 400);
    }
    validatePasswordStrength(newPassword);
    const hashedPassword = await passwordService.hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        resetPasswordExpiresAt: true,
        socialAccounts: true,
      },
    });
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return;
    }
    const isGoogleUser = user.socialAccounts.some(
      (account) => account.provider === "google"
    );

    if (isGoogleUser && !user.passwordHash) {
      console.log(`Password reset requested for Google user: ${email}`);
      return;
    }
    if (!user.passwordHash) {
      console.log(`Password reset requested for social login user: ${email}`);
      return;
    }
    if (
      user.resetPasswordExpiresAt &&
      user.resetPasswordExpiresAt > new Date()
    ) {
      const timeLeft = Math.ceil(
        (user.resetPasswordExpiresAt.getTime() - Date.now()) / 60000
      );
      throw new AppError(
        `Please wait ${timeLeft} minutes before requesting another password reset`,
        429
      );
    }
    const resetToken = await passwordService.generateResetToken(user.id);
    await emailService.sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const { userId, email } = await passwordService.verifyResetToken(token);
    validatePasswordStrength(newPassword);
    const hashedPassword = await passwordService.hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          resetPasswordToken: null,
          resetPasswordExpiresAt: null,
        },
      });
    });
    await emailService.sendPasswordResetConfirmation(email);
  }
}

function validatePasswordStrength(password: string): void {
  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters long", 400);
  }
  const passwordRegex =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;
  if (!passwordRegex.test(password)) {
    throw new AppError(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      400
    );
  }
}
