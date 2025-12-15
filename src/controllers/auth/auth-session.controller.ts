import { Request, Response, NextFunction } from "express";
import {
  LoginService,
  FindUserByEmail,
  GoogleAuthService,
  oauthService,
  setPasswordForSocialUser,
} from "../../services/auth/auth.service";
import AppError from "../../errors/app.error";
import { responseBuilder } from "../../utils/response.builder";
import { IGoogleUser } from "../../types/user.types";
import { AuthLoginService } from "../../services/auth/auth-login.service";
import { AuthVerificationService } from "../../services/auth/auth-verification.service";
import { OAuthService } from "../../services/auth/oauth.service";
import { GoogleAuthService as GoogleTokenVerifier } from "../../services/auth/google-auth.service";
import prisma from "../../libs/prisma";

export class AuthSessionController {
  // UPDATE: Login method to include store info
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      let data: any;
      if (typeof (LoginService as any) === "function") {
        data = await (LoginService as any)(req.body);
      } else if (typeof (LoginService as any).login === "function") {
        data = await (LoginService as any).login(req.body);
      } else if (typeof (LoginService as any).execute === "function") {
        data = await (LoginService as any).execute(req.body);
      } else {
        throw new AppError("Invalid LoginService implementation", 500);
      }

      // ADD: Fetch store info jika user adalah STORE_ADMIN
      let store = null;
      if (data.user.role === "STORE_ADMIN" && data.user.id) {
        const storeData = await prisma.store.findFirst({
          where: {
            users: {
              some: {
                id: data.user.id,
                deletedAt: null,
              },
            },
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
        });
        store = storeData;
        console.log("🏪 Store for STORE_ADMIN:", store);
      }

      //  ADD: Include store in response
      res.status(200).json(
        responseBuilder(200, "Login successful", {
          user: {
            ...data.user,
            store: store, // Add store here
          },
          token: data.token,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  static async googleAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const { idToken } = req.body; // Get idToken from request body

      if (!idToken) {
        throw new AppError("Google ID token is required", 400);
      }

      // Verify the Google token
      const googleAuthService = new GoogleTokenVerifier();
      const googleUserInfo = await googleAuthService.verifyGoogleToken(idToken);

      // Validate required fields
      if (!googleUserInfo.email) {
        throw new AppError("Email not provided by Google", 400);
      }

      // Ensure name provided
      if (!googleUserInfo.name) {
        throw new AppError("Name not provided by Google", 400);
      }

      // Create IGoogleUser object
      const googleUser: IGoogleUser = {
        googleId: googleUserInfo.googleId,
        email: googleUserInfo.email,
        name: googleUserInfo.name,
        picture: googleUserInfo.picture,
      };

      // Use the auth login service
      const authLoginService = new AuthLoginService();
      const data = await authLoginService.googleAuth(googleUser);

      res.status(200).json(
        responseBuilder(200, "Google authentication successful", {
          user: data.user,
          token: data.token,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  static async getCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("User is not authenticated", 401);
      }
      let user: any;
      if (typeof (FindUserByEmail as any) === "function") {
        user = await (FindUserByEmail as any)(req.user.email);
      } else if (
        typeof (FindUserByEmail as any).findUserByEmail === "function"
      ) {
        user = await (FindUserByEmail as any).findUserByEmail(req.user.email);
      } else if (typeof (FindUserByEmail as any).findByEmail === "function") {
        user = await (FindUserByEmail as any).findByEmail(req.user.email);
      } else if (typeof (FindUserByEmail as any).getByEmail === "function") {
        user = await (FindUserByEmail as any).getByEmail(req.user.email);
      } else if (typeof (FindUserByEmail as any).execute === "function") {
        user = await (FindUserByEmail as any).execute(req.user.email);
      } else {
        throw new AppError("Invalid FindUserByEmail implementation", 500);
      }

      if (!user) {
        throw new AppError("User not found", 404);
      }
      let store = null;
      if (user.role === "STORE_ADMIN" && user.id) {
        const storeData = await prisma.store.findFirst({
          where: {
            users: {
              some: {
                id: user.id,
                deletedAt: null,
              },
            },
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
        });
        store = storeData;
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
            store: store,
            emailVerifiedAt: user.emailVerifiedAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            // Prisma returns an object { id:..., code: "..." }
            referralCode: user.referralCode?.code,
          },
        })
      );
    } catch (err) {
      next(err);
    }
  }

  static async getAuthStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }
      const authStatus = await oauthService.getUserAuthStatus(req.user.id);
      res.status(200).json(
        responseBuilder(200, "Auth status retrieved successfully", {
          authStatus,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  static async unlinkGoogleAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }
      await oauthService.unlinkGoogleAccount(req.user.id);
      res
        .status(200)
        .json(responseBuilder(200, "Google account unlinked successfully", {}));
    } catch (err) {
      next(err);
    }
  }

  static async setPasswordForSocialUser(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }
      const { password } = req.body;
      await setPasswordForSocialUser(req.user.id, password);
      res
        .status(200)
        .json(
          responseBuilder(
            200,
            "Password set successfully for social account",
            {}
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async checkVerificationStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
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

      interface SocialAccount {
        provider: string;
        providerUserId: string;
      }

      interface UserVerificationData {
        id: number;
        email: string;
        emailVerifiedAt: Date | null;
        socialAccounts: SocialAccount[];
      }

      const typedUser = user as UserVerificationData;

      res.status(200).json(
        responseBuilder(200, "Verification status retrieved", {
          user: {
            id: typedUser.id,
            email: typedUser.email,
            emailVerifiedAt: typedUser.emailVerifiedAt,
            isGoogleUser: typedUser.socialAccounts.some(
              (account: SocialAccount) => account.provider === "google"
            ),
            socialAccounts: typedUser.socialAccounts,
          },
        })
      );
    } catch (err) {
      next(err);
    }
  }
}
