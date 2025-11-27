import { Router } from "express";
import {
  RegisterController,
  ActivationController,
  SetPasswordController,
  LoginController,
  AuthPasswordController,
  VerifyResetTokenController,
  ResetPasswordLoggedInController,
  ResendVerificationController,
} from "../controllers/auth.controller";
import { ProfileController } from "../controllers/profile.controller";
import { verifyToken, uniqueUserGuard } from "../middlewares/auth.middleware";
import { uploadProfilePhoto } from "../middlewares/upload.middleware";
import {
  registerSchema,
  setPasswordSchema,
  loginSchema,
  changePasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  emailUpdateSchema,
  resendVerificationSchema,
} from "../validations/auth.validation";
import { validateRequest } from "../middlewares/validator.middleware";

const router = Router();

// ==================== PUBLIC ROUTES ====================

// Registration & Activation
router.post(
  "/register",
  validateRequest(registerSchema),
  uniqueUserGuard,
  RegisterController
);
router.get("/activate/:token", ActivationController);
router.post(
  "/set-password",
  validateRequest(setPasswordSchema),
  SetPasswordController
);

// Login
router.post("/login", validateRequest(loginSchema), LoginController);

// Password reset (public)
router.post(
  "/request-password-reset",
  AuthPasswordController.requestPasswordReset
);
router.post(
  "/reset-password",
  validateRequest(resetPasswordSchema),
  AuthPasswordController.resetPassword
);
router.post("/verify-reset-token", VerifyResetTokenController);

// Resend verification email (public)
router.post(
  "/resend-verification",
  validateRequest(resendVerificationSchema),
  ResendVerificationController
);

// ==================== PROTECTED ROUTES ====================
router.use(verifyToken);

// Enhanced Profile Management
router.get("/profile", ProfileController.getProfile);
router.patch(
  "/profile",
  uploadProfilePhoto,
  validateRequest(updateProfileSchema),
  ProfileController.updateProfile
);
router.patch(
  "/profile/email",
  validateRequest(emailUpdateSchema),
  ProfileController.updateEmail
);
router.post(
  "/profile/request-verification",
  ProfileController.requestVerification
);
router.delete("/profile/photo", ProfileController.deleteProfilePhoto);

// Password management (for logged-in users)
router.post(
  "/change-password",
  validateRequest(changePasswordSchema),
  AuthPasswordController.changePassword
);
router.post(
  "/reset-password-loggedin",
  validateRequest(resetPasswordSchema),
  ResetPasswordLoggedInController
);

// Keep backward compatibility
router.get("/me", ProfileController.getProfile);

export default router;
