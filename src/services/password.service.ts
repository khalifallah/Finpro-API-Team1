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
    const resetToken = generateJWT({
      userId,
      type: "password_reset",
    });

    // Store in database (optional for additional security)
    await prisma.user.update({
      where: { id: userId },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpiresAt: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    return resetToken;
  }

  async verifyResetToken(token: string): Promise<{ userId: number }> {
    const decoded = verifyJWT(token) as unknown as {
      userId: number;
      type: string;
    };

    if (decoded.type !== "password_reset") {
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
    });

    if (!user) {
      throw new AppError("Invalid or expired token", 400);
    }

    return { userId: decoded.userId };
  }
}
