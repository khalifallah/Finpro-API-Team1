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
import { OAuthService } from "../../services/auth/oauth.service";

export class AuthSessionController {
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

  static async googleAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const { googleId, email, name, picture } = req.body;

      if (!googleId || !email || !name) {
        throw new AppError("Missing required Google user information", 400);
      }

      const googleUser: IGoogleUser = {
        googleId,
        email,
        name,
        picture,
      };

      // Use the proper service
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
}
