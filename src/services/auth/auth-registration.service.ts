import { IRegisterParam, ISetPasswordParam } from "../../types/user.types";
import prisma from "../../libs/prisma";
import { hashPassword, comparePassword } from "../../libs/bcrypt";
import { generateVerificationToken, verifyJWT } from "../../libs/jwt";
import { EmailService } from "../email.service";
import { UserRole } from "@prisma/client";
import AppError from "../../errors/app.error";
import { processReferralRewards } from "./auth-referral.service";

const emailService = new EmailService();

export class AuthRegistrationService {
  async register(param: IRegisterParam): Promise<any> {
    try {
      const isExist = await this.findUserByEmail(param.email);
      if (isExist) throw new AppError("Email is already registered", 400);

      let verificationToken: string | undefined;
      let createdUser: any = null;
      let referringUserEmail: string | null = null;
      let referringUserName: string | null = null;
      let referralRewards: any = null;

      try {
        await prisma.$transaction(async (tx) => {
          const {
            user,
            referringUserEmail: refEmail,
            referringUserName: refName,
            rewards,
          } = await this.createUserTransaction(tx, param);

          createdUser = user;
          referringUserEmail = refEmail;
          referringUserName = refName;
          referralRewards = rewards;

          verificationToken = await this.generateVerificationToken(
            tx,
            createdUser.id,
            createdUser.email
          );
        });

        // Send ALL emails after successful transaction
        await this.sendRegistrationEmails(
          createdUser,
          verificationToken,
          param,
          referringUserEmail,
          referringUserName,
          referralRewards
        );

        return createdUser;
      } catch (transactionError) {
        console.error("Transaction error:", transactionError);
        throw transactionError;
      }
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

  async activateUser(token: string) {
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
        typeof decoded.userId !== "number"
      ) {
        throw new AppError("Invalid activation token", 400);
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new AppError("User not found", 404);
      }

      return await this.handleUserActivation(user, decoded);
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

  async setPassword(param: ISetPasswordParam) {
    try {
      const decoded = verifyJWT(param.token) as unknown as {
        userId: number;
        email: string;
        type: string;
        needsPassword?: boolean;
      };

      if (!decoded || decoded.type !== "email_verification_with_password") {
        throw new AppError("Invalid token for password setup", 400);
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new AppError("User not found", 404);
      }

      this.validatePassword(param.password);
      const hashedPassword = await hashPassword(param.password);

      const updatedUser = await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          passwordHash: hashedPassword,
          emailVerifiedAt: new Date(),
          verificationToken: null,
          verificationExpiresAt: null,
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
      throw err;
    }
  }

  async resendVerification(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.emailVerifiedAt) {
      throw new AppError("Email is already verified", 400);
    }

    const verificationToken = generateVerificationToken({
      userId: user.id,
      email: user.email,
      type: "email_verification_with_password",
      needsPassword: !user.passwordHash,
    });

    const tokenHash = await hashPassword(verificationToken);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: tokenHash,
        verificationExpiresAt: new Date(Date.now() + 3600000),
      },
    });

    const wasExpired =
      user.verificationExpiresAt && user.verificationExpiresAt < new Date();

    if (wasExpired) {
      await emailService.sendVerificationExpiredEmail(
        user.email,
        verificationToken
      );
    } else {
      await emailService.sendVerificationEmail(user.email, verificationToken);
    }
  }

  private async findUserByEmail(email: string) {
    return await prisma.user.findUnique({
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
  }

  private async createUserTransaction(tx: any, param: IRegisterParam) {
    let referringUserId: number | null = null;
    let referringUserEmail: string | null = null;
    let referringUserName: string | null = null;
    let rewards: any = null;

    if (param.referredBy) {
      const referringUser = await tx.user.findFirst({
        where: {
          referralCode: {
            code: param.referredBy,
          },
        },
        include: {
          referralCode: true,
        },
      });

      if (!referringUser) throw new AppError("Invalid referral code", 400);
      if (referringUser.role !== UserRole.USER) {
        throw new AppError("Only regular users can give referrals", 400);
      }
      referringUserId = referringUser.id;
      referringUserEmail = referringUser.email;
      referringUserName = referringUser.fullName;

      console.log(
        `🔗 Referral detected: ${referringUserName} (${referringUserEmail}) referred ${param.email}`
      );
    }

    const user = await tx.user.create({
      data: {
        fullName: param.fullName,
        email: param.email,
        passwordHash: null,
        role: param.role || UserRole.USER,
        emailVerifiedAt: null,
        verificationToken: null,
        verificationExpiresAt: new Date(Date.now() + 3600000),
        referralCode: {
          create: {
            code: `GROC-${Date.now().toString(36).toUpperCase()}`,
          },
        },
      },
      include: {
        referralCode: true,
      },
    });

    await tx.cart.create({
      data: {
        userId: user.id,
      },
    });

    // Process referral rewards if applicable
    if (referringUserId) {
      rewards = await processReferralRewards(
        tx,
        user.id,
        referringUserId,
        user.email
      );

      console.log(`
      🎉 REFERRAL REWARDS SUMMARY:
      • New User: ${user.email}
      • Referring User: ${referringUserEmail}
      • Welcome Voucher: ${rewards.welcomeVoucherCode}
      • Referral Bonus Voucher: ${rewards.referralVoucherCode}
      `);
    }

    return {
      user,
      referringUserEmail,
      referringUserName,
      rewards,
    };
  }

  private async generateVerificationToken(
    tx: any,
    userId: number,
    email: string
  ) {
    const verificationToken = generateVerificationToken({
      userId,
      email,
      type: "email_verification_with_password",
      needsPassword: true,
    });

    const tokenHash = await hashPassword(verificationToken);
    await tx.user.update({
      where: { id: userId },
      data: {
        verificationToken: tokenHash,
        verificationExpiresAt: new Date(Date.now() + 3600000),
      },
    });

    return verificationToken;
  }

  private async sendRegistrationEmails(
    user: any,
    token: string | undefined,
    param: IRegisterParam,
    referringUserEmail: string | null,
    referringUserName: string | null,
    referralRewards: any
  ) {
    // Always send verification email
    if (token) {
      try {
        await emailService.sendVerificationEmail(param.email, token);
        console.log(`✅ Verification email sent to ${param.email}`);
      } catch (emailError) {
        console.error("❌ Verification email sending failed:", emailError);
      }
    }

    // Send welcome discount email if there are referral rewards
    if (referralRewards) {
      try {
        await emailService.sendWelcomeDiscountEmail(
          param.email,
          param.fullName,
          referralRewards.welcomeVoucherCode,
          "10% discount coupon (min. purchase Rp 50,000)"
        );
        console.log(`✅ Welcome discount email sent to ${param.email}`);
      } catch (welcomeError) {
        console.error(
          "❌ Welcome discount email sending failed:",
          welcomeError
        );
      }

      // Send referral reward email to referring user
      if (referringUserEmail && referringUserName) {
        try {
          await emailService.sendReferralRewardEmail(
            referringUserEmail,
            referringUserName,
            param.email,
            referralRewards.referralVoucherCode,
            "15% discount coupon (min. purchase Rp 100,000)"
          );
          console.log(`✅ Referral reward email sent to ${referringUserEmail}`);
        } catch (referralError) {
          console.error(
            "❌ Referral reward email sending failed:",
            referralError
          );
        }
      }
    }
  }

  private async handleUserActivation(user: any, decoded: any) {
    if (user.emailVerifiedAt) {
      return {
        success: true,
        message: "Account was already verified",
        user,
        needsPassword: !user.passwordHash,
        isExpired: false,
      };
    }

    if (user.verificationExpiresAt && user.verificationExpiresAt < new Date()) {
      return {
        success: false,
        message: "Verification link has expired. Please request a new one.",
        user: { id: user.id, email: user.email },
        needsPassword: true,
        isExpired: true,
      };
    }

    if (user.verificationToken && decoded.token) {
      const isTokenValid = await comparePassword(
        decoded.token,
        user.verificationToken
      );
      if (!isTokenValid) {
        throw new AppError("Invalid verification token", 400);
      }
    }

    if (decoded.needsPassword && !user.passwordHash) {
      return {
        success: true,
        message: "Please set your password to complete activation",
        user: { ...user, emailVerifiedAt: null },
        needsPassword: true,
        isExpired: false,
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        emailVerifiedAt: new Date(),
        verificationToken: null,
        verificationExpiresAt: null,
      },
    });

    return {
      success: true,
      message: "Account successfully activated",
      user: updatedUser,
      needsPassword: false,
      isExpired: false,
    };
  }

  private validatePassword(password: string): void {
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
}
