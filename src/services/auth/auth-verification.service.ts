import prisma from "../../libs/prisma";
import AppError from "../../errors/app.error";

export class AuthVerificationService {
  /**
   * Check user verification status
   * Used by: checkVerificationStatus controller
   */
  async getUserVerificationStatus(userId: number) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          emailVerifiedAt: true,
          socialAccounts: {
            select: {
              provider: true,
              providerUserId: true,
            },
          },
        },
      });

      if (!user) {
        throw new AppError("User not found", 404);
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          emailVerifiedAt: user.emailVerifiedAt,
          isGoogleUser: user.socialAccounts.some(
            (account) => account.provider === "google"
          ),
          socialAccounts: user.socialAccounts,
        },
      };
    } catch (err) {
      console.error("Error in getUserVerificationStatus:", err);
      throw err;
    }
  }
}
