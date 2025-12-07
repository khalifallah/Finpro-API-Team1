import prisma from "../libs/prisma";
import AppError from "../errors/app.error";

export interface IAddToCartParam {
  userId: number;
  productId: number;
  quantity: number;
  storeId?: number;
}

export interface IUpdateCartItemParam {
  quantity: number;
}

export interface IRemoveCartItemParam {
  cartItemId: number;
  userId: number;
}

export class CartService {
  // Tambahkan item ke cart
  async addToCart(data: IAddToCartParam): Promise<any> {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Pastikan user memiliki cart, jika belum buat
        let cart = await tx.cart.findUnique({
          where: { userId: data.userId },
        });

        if (!cart) {
          cart = await tx.cart.create({
            data: {
              userId: data.userId,
            },
          });
        }

        // 2. Validasi product
        const product = await tx.product.findUnique({
          where: {
            id: data.productId,
            deletedAt: null,
          },
        });

        if (!product) {
          throw new AppError("Product not found", 404);
        }

        // 3. Cek stok (gunakan store terdekat atau store default)
        const storeId = data.storeId || 1; // Default store ID 1
        const productStock = await tx.productStock.findFirst({
          where: {
            productId: data.productId,
            storeId,
            deletedAt: null,
          },
        });

        if (!productStock) {
          throw new AppError("Product out of stock", 400);
        }

        if (productStock.quantity < data.quantity) {
          throw new AppError(
            `Insufficient stock. Available: ${productStock.quantity}`,
            400
          );
        }

        // 4. Cek apakah item sudah ada di cart (termasuk yang soft deleted)
        const existingCartItem = await tx.cartItem.findFirst({
          where: {
            cartId: cart.id,
            productId: data.productId,
          },
        });

        let cartItem;

        if (existingCartItem) {
          // Update existing item (including restoring if soft-deleted)
          const newQuantity = existingCartItem.quantity + data.quantity;

          // Check stock again with new quantity
          if (productStock.quantity < newQuantity) {
            throw new AppError(
              `Cannot add more items. Total ${newQuantity} exceeds available stock (${productStock.quantity}).`,
              400
            );
          }

          cartItem = await tx.cartItem.update({
            where: { id: existingCartItem.id },
            data: {
              quantity: newQuantity,
              deletedAt: null, // Add this line to restore soft-deleted items
            },
            include: {
              product: {
                include: {
                  productImages: {
                    where: { deletedAt: null },
                    take: 1,
                  },
                },
              },
            },
          });
        } else {
          // Create new cart item
          cartItem = await tx.cartItem.create({
            data: {
              cartId: cart.id,
              productId: data.productId,
              quantity: data.quantity,
            },
            include: {
              product: {
                include: {
                  productImages: {
                    where: { deletedAt: null },
                    take: 1,
                  },
                },
              },
            },
          });
        }

        return {
          cartItem,
          cartId: cart.id,
          message: existingCartItem
            ? "Cart item updated"
            : "Item added to cart",
        };
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Add to cart error:", error);
      // Log the actual error for debugging
      console.error("Full error details:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new AppError("Failed to add item to cart. Please try again.", 500);
    }
  }

