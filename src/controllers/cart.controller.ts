import { Request, Response, NextFunction } from "express";
import { CartService } from "../services/cart.service";
import AppError from "../errors/app.error";
import { responseBuilder } from "../utils/response.builder";

const cartService = new CartService();

// Helper function to get user ID from request
const getUserId = (req: Request): number => {
  if (!req.user) {
    throw new AppError("User not authenticated", 401);
  }

  const userId = req.user.id;

  if (!userId) {
    console.error("User object structure:", req.user);
    throw new AppError("User ID not found in token", 400);
  }

  if (isNaN(Number(userId))) {
    console.error("Invalid user ID:", userId);
    throw new AppError("Invalid user ID format", 400);
  }

  return Number(userId);
};

export class CartController {
  // Tambahkan item ke cart
  static async addToCart(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);
      const { productId, quantity, storeId } = req.body;

      if (!productId || !quantity) {
        throw new AppError("Product ID and quantity are required", 400);
      }

      if (quantity <= 0) {
        throw new AppError("Quantity must be greater than 0", 400);
      }

      const result = await cartService.addToCart({
        userId,
        productId,
        quantity,
        storeId,
      });

      res.status(201).json(
        responseBuilder(201, result.message, {
          cartItem: result.cartItem,
          cartId: result.cartId,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Dapatkan cart user
  static async getCart(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);
      const cart = await cartService.getUserCart(userId);

      res.status(200).json(
        responseBuilder(200, "Cart retrieved successfully", {
          cart,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Update cart item quantity
  static async updateCartItem(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);
      const { cartItemId } = req.params;
      const { quantity } = req.body;

      if (!quantity || quantity <= 0) {
        throw new AppError("Valid quantity is required", 400);
      }

      const result = await cartService.updateCartItem(
        Number(cartItemId),
        userId,
        quantity
      );

      res.status(200).json(
        responseBuilder(200, result.message, {
          cartItem: result.cartItem,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Hapus item dari cart
  static async removeCartItem(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);
      const { cartItemId } = req.params;

      await cartService.removeCartItem(Number(cartItemId), userId);

      res
        .status(200)
        .json(responseBuilder(200, "Item removed from cart successfully", {}));
    } catch (error) {
      next(error);
    }
  }

  // Kosongkan cart
  static async clearCart(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);
      await cartService.clearCart(userId);

      res
        .status(200)
        .json(responseBuilder(200, "Cart cleared successfully", {}));
    } catch (error) {
      next(error);
    }
  }

  // Get cart summary
  static async getCartSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getUserId(req);
      const summary = await cartService.getCartSummary(userId);

      res.status(200).json(
        responseBuilder(200, "Cart summary retrieved successfully", {
          summary,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}
