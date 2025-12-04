import { Router } from "express";
import {
  AuthRegistrationController,
  AuthSessionController,
  AuthPasswordController,
} from "../controllers/auth/auth.controller";
import { ProfileController } from "../controllers/profile.controller";
import { AddressController } from "../controllers/address.controller";
import { CartController } from "../controllers/cart.controller";
import {
  verifyToken,
  uniqueUserGuard,
  requireVerifiedUser,
  attachAuthStatus,
} from "../middlewares/auth.middleware";
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
  googleAuthSchema,
  setSocialPasswordSchema,
} from "../validations/auth.validation";
import {
  createAddressSchema,
  updateAddressSchema,
} from "../validations/address.validation";
import {
  addToCartSchema,
  updateCartItemSchema,
} from "../validations/cart.validation";
import { validateRequest } from "../middlewares/validator.middleware";

const router = Router();

// Create controller instances
// AuthRegistrationController and AuthPasswordController expose static handlers; instantiate only controllers with instance methods
const authSessionController = new AuthSessionController();

// ==================== PUBLIC ROUTES ====================
// Registration & Activation
router.post(
  "/register",
  validateRequest(registerSchema),
  uniqueUserGuard,
  AuthRegistrationController.register.bind(AuthRegistrationController)
);
router.get(
  "/activate/:token",
  AuthRegistrationController.activate.bind(AuthRegistrationController)
);
router.post(
  "/set-password",
  validateRequest(setPasswordSchema),
  AuthRegistrationController.setPassword.bind(AuthRegistrationController)
);
router.post(
  "/login",
  validateRequest(loginSchema),
  AuthSessionController.login.bind(AuthSessionController)
);
// Password reset (public)
router.post(
  "/request-password-reset",
  AuthPasswordController.requestPasswordReset.bind(AuthPasswordController)
);
router.post(
  "/reset-password",
  validateRequest(resetPasswordSchema),
  AuthPasswordController.resetPassword.bind(AuthPasswordController)
);
router.post(
  "/verify-reset-token",
  AuthPasswordController.verifyResetToken.bind(AuthPasswordController)
);
// Resend verification email (public)
router.post(
  "/resend-verification",
  validateRequest(resendVerificationSchema),
  AuthRegistrationController.resendVerification.bind(AuthRegistrationController)
);
// Google OAuth routes
router.post(
  "/google",
  validateRequest(googleAuthSchema),
  AuthSessionController.googleAuth.bind(AuthSessionController)
);

// ==================== PROTECTED ROUTES ====================
router.use(verifyToken);
router.use(attachAuthStatus);

// Auth status and management
router.get(
  "/status",
  AuthSessionController.getAuthStatus.bind(AuthSessionController)
);
router.post(
  "/unlink-google",
  AuthSessionController.unlinkGoogleAccount.bind(AuthSessionController)
);
router.post(
  "/set-social-password",
  validateRequest(setSocialPasswordSchema),
  AuthSessionController.setPasswordForSocialUser.bind(AuthSessionController)
);
router.get(
  "/profile",
  requireVerifiedUser,
  ProfileController.getProfile.bind(ProfileController)
);
router.patch(
  "/profile",
  uploadProfilePhoto,
  validateRequest(updateProfileSchema),
  ProfileController.updateProfile.bind(ProfileController)
);
router.patch(
  "/profile/email",
  requireVerifiedUser,
  validateRequest(emailUpdateSchema),
  ProfileController.updateEmail.bind(ProfileController)
);
router.post(
  "/profile/request-verification",
  ProfileController.requestVerification.bind(ProfileController)
);
router.delete(
  "/profile/photo",
  requireVerifiedUser,
  ProfileController.deleteProfilePhoto.bind(ProfileController)
);

// ==================== ADDRESS MANAGEMENT ROUTES ====================
// Get all user addresses
router.get(
  "/profile/addresses",
  requireVerifiedUser,
  AddressController.getUserAddresses.bind(AddressController)
);
// Get specific address
router.get(
  "/profile/addresses/:addressId",
  requireVerifiedUser,
  AddressController.getAddressById.bind(AddressController)
);
// Create new address
router.post(
  "/profile/address",
  validateRequest(createAddressSchema),
  requireVerifiedUser,
  AddressController.createAddress.bind(AddressController)
);
// Update address
router.patch(
  "/profile/addresses/:addressId",
  validateRequest(updateAddressSchema),
  requireVerifiedUser,
  AddressController.updateAddress.bind(AddressController)
);
// Delete address
router.delete(
  "/profile/addresses/:addressId",
  requireVerifiedUser,
  AddressController.deleteAddress.bind(AddressController)
);
// Set address as main
router.patch(
  "/profile/addresses/:addressId/set-main",
  requireVerifiedUser,
  AddressController.setMainAddress.bind(AddressController)
);

// Password management (for logged-in users)
router.post(
  "/change-password",
  requireVerifiedUser,
  validateRequest(changePasswordSchema),
  AuthPasswordController.changePassword.bind(AuthPasswordController)
);
router.post(
  "/reset-password-loggedin",
  requireVerifiedUser,
  validateRequest(resetPasswordSchema),
  AuthPasswordController.resetPasswordLoggedIn.bind(AuthPasswordController)
);
router.get(
  "/me",
  requireVerifiedUser,
  AuthSessionController.getCurrentUser.bind(AuthSessionController)
);

// ==================== CART MANAGEMENT ROUTES ====================
// Get user cart
router.get(
  "/cart",
  requireVerifiedUser,
  CartController.getCart.bind(CartController)
);
// Get cart summary
router.get(
  "/cart/summary",
  requireVerifiedUser,
  CartController.getCartSummary.bind(CartController)
);
// Add item to cart
router.post(
  "/cart/items",
  validateRequest(addToCartSchema),
  requireVerifiedUser,
  CartController.addToCart.bind(CartController)
);
// Update cart item
router.patch(
  "/cart/items/:cartItemId",
  validateRequest(updateCartItemSchema),
  requireVerifiedUser,
  CartController.updateCartItem.bind(CartController)
);
// Remove item from cart
router.delete(
  "/cart/items/:cartItemId",
  requireVerifiedUser,
  CartController.removeCartItem.bind(CartController)
);
// Clear cart
router.delete(
  "/cart",
  requireVerifiedUser,
  CartController.clearCart.bind(CartController)
);

router.get(
  "/verification-status",
  verifyToken,
  AuthSessionController.checkVerificationStatus.bind(AuthSessionController)
);

export default router;
