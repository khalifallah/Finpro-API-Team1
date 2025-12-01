import { compare, hash } from "bcrypt";
import { IPasswordService } from "../types/user.types";
import { generateJWT, verifyJWT } from "../libs/jwt";
import prisma from "../libs/prisma";
import AppError from "../errors/app.error";

export class PasswordService implements IPasswordService {
  async comparePasswords(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return compare(plainPassword, hashedPassword);
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return hash(password, saltRounds);
  }

  async generateResetToken(userId: number): Promise<string> {
    // Check if user exists and has password (not social login)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      throw new AppError(
        "Password reset not available for social login users",
        400
      );
    }

    // Invalidate any existing reset tokens
    await prisma.user.update({
      where: { id: userId },
      data: {
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    });

    const resetToken = generateJWT({
      userId,
      type: "password_reset",
      timestamp: Date.now(), // Ensure uniqueness
    });

    // Store in database with 1-hour expiration
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: userId },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpiresAt: expiresAt,
      },
    });

    return resetToken;
  }

  async verifyResetToken(
    token: string
  ): Promise<{ userId: number; email: string }> {
    // First verify JWT
    const decoded = verifyJWT(token) as unknown as {
      userId: number;
      type: string;
      timestamp?: number;
    };

    if (!decoded || decoded.type !== "password_reset") {
      throw new AppError("Invalid token type", 400);
    }

    // Verify token exists in database and isn't expired
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        resetPasswordToken: token,
        resetPasswordExpiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    // Check if user has password (not social login)
    if (!user.passwordHash) {
      throw new AppError(
        "Password reset not available for social login users",
        400
      );
    }

    return { userId: user.id, email: user.email };
  }

  // Invalidate reset token after successful password reset
  async invalidateResetToken(userId: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    });
  }

  // Check if user can request password reset (rate limiting)
  async canRequestReset(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { resetPasswordExpiresAt: true },
    });

    if (!user || !user.resetPasswordExpiresAt) {
      return true;
    }

    // Allow new request only if previous token is expired
    return user.resetPasswordExpiresAt < new Date();
  }
}
