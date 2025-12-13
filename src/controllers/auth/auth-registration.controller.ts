import { Request, Response, NextFunction } from "express";
import {
  ActivateUserService,
  RegisterService,
  SetPasswordService,
  ResendVerificationService,
} from "../../services/auth/auth.service";
import AppError from "../../errors/app.error";
import { responseBuilder } from "../../utils/response.builder";

// Create an instance for the service that has instance methods
const activateService = ActivateUserService as any;
const registerService = RegisterService as any;
const setPasswordService = SetPasswordService as any;
const resendVerificationService = ResendVerificationService as any;

export class AuthRegistrationController {
  static async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      let data: any;

      // Try to call the service based on its available methods
      if (typeof registerService === "function") {
        // It's a function
        data = await registerService(req.body);
      } else if (typeof registerService.register === "function") {
        // It's an object with a register method
        data = await registerService.register(req.body);
      } else if (typeof registerService.execute === "function") {
        // It's an object with an execute method
        data = await registerService.execute(req.body);
      } else {
        // Try calling it as a class instance method
        data = await registerService(req.body);
      }

      res.status(201).json(
        responseBuilder(
          201,
          "Registration successful. Please check your email to verify and set your password.",
          {
            user: {
              id: data.id,
              email: data.email,
              fullName: data.fullName,
              role: data.role,
            },
          }
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async activate(req: Request, res: Response, next: NextFunction) {
    try {
      let result: any;

      // Try to call the service based on its available methods
      if (typeof activateService === "function") {
        // It's a function
        result = await activateService(req.params.token);
      } else if (typeof activateService.activate === "function") {
        // It's an object with an activate method
        result = await activateService.activate(req.params.token);
      } else if (typeof activateService.activateUser === "function") {
        // It's an object with an activateUser method (check the actual method name)
        result = await activateService.activateUser(req.params.token);
      } else if (typeof activateService.execute === "function") {
        // It's an object with an execute method
        result = await activateService.execute(req.params.token);
      } else {
        // Try calling it directly
        result = await activateService(req.params.token);
      }

      if (result.isExpired) {
        return res.status(400).json(
          responseBuilder(400, result.message, {
            user: {
              id: result.user.id,
              email: result.user.email,
            },
            needsPassword: result.needsPassword,
            isExpired: true,
            actionRequired: "resend_verification",
          })
        );
      }

      const activatedUser = result.user as any;

      res.status(200).json(
        responseBuilder(200, result.message, {
          user: {
            id: activatedUser.id,
            email: activatedUser.email,
            fullName: activatedUser.fullName ?? null,
            role: activatedUser.role ?? null,
            emailVerifiedAt: activatedUser.emailVerifiedAt ?? null,
          },
          needsPassword: result.needsPassword,
          isExpired: false,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  static async setPassword(req: Request, res: Response, next: NextFunction) {
    try {
      let result: any;

      if (typeof setPasswordService === "function") {
        result = await setPasswordService(req.body);
      } else if (typeof setPasswordService.setPassword === "function") {
        result = await setPasswordService.setPassword(req.body);
      } else if (typeof setPasswordService.execute === "function") {
        result = await setPasswordService.execute(req.body);
      } else {
        result = await setPasswordService(req.body);
      }

      res.status(200).json(
        responseBuilder(200, result.message, {
          user: {
            id: result.user.id,
            email: result.user.email,
            fullName: result.user.fullName,
            role: result.user.role,
            emailVerifiedAt: result.user.emailVerifiedAt,
          },
        })
      );
    } catch (err) {
      next(err);
    }
  }

  static async resendVerification(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.body;
      let result: any;

      if (typeof resendVerificationService === "function") {
        result = await resendVerificationService(email);
      } else if (typeof resendVerificationService.resend === "function") {
        result = await resendVerificationService.resend(email);
      } else if (
        typeof resendVerificationService.resendVerification === "function"
      ) {
        result = await resendVerificationService.resendVerification(email);
      } else if (typeof resendVerificationService.execute === "function") {
        result = await resendVerificationService.execute(email);
      } else {
        result = await resendVerificationService(email);
      }

      res
        .status(200)
        .json(
          responseBuilder(
            200,
            "New verification email sent successfully. The link will expire in 1 hour.",
            {}
          )
        );
    } catch (err) {
      next(err);
    }
  }
}
