import { Router } from "express";
import {
  RegisterController,
  ActivationController,
  SetPasswordController, // Import new controller
  LoginController,
  getCurrentUserController,
  UpdateProfileController,
  AuthPasswordController,
  VerifyResetTokenController,
  ResetPasswordLoggedInController,
  ResendVerificationController,
} from "../controllers/auth.controller";
import { verifyToken, uniqueUserGuard } from "../middlewares/auth.middleware";
import { uploadImages } from "../middlewares/upload.middleware";
import {
  registerSchema,
  setPasswordSchema, // Import new schema
  loginSchema,
  changePasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
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
  SetPasswordController // New route for setting password
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

// Resend verification email
router.post("/resend-verification", ResendVerificationController);

// ==================== PROTECTED ROUTES ====================
router.use(verifyToken);

// User profile
router.get("/me", getCurrentUserController);
router.patch(
  "/profile",
  uploadImages,
  validateRequest(updateProfileSchema),
  UpdateProfileController
);

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

export default router;
