import prisma from "../libs/prisma";
import AppError from "../errors/app.error";

export interface IAddToCartParam {
  userId: number;
  productId: number;
  quantity: number;
  storeId: number;
}

export interface IUpdateCartItemParam {
  quantity: number;
}

export interface IRemoveCartItemParam {
  cartItemId: number;
  userId: number;
}

export class CartService {
  // 1. TAMBAHKAN ITEM KE CART
  async addToCart(data: IAddToCartParam): Promise<any> {
    try {
      return await prisma.$transaction(async (tx) => {
        // A. Pastikan user memiliki cart header
        let cart = await tx.cart.findUnique({
          where: { userId: data.userId },
        });

        if (!cart) {
          cart = await tx.cart.create({
            data: { userId: data.userId },
          });
        }

        // B. Validasi Product
        const product = await tx.product.findUnique({
          where: { id: data.productId, deletedAt: null },
        });

        if (!product) {
          throw new AppError("Product not found", 404);
        }

        // C. Cek Stok (Sesuai Store ID yang dikirim)
        const productStock = await tx.productStock.findFirst({
          where: {
            productId: data.productId,
            storeId: data.storeId, // [UPDATE] Cek stok di toko target
            deletedAt: null,
          },
        });

        if (!productStock) {
          throw new AppError("Product not found in this store", 400);
        }

        if (productStock.quantity < data.quantity) {
          throw new AppError(
            `Insufficient stock. Available: ${productStock.quantity}`,
            400
          );
        }

        // D. Cek apakah item sudah ada (Unik: Cart + Product + STORE)
        const existingCartItem = await tx.cartItem.findFirst({
          where: {
            cartId: cart.id,
            productId: data.productId,
            storeId: data.storeId, // [UPDATE] Pembeda item antar toko
          },
        });

        let cartItem;

        if (existingCartItem) {
          // Update Existing Item
          const newQuantity = existingCartItem.deletedAt
            ? data.quantity // Jika dulunya dihapus, reset qty
            : existingCartItem.quantity + data.quantity;

          // Cek stok lagi dengan total qty baru
          if (productStock.quantity < newQuantity) {
            throw new AppError(
              `Cannot add more. Total ${newQuantity} exceeds stock (${productStock.quantity}).`,
              400
            );
          }

          cartItem = await tx.cartItem.update({
            where: { id: existingCartItem.id },
            data: {
              quantity: newQuantity,
              deletedAt: null, // Restore soft-deleted items
            },
            include: {
              product: {
                include: {
                  productImages: { where: { deletedAt: null }, take: 1 },
                },
              },
            },
          });
        } else {
          // Create New Item (Simpan Store ID)
          cartItem = await tx.cartItem.create({
            data: {
              cartId: cart.id,
              productId: data.productId,
              quantity: data.quantity,
              storeId: data.storeId, // [UPDATE] Simpan ID Toko ke DB
            },
            include: {
              product: {
                include: {
                  productImages: { where: { deletedAt: null }, take: 1 },
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
      if (error instanceof AppError) throw error;
      console.error("Add to cart error:", error);
      throw new AppError("Failed to add item to cart.", 500);
    }
  }

  // 2. DAPATKAN CART USER (FILTERED BY STORE)
  async getUserCart(userId: number, storeId?: number): Promise<any> {
    try {
      const itemWhereClause: any = { deletedAt: null };

      if (storeId) {
        itemWhereClause.storeId = storeId;
      }

      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          cartItems: {
            where: itemWhereClause,
            orderBy: { createdAt: "desc" },
            include: {
              product: {
                include: {
                  productImages: { where: { deletedAt: null }, take: 1 },
                  category: true,
                  // Include stok untuk validasi di frontend
                  productStocks: {
                    where: {
                      storeId: storeId,
                      deletedAt: null,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Jika cart belum ada
      if (!cart) {
        return { cartItems: [], totalItems: 0, subtotal: 0 };
      }

      const enrichedItems = await this.calculateDiscounts(
        cart.cartItems,
        storeId
      );

      // Hitung ulang total (karena item mungkin terfilter)
      let totalItems = 0;
      let subtotal = 0;
      let originalSubtotal = 0;

      const finalItems = enrichedItems.map((item: any) => {
        totalItems += item.quantity;
        subtotal += item.totalPrice;
        originalSubtotal += item.originalPrice * item.quantity;

        const availableStock = item.product.productStocks[0]?.quantity || 0;

        return {
          id: item.id,
          productId: item.productId,
          storeId: item.storeId,
          quantity: item.quantity,
          product: {
            ...item.product,
            productStocks: undefined,
          },
          stockAvailable: availableStock,

          originalPrice: item.originalPrice,
          finalPrice: item.totalPrice,
          discountAmount: item.discountAmount,
          appliedDiscount: item.appliedDiscount,
        };
      });

      return {
        ...cart,
        cartItems: finalItems,
        totalItems,
        subtotal,
        originalSubtotal,
      };
    } catch (error) {
      console.error("Get user cart error:", error);
      throw new AppError("Failed to retrieve cart", 500);
    }
  }

  // 3. UPDATE QUANTITY (FIX BUG HARDCODED ID)
  async updateCartItem(
    cartItemId: number,
    userId: number,
    quantity: number
  ): Promise<any> {
    try {
      if (quantity <= 0) {
        throw new AppError("Quantity must be greater than 0", 400);
      }

      // Ambil CartItem dan cek kepemilikan
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          id: cartItemId,
          cart: { userId, deletedAt: null },
        },
        include: { cart: true },
      });

      if (!cartItem) {
        throw new AppError("Cart item not found", 404);
      }

      // Jika item statusnya soft-deleted, kita restore dulu
      if (cartItem.deletedAt) {
        await prisma.cartItem.update({
          where: { id: cartItemId },
          data: { deletedAt: null, quantity: quantity },
        });
      } else {
        // [UPDATE] Cek Stok menggunakan storeId MILIK ITEM TERSEBUT
        // (Mengambil dari database, bukan hardcoded 1 lagi)
        const productStock = await prisma.productStock.findFirst({
          where: {
            productId: cartItem.productId,
            storeId: cartItem.storeId, // <--- Bug Fix: Dinamis sesuai toko item
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

      // Return item yang sudah diupdate untuk frontend
      const updatedCartItem = await prisma.cartItem.findUnique({
        where: { id: cartItemId },
        include: {
          product: {
            include: {
              productImages: { where: { deletedAt: null }, take: 1 },
            },
          },
        },
      });

      return {
        cartItem: updatedCartItem,
        message: "Cart item updated successfully",
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("Update cart item error:", error);
      throw new AppError("Failed to update cart item", 500);
    }
  }

  // 4. REMOVE ITEM
  async removeCartItem(cartItemId: number, userId: number): Promise<void> {
    try {
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          id: cartItemId,
          cart: { userId },
          deletedAt: null,
        },
      });

      if (!cartItem) throw new AppError("Cart item not found", 404);

      await prisma.cartItem.update({
        where: { id: cartItemId },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to remove item from cart", 500);
    }
  }

  // 5. CLEAR CART (FILTERED)
  async clearCart(userId: number, storeId?: number): Promise<void> {
    try {
      const cart = await prisma.cart.findUnique({
        where: { userId },
      });

      if (!cart) throw new AppError("Cart not found", 404);

      // Siapkan filter
      const whereClause: any = {
        cartId: cart.id,
        deletedAt: null,
      };

      // [UPDATE] Jika storeId ada, hanya hapus item dari toko tsb
      if (storeId) {
        whereClause.storeId = storeId;
      }

      await prisma.cartItem.updateMany({
        where: whereClause,
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      console.error("Clear cart error:", error);
      throw new AppError("Failed to clear cart", 500);
    }
  }

  // 6. GET SUMMARY (Untuk Checkout)
  async getCartSummary(userId: number): Promise<any> {
    try {
      // NOTE: Untuk sementara kita ambil semua / default behavior.
      // Idealnya nanti checkout juga mengirim storeId.
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

      const totalWeight = cart.cartItems.reduce((total: number, item: any) => {
        return total + 1000 * item.quantity; // Default weight 1kg (bisa disesuaikan nanti)
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
          inStock: true,
          storeId: item.storeId, // [INFO] Sertakan storeId di summary
        })),
      };
    } catch (error) {
      console.error("Get cart summary error:", error);
      throw new AppError("Failed to get cart summary", 500);
    }
  }
  private async calculateDiscounts(cartItems: any[], storeIdFilter?: number) {
    if (!cartItems.length) return [];

    console.log(
      `[DEBUG DISCOUNT] Checking discounts for ${cartItems.length} items...`
    );

    // 1. Ambil ID semua produk di cart
    const productIds = cartItems.map((i) => i.productId);

    // 2. Cari Discount Rule yang AKTIF untuk produk-produk tersebut
    // Jika storeIdFilter ada (user lagi lihat cart toko tertentu), filter rule toko itu saja
    const whereClause: any = {
      productId: { in: productIds },
      is_active: true,
      deletedAt: null,
      startDate: { lte: new Date() }, // Pastikan sudah mulai
      endDate: { gte: new Date() }, // Pastikan belum berakhir
    };

    if (storeIdFilter) {
      whereClause.storeId = storeIdFilter;
    }

    const rules = await prisma.discountRule.findMany({
      where: whereClause,
    });

    console.log(
      `[DEBUG DISCOUNT] Found ${rules.length} active rules for Store ID: ${storeIdFilter}`
    );
    if (rules.length > 0) console.log("[DEBUG DISCOUNT] Rules:", rules);

    // 3. Map items dengan kalkulasi harga
    return cartItems.map((item) => {
      // Cari rule yang cocok untuk item ini (Product ID & Store ID cocok)
      const rule = rules.find(
        (r) => r.productId === item.productId && r.storeId === item.storeId
      );

      const originalPrice = item.product.defaultPrice;
      const originalTotal = originalPrice * item.quantity;
      let discountAmount = 0;

      // Logika hitung diskon (Sama dengan CheckoutService)
      if (rule) {
        // Cek Min Purchase
        if (originalTotal >= rule.minPurchase) {
          if (rule.type === "DIRECT_PERCENTAGE") {
            discountAmount = Math.round(
              (originalTotal * (rule.value || 0)) / 100
            );
            if (
              rule.maxDiscountAmount &&
              discountAmount > rule.maxDiscountAmount
            ) {
              discountAmount = rule.maxDiscountAmount;
            }
          } else if (rule.type === "DIRECT_NOMINAL") {
            discountAmount = rule.value || 0;
          } else if (rule.type === "BOGO") {
            // Logic Beli 1 Gratis 1 (Kelipatan 2)
            const freeUnits = Math.floor(item.quantity / 2);
            discountAmount = freeUnits * originalPrice;
          }
        }
      }

      // Safety: Diskon tidak boleh melebihi harga asli
      if (discountAmount > originalTotal) discountAmount = originalTotal;

      return {
        ...item,
        originalPrice: originalPrice,
        price: originalPrice, // Harga satuan dasar
        totalPrice: originalTotal - discountAmount, // Harga Akhir Item (Net)
        discountAmount: discountAmount, // Info potongan (untuk UI coret harga)
        appliedDiscount: rule
          ? { type: rule.type, name: rule.description }
          : null,
      };
    });
  }
}