  // Dapatkan cart user
  async getUserCart(userId: number, storeId: number = 1): Promise<any> {
    try {
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          cartItems: {
            where: {
              deletedAt: null, // Only get non-deleted items
            },
            include: {
              product: {
                include: {
                  productImages: {
                    where: { deletedAt: null },
                    take: 1,
                  },
                  category: true,
                  productStocks: {
                    where: {
                      storeId: storeId,
                      deletedAt: null, // Add this filter
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Jika cart tidak ada, buat cart kosong
      if (!cart) {
        const newCart = await prisma.cart.create({
          data: { userId },
          include: {
            cartItems: {
              include: {
                product: {
                  include: {
                    productImages: {
                      where: { deletedAt: null },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        });

        return {
          ...newCart,
          totalItems: 0,
          subtotal: 0,
        };
      }

      // Hitung total items dan subtotal
      let totalItems = 0;
      let subtotal = 0;

      const itemsWithStock = cart.cartItems.map((item: any) => {
        totalItems += item.quantity;
        subtotal += item.product.defaultPrice * item.quantity;

        const availableStock = item.product.productStocks[0]?.quantity || 0;

        return {
          ...item,
          stockAvailable: availableStock,
        };
      });

      return {
        ...cart,
        cartItems: itemsWithStock,
        totalItems,
        subtotal,
      };
    } catch (error) {
      console.error("Get user cart error:", error);
      throw new AppError("Failed to retrieve cart", 500);
    }
  }

  // Update quantity item di cart
  async updateCartItem(
    cartItemId: number,
    userId: number,
    quantity: number
  ): Promise<any> {
    try {
      if (quantity <= 0) {
        throw new AppError("Quantity must be greater than 0", 400);
      }

      // First, check if cart item exists and belongs to user (including soft-deleted)
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          id: cartItemId,
          cart: {
            userId,
            deletedAt: null,
          },
        },
        include: {
          product: true,
          cart: true,
        },
      });

      if (!cartItem) {
        throw new AppError("Cart item not found", 404);
      }

      // If item is soft-deleted, restore it first
      if (cartItem.deletedAt) {
        await prisma.cartItem.update({
          where: { id: cartItemId },
          data: {
            deletedAt: null,
            quantity: quantity, // Set to new quantity
          },
        });
      } else {
        // Check stock (only if not soft-deleted)
        const storeId = 1; // Default store
        const productStock = await prisma.productStock.findFirst({
          where: {
            productId: cartItem.productId,
            storeId,
            deletedAt: null,
          },
        });

        if (!productStock || productStock.quantity < quantity) {
          throw new AppError(
            `Insufficient stock. Available: ${productStock?.quantity || 0}`,
            400
          );
        }

        // Update quantity
        await prisma.cartItem.update({
          where: { id: cartItemId },
          data: { quantity },
        });
      }

      // Return updated cart item
      const updatedCartItem = await prisma.cartItem.findUnique({
        where: { id: cartItemId },
        include: {
          product: {
            include: {
              productImages: {
                where: { deletedAt: null },
                take: 1,
              },
            },
          },
        },
      });

      return {
        cartItem: updatedCartItem,
        message: cartItem.deletedAt
          ? "Cart item restored and updated"
          : "Cart item updated successfully",
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Update cart item error:", error);
      throw new AppError("Failed to update cart item", 500);
    }
  }

  // Hapus item dari cart
  async removeCartItem(cartItemId: number, userId: number): Promise<void> {
    try {
      // Validasi ownership
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          id: cartItemId,
          cart: { userId },
          deletedAt: null,
        },
      });

      if (!cartItem) {
        throw new AppError("Cart item not found", 404);
      }

      // Soft delete cart item
      await prisma.cartItem.update({
        where: { id: cartItemId },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Remove cart item error:", error);
      throw new AppError("Failed to remove item from cart", 500);
    }
  }

  // Kosongkan cart (soft delete semua items)
  async clearCart(userId: number): Promise<void> {
    try {
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          cartItems: {
            where: { deletedAt: null },
          },
        },
      });

      if (!cart) {
        throw new AppError("Cart not found", 404);
      }

      // Soft delete semua cart items
      await prisma.cartItem.updateMany({
        where: {
          cartId: cart.id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Clear cart error:", error);
      throw new AppError("Failed to clear cart", 500);
    }
  }

  // Get cart summary untuk checkout
  async getCartSummary(userId: number): Promise<any> {
    try {
      const cart = await this.getUserCart(userId);

      if (!cart.cartItems || cart.cartItems.length === 0) {
        return {
          isEmpty: true,
          message: "Cart is empty",
          totalItems: 0,
          subtotal: 0,
          items: [],
        };
      }

      // Hitung total weight (default 1000g per product)
      const totalWeight = cart.cartItems.reduce((total: number, item: any) => {
        return total + 1000 * item.quantity;
      }, 0);

      return {
        isEmpty: false,
        totalItems: cart.totalItems,
        subtotal: cart.subtotal,
        totalWeight,
        items: cart.cartItems.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          productImage: item.product.productImages[0]?.imageUrl,
          price: item.product.defaultPrice,
          quantity: item.quantity,
          total: item.product.defaultPrice * item.quantity,
          inStock: true, // TODO: Check real stock
        })),
      };
    } catch (error) {
      console.error("Get cart summary error:", error);
      throw new AppError("Failed to get cart summary", 500);
    }
  }
}
