import { Router } from "express";
import { CartController } from "../controllers/cart.controller";
import {
  addToCartSchema,
  updateCartItemSchema,
} from "../validations/cart.validation";
import { requireVerifiedUser } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validator.middleware";

const router = Router();

// ==================== CART MANAGEMENT ROUTES ====================
// Get user cart
router.get(
  "/",
  requireVerifiedUser,
  CartController.getCart.bind(CartController)
);
// Get cart summary
router.get(
  "/summary",
  requireVerifiedUser,
  CartController.getCartSummary.bind(CartController)
);
// Add item to cart
router.post(
  "/items",
  validateRequest(addToCartSchema),
  requireVerifiedUser,
  CartController.addToCart.bind(CartController)
);
// Update cart item
router.patch(
  "/items/:cartItemId",
  validateRequest(updateCartItemSchema),
  requireVerifiedUser,
  CartController.updateCartItem.bind(CartController)
);
// Remove item from cart
router.delete(
  "/items/:cartItemId",
  requireVerifiedUser,
  CartController.removeCartItem.bind(CartController)
);
// Clear cart
router.delete(
  "/",
  requireVerifiedUser,
  CartController.clearCart.bind(CartController)
);

export default router;
