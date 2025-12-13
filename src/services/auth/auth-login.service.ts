import { ILoginParam, IGoogleUser } from "../../types/user.types";
import prisma from "../../libs/prisma";
import { comparePassword } from "../../libs/bcrypt";
import { generateJWT } from "../../libs/jwt";
import { OAuthService } from "./oauth.service";
import AppError from "../../errors/app.error";
import { processImage } from "../../utils/file.util";

const oauthService = new OAuthService();

export class AuthLoginService {
  async findUserByEmail(email: string) {
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

  async login(param: ILoginParam) {
    try {
      const user = await this.findUserByEmail(param.email);

      if (!user) throw new AppError("Email is not registered", 404);

      await this.validateUserForLogin(user);

      const checkPass = await comparePassword(
        param.password,
        user.passwordHash!
      );
      if (!checkPass) throw new AppError("Incorrect password", 400);

      const payload = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        photoUrl: user.photoUrl,
        storeId: user.storeId,
        emailVerifiedAt: user.emailVerifiedAt, // Add this line
      };

      const token = generateJWT(payload);

      return { user: payload, token };
    } catch (err) {
      throw err;
    }
  }

  async googleAuth(googleUser: IGoogleUser) {
    try {
      const user = await oauthService.findOrCreateGoogleUser(googleUser);

      const payload = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        photoUrl: user.photoUrl,
        storeId: user.storeId,
        emailVerifiedAt: user.emailVerifiedAt,
      };

      const token = generateJWT(payload);

      return { user: payload, token };
    } catch (error) {
      throw error;
    }
  }

  async updateUser(
    file: Express.Multer.File | undefined,
    email: string,
    updateData: { fullName?: string; email?: string }
  ) {
    try {
      const checkUser = await this.findUserByEmail(email);
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
        const emailExists = await this.findUserByEmail(updateData.email);
        if (emailExists) throw new AppError("Email is already taken", 400);

        updatePayload.email = updateData.email;
        updatePayload.emailVerifiedAt = null;
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

  private async validateUserForLogin(user: any) {
    const socialAccounts = await prisma.socialAccount.findMany({
      where: { userId: user.id },
    });

    const isGoogleUser = socialAccounts.some(
      (account) => account.provider === "google"
    );

    if (isGoogleUser && !user.passwordHash) {
      throw new AppError(
        "This account uses Google Sign-In. Please sign in with Google or set a password first.",
        403
      );
    }

    if (!user.passwordHash) {
      throw new AppError(
        "Please set your password first. Check your email for activation link.",
        403
      );
    }

    if (!user.emailVerifiedAt) {
      throw new AppError("Please verify your email before logging in", 403);
    }
  }
}
