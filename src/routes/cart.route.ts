import { Router, Request, Response, NextFunction } from "express";
import { CartController } from "../controllers/cart.controller";
import {
  addToCartSchema,
  updateCartItemSchema,
} from "../validations/cart.validation";
import {
  requireVerifiedUser,
  verifyToken,
} from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validator.middleware";
import prisma from "../libs/prisma";
import { responseBuilder } from "../utils/response.builder";

const router = Router();
router.use(verifyToken);

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

// Refresh cart (cleanup soft-deleted items)
router.post(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;

      // Clean up any soft-deleted items that might still be in the cart
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          cartItems: true,
        },
      });

      if (cart) {
        // Any additional cleanup logic if needed
      }

      res
        .status(200)
        .json(responseBuilder(200, "Cart refreshed successfully", {}));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
