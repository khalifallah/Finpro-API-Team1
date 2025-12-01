import prisma from "../../libs/prisma";
import { IGoogleUser, IOAuthService } from "../../types/user.types";
import { UserRole } from "../../generated/prisma-client";
import AppError from "../../errors/app.error";
import { generateJWT } from "../../libs/jwt";

export class OAuthService implements IOAuthService {
  async findOrCreateGoogleUser(googleUser: IGoogleUser): Promise<any> {
    try {
      // Check if user exists with this email
      let user = await prisma.user.findUnique({
        where: { email: googleUser.email },
        include: {
          socialAccounts: true,
          referralCode: true,
        },
      });

      if (user) {
        // User exists, check if they have Google account linked
        const googleAccount = user.socialAccounts.find(
          (account) => account.provider === "google"
        );

        if (!googleAccount) {
          // Link Google account to existing user
          await prisma.socialAccount.create({
            data: {
              userId: user.id,
              provider: "google",
              providerUserId: googleUser.googleId,
            },
          });
        }

        // Update user profile picture if not set
        if (!user.photoUrl && googleUser.picture) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { photoUrl: googleUser.picture },
            include: {
              socialAccounts: true,
              referralCode: true,
            },
          });
        }

        // Auto-verify email for Google users
        if (!user.emailVerifiedAt) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { emailVerifiedAt: new Date() },
            include: {
              socialAccounts: true,
              referralCode: true,
            },
          });
        }

        return user;
      }

      // Create new user with Google account
      return await prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
          data: {
            fullName: googleUser.name,
            email: googleUser.email,
            passwordHash: null, // No password for Google users
            role: UserRole.USER,
            emailVerifiedAt: new Date(), // Auto-verify Google accounts
            photoUrl: googleUser.picture,
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

        // Create social account
        await tx.socialAccount.create({
          data: {
            userId: newUser.id,
            provider: "google",
            providerUserId: googleUser.googleId,
          },
        });

        // Create cart for user
        await tx.cart.create({
          data: {
            userId: newUser.id,
          },
        });

        return newUser;
      });
    } catch (error) {
      console.error("Google OAuth error:", error);
      throw new AppError("Failed to authenticate with Google", 500);
    }
  }

  async unlinkGoogleAccount(userId: number): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        socialAccounts: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!user.passwordHash) {
      throw new AppError(
        "Cannot unlink Google account. Please set a password first.",
        400
      );
    }

    const googleAccount = user.socialAccounts.find(
      (account) => account.provider === "google"
    );

    if (!googleAccount) {
      throw new AppError("Google account not linked", 400);
    }

    await prisma.socialAccount.delete({
      where: { id: googleAccount.id },
    });
  }

  async getUserAuthStatus(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        socialAccounts: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const isGoogleUser = user.socialAccounts.some(
      (account) => account.provider === "google"
    );

    return {
      isAuthenticated: true,
      isVerified: !!user.emailVerifiedAt,
      hasPassword: !!user.passwordHash,
      isGoogleUser,
      permissions: this.getUserPermissions(user.role),
    };
  }

  private getUserPermissions(role: UserRole): string[] {
    const basePermissions = ["browse_products", "view_profile"];

    switch (role) {
      case UserRole.USER:
        return [...basePermissions, "add_to_cart", "place_orders"];
      case UserRole.STORE_ADMIN:
        return [
          ...basePermissions,
          "manage_store",
          "manage_products",
          "view_analytics",
        ];
      case UserRole.SUPER_ADMIN:
        return [
          ...basePermissions,
          "manage_users",
          "manage_all_stores",
          "system_config",
        ];
      default:
        return basePermissions;
    }
  }
}
