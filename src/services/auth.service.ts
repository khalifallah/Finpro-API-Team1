import {
  IRegisterParam,
  ILoginParam,
  IAuthService,
  ISetPasswordParam,
} from "../types/user.types";
import prisma from "../libs/prisma";
import { hashPassword, comparePassword } from "../libs/bcrypt";
import { generateJWT, verifyJWT } from "../libs/jwt";
import { PasswordService } from "./password.service";
import { EmailService } from "./email.service";
import { UserRole } from "../generated/prisma-client";
import AppError from "../errors/app.error";
import { processImage } from "../utils/file.util";

const passwordService = new PasswordService();
const emailService = new EmailService();

async function FindUserByEmail(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        passwordHash: true,
        role: true,
        photoUrl: true,
        emailVerifiedAt: true,
        storeId: true,
        referralCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  } catch (err) {
    throw err;
  }
}

async function RegisterService(param: IRegisterParam) {
  try {
    const isExist = await FindUserByEmail(param.email);
    if (isExist) throw new AppError("Email is already registered", 400);

    return await prisma.$transaction(async (tx) => {
      let referringUserId: number | null = null;

      // Check referral code if provided
      if (param.referredBy) {
        const referringUser = await tx.user.findFirst({
          where: {
            referralCode: {
              code: param.referredBy,
            },
          },
        });

        if (!referringUser) throw new AppError("Invalid referral code", 400);
        if (referringUser.role !== UserRole.USER) {
          throw new AppError("Only regular users can give referrals", 400);
        }
        referringUserId = referringUser.id;
      }

      // Create user WITHOUT password initially
      const user = await tx.user.create({
        data: {
          fullName: param.fullName,
          email: param.email,
          passwordHash: null, // Set to null initially
          role: param.role || UserRole.USER,
          emailVerifiedAt: null,
          referralCode: {
            create: {
              code: `GROC-${Date.now().toString(36).toUpperCase()}`,
            },
          },
        },
      });

      // Create cart for user
      await tx.cart.create({
        data: {
          userId: user.id,
        },
      });

      // Process referral rewards if applicable
      if (referringUserId) {
        await processReferralRewards(tx, user.id, referringUserId, user.email);
      }

      // Generate verification token that includes password setup flag
      const verificationToken = generateJWT({
        userId: user.id,
        email: user.email,
        type: "email_verification_with_password",
        needsPassword: true, // Flag to indicate password needs to be set
      });

      // Send verification email with password setup instructions
      await emailService.sendVerificationEmail(param.email, verificationToken);

      return user;
    });
  } catch (error) {
    console.error("Registration error:", error);
    throw new AppError(
      `Registration failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      400
    );
  }
}

async function ActivateUserService(token: string) {
  try {
    const decoded = verifyJWT(token) as unknown as {
      userId: number;
      email: string;
      type: string;
      needsPassword?: boolean;
    };

    if (
      !decoded ||
      typeof decoded !== "object" ||
      typeof decoded.userId !== "number" ||
      typeof decoded.email !== "string" ||
      typeof decoded.type !== "string"
    ) {
      throw new AppError("Invalid activation token", 400);
    }

    if (
      decoded.type !== "email_verification" &&
      decoded.type !== "email_verification_with_password"
    ) {
      throw new AppError("Invalid activation token", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.emailVerifiedAt) {
      return {
        success: true,
        message: "Account was already verified",
        user,
        needsPassword: !user.passwordHash, // Check if password still needs to be set
      };
    }

    // If this is a password setup token, don't activate yet - wait for password
    if (decoded.needsPassword && !user.passwordHash) {
      return {
        success: true,
        message: "Please set your password to complete activation",
        user: { ...user, emailVerifiedAt: null },
        needsPassword: true,
      };
    }

    // Regular activation (for social login or if password already set)
    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: { emailVerifiedAt: new Date() },
    });

    return {
      success: true,
      message: "Account successfully activated",
      user: updatedUser,
      needsPassword: false,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("jwt expired")) {
      throw new AppError("Activation link has expired", 400);
    }
    if (err instanceof Error && err.message.includes("jwt")) {
      throw new AppError("Invalid activation token", 400);
    }
    throw err;
  }
}

// NEW: Service to set password during activation
async function SetPasswordService(param: ISetPasswordParam) {
  try {
    const decoded = verifyJWT(param.token) as unknown as {
      userId: number;
      email: string;
      type: string;
      needsPassword?: boolean;
    };

    if (
      !decoded ||
      typeof decoded !== "object" ||
      typeof decoded.userId !== "number" ||
      typeof decoded.email !== "string" ||
      decoded.type !== "email_verification_with_password"
    ) {
      throw new AppError("Invalid token for password setup", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Validate password
    if (param.password.length < 8) {
      throw new AppError("Password must be at least 8 characters long", 400);
    }

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!passwordRegex.test(param.password)) {
      throw new AppError(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        400
      );
    }

    // Hash and set password, and activate account
    const hashedPassword = await hashPassword(param.password);

    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        passwordHash: hashedPassword,
        emailVerifiedAt: new Date(), // Activate the account
      },
    });

    return {
      success: true,
      message: "Password set successfully and account activated",
      user: updatedUser,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("jwt expired")) {
      throw new AppError("Password setup link has expired", 400);
    }
    if (err instanceof Error && err.message.includes("jwt")) {
      throw new AppError("Invalid token", 400);
    }
    throw err;
  }
}

async function LoginService(param: ILoginParam) {
  try {
    const user = await FindUserByEmail(param.email);

    if (!user) throw new AppError("Email is not registered", 404);

    // Check if user has set a password
    if (!user.passwordHash) {
      throw new AppError(
        "Please set your password first. Check your email for activation link.",
        403
      );
    }

    if (!user.emailVerifiedAt) {
      throw new AppError("Please verify your email before logging in", 403);
    }

    const checkPass = await comparePassword(param.password, user.passwordHash);
    if (!checkPass) throw new AppError("Incorrect password", 400);

    const payload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      photoUrl: user.photoUrl,
      storeId: user.storeId,
    };

    const token = generateJWT(payload);

    return { user: payload, token };
  } catch (err) {
    throw err;
  }
}

async function UpdateUserService(
  file: Express.Multer.File | undefined,
  email: string,
  updateData: { fullName?: string; email?: string }
) {
  try {
    const checkUser = await FindUserByEmail(email);
    if (!checkUser) throw new AppError("User not found", 404);

    const updatePayload: any = {};

    if (file) {
      const imageUrl = await processImage(file);
      updatePayload.photoUrl = imageUrl;
    }

    if (updateData.fullName) {
      updatePayload.fullName = updateData.fullName;
    }

    if (updateData.email && updateData.email !== email) {
      // Check if new email is already taken
      const emailExists = await FindUserByEmail(updateData.email);
      if (emailExists) throw new AppError("Email is already taken", 400);

      updatePayload.email = updateData.email;
      updatePayload.emailVerifiedAt = null; // Require re-verification
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: updatePayload,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        photoUrl: true,
        storeId: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  } catch (err) {
    throw err;
  }
}

async function verifyResetTokenService(token: string) {
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

async function resetPasswordLoggedInService(
  userId: number,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
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

  const hashedPassword = await passwordService.hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashedPassword },
  });
}

// Helper function for referral rewards
async function processReferralRewards(
  tx: any,
  newUserId: number,
  referringUserId: number,
  newUserEmail: string
) {
  try {
    // Create welcome voucher for new user
    const voucher = await tx.voucher.create({
      data: {
        code: `WELCOME-${Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase()}`,
        description: "Welcome discount coupon",
        type: "PERCENTAGE",
        value: 10,
        target: "TRANSACTION",
        minPurchaseAmount: 50000,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Assign voucher to new user
    await tx.userVoucher.create({
      data: {
        userId: newUserId,
        voucherId: voucher.id,
      },
    });

    // Create referral bonus voucher for referring user
    const referralVoucher = await tx.voucher.create({
      data: {
        code: `REFER-${Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase()}`,
        description: "Referral bonus coupon",
        type: "PERCENTAGE",
        value: 15,
        target: "TRANSACTION",
        minPurchaseAmount: 100000,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Assign voucher to referring user
    await tx.userVoucher.create({
      data: {
        userId: referringUserId,
        voucherId: referralVoucher.id,
      },
    });

    // Send notification email would go here
    console.log(
      `Referral rewards processed for new user ${newUserId} referred by ${referringUserId}`
    );
  } catch (error) {
    console.error("Referral reward processing failed:", error);
    throw error;
  }
}

export class UserPasswordService implements IAuthService {
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new AppError("User not found", 404);
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

    const hashedPassword = await passwordService.hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      // Don't reveal whether user exists for security
      return;
    }

    const resetToken = await passwordService.generateResetToken(user.id);
    await emailService.sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const { userId } = await passwordService.verifyResetToken(token);

    const hashedPassword = await passwordService.hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });
  }
}

export {
  FindUserByEmail,
  RegisterService,
  ActivateUserService,
  SetPasswordService,
  LoginService,
  UpdateUserService,
  verifyResetTokenService,
  resetPasswordLoggedInService,
};
