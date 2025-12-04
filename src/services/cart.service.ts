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
        const existingCartItem = await tx.cartItem.findUnique({
          where: {
            cartId_productId: {
              cartId: cart.id,
              productId: data.productId,
            },
          },
        });

        let cartItem;
        if (existingCartItem) {
          // --- LOGIKA UPDATE / RESTORE ---

          let newQuantity;

          if (existingCartItem.deletedAt) {
            // KASUS A: Item dulunya sudah dihapus (Soft Delete)
            // Kita anggap ini barang baru masuk. Abaikan jumlah lama yang sudah dibuang.
            newQuantity = data.quantity;
          } else {
            // KASUS B: Item masih aktif di keranjang.
            // Kita tambahkan jumlah baru ke jumlah lama.
            newQuantity = existingCartItem.quantity + data.quantity;
          }

          // Validasi stok lagi dengan quantity baru
          if (productStock.quantity < newQuantity) {
            throw new AppError(
              `Cannot add items. Total ${newQuantity} exceeds available stock (${productStock.quantity}).`,
              400
            );
          }

          // Lakukan Update (Sekaligus Restore jika deletedAt ada isinya)
          cartItem = await tx.cartItem.update({
            where: { id: existingCartItem.id },
            data: {
              quantity: newQuantity,
              deletedAt: null, // <--- PENTING: Hapus status deleted (Restore)
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
          // --- LOGIKA INSERT BARU ---
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
          message:
            existingCartItem && !existingCartItem.deletedAt
              ? "Cart item updated"
              : "Item added to cart",
        };
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Add to cart error:", error);
      throw new AppError("Failed to add item to cart", 500);
    }
  }

  // Dapatkan cart user
  async getUserCart(userId: number, storeId: number = 1): Promise<any> {
    try {
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          cartItems: {
            where: { deletedAt: null },
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

      // Cari cart item dan validasi ownership
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          id: cartItemId,
          cart: { userId },
          deletedAt: null,
        },
        include: {
          product: true,
          cart: true,
        },
      });

      if (!cartItem) {
        throw new AppError("Cart item not found", 404);
      }

      // Cek stok
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
      const updatedCartItem = await prisma.cartItem.update({
        where: { id: cartItemId },
        data: { quantity },
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
        message: "Cart item updated successfully",
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
