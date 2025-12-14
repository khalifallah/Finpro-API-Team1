// src/services/order/order-creation.service.ts

import prisma from "../../libs/prisma";
import AppError from "../../errors/app.error";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { ShippingService } from "../shipping.service";

export interface CreateOrderData {
  userId: number;
  userAddressId: number;
  shippingMethod: string;
  storeId: number;
  cartItemIds: number[];
  voucherCode?: string;
  notes?: string;
}

export interface ProcessedOrderData {
  userId: number;
  storeId: number;
  userAddressId: number;
  addressSnapshot: string;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  userVoucherId?: number;
  orderItems: any[];
}

export class OrderCreationService {
  private shippingService: ShippingService;

  constructor() {
    this.shippingService = new ShippingService();
  }

  async createOrder(data: CreateOrderData) {
    return await prisma.$transaction(async (tx) => {
      // 1. Validasi Store
      const store = await tx.store.findUnique({
        where: { id: data.storeId, deletedAt: null },
      });

      if (!store) {
        throw new AppError("Store not found or inactive", 404);
      }

      // 2. Ambil Cart Item KHUSUS untuk Store tersebut
      const cart = await this.getUserCart(
        tx,
        data.userId,
        data.storeId,
        data.cartItemIds
      );
      const userAddress = await this.getUserAddress(
        tx,
        data.userAddressId,
        data.userId
      );

      // 3. Proses Item (Hitung Subtotal & Cek Stok)
      // Kita pakai store.id yang dikirim dari frontend
      const { subtotal, orderItems } = await this.processCartItems(
        tx,
        cart.cartItems,
        store.id
      );

      // 4. Proses Voucher
      const { discountAmount, userVoucherId } = await this.processVoucher(
        tx,
        data.voucherCode,
        data.userId,
        subtotal
      );

      // 5. Hitung Shipping Cost
      // Logic lama: findNearestStore -> SALAH (Bisa jadi beda dengan toko yang dipilih)
      // Logic baru: Gunakan data.storeId langsung

      let totalWeight = 0;
      for (const item of cart.cartItems) {
        totalWeight += 1000 * item.quantity; // Default 1000g (todo: ambil dari product.weight)
      }

      const shippingResult =
        await this.shippingService.calculateShippingForCheckout(
          data.storeId, // Use the storeId from request, not find nearest
          userAddress,
          totalWeight,
          data.shippingMethod
        );

      const shippingCost = shippingResult.totalShippingCost;
      const totalAmount = subtotal + shippingCost - discountAmount;

      // 6. Buat Record Order
      const order = await this.createOrderRecord(tx, {
        userId: data.userId,
        storeId: store.id,
        userAddressId: userAddress.id,
        addressSnapshot: JSON.stringify({
          ...userAddress,
          distance: shippingResult.distance,
          shippingMethod: data.shippingMethod,
          storeName: store.name, // Opsional: simpan nama toko di snapshot
          storeAddress: store.address,
        }),
        subtotal,
        shippingCost,
        discountAmount,
        totalAmount,
        userVoucherId,
        orderItems,
      });

      // --- Minimal: apply discount rules associated with products and record usages ---
      try {
        const productIds = orderItems.map((it) => it.productId);
        if (productIds.length > 0) {
          const applicableRules = await tx.discountRule.findMany({
            where: {
              productId: { in: productIds },
              storeId: store.id,
              is_active: true,
              deletedAt: null,
            },
          });

          let totalRuleDiscount = 0;
          // Compute discounts per matching order item, respecting rule constraints
          for (const rule of applicableRules) {
            const item = orderItems.find((oi) => oi.productId === rule.productId);
            if (!item) continue;

            const itemTotal = (item.priceAtPurchase || 0) * (item.quantity || 0);

            // Respect minimum purchase amount on rule (if defined)
            if (rule.minPurchase && itemTotal < rule.minPurchase) {
              continue;
            }

            let ruleAmount = 0;
            if (rule.type === "DIRECT_PERCENTAGE") {
              ruleAmount = Math.min(
                itemTotal * (rule.value! / 100),
                rule.maxDiscountAmount || Number.MAX_SAFE_INTEGER
              );
            } else if (rule.type === "DIRECT_NOMINAL") {
              ruleAmount = Math.min(rule.value || 0, itemTotal);
            } else if (rule.type === "BOGO") {
              // Give one free unit for every two units (buy 1 get 1)
              if ((item.quantity || 0) >= 2) {
                const freeUnits = Math.floor((item.quantity || 0) / 2);
                ruleAmount = freeUnits * (item.priceAtPurchase || 0);
              }
            }

            if (ruleAmount <= 0) continue;

            // Record usage for this discount rule
            await tx.discountUsage.create({
              data: {
                discountRuleId: rule.id,
                orderId: order.id,
                amount: ruleAmount,
              },
            });

            totalRuleDiscount += ruleAmount;
          }

          if (totalRuleDiscount > 0) {
            // Update order totals to include discount from rules
            const newDiscount = (order.discountAmount || 0) + totalRuleDiscount;
            const newTotal = (order.totalAmount || 0) - totalRuleDiscount;
            await tx.order.update({
              where: { id: order.id },
              data: { discountAmount: newDiscount, totalAmount: newTotal },
            });
          }
        }
      } catch (e) {
        // Non-fatal: do not break order creation on discount application failure
        console.error("Failed to apply discount rules during order creation:", e);
      }

      // 7. Potong Stok
      await this.updateStockAndCreateJournals(
        tx,
        cart.cartItems,
        store.id,
        order.id
      );

      // 8. Bersihkan Cart (Hanya item yang dicheckout)
      await this.clearCart(tx, cart.id, cart.cartItems);

      // 9. Tandai Voucher Terpakai
      if (userVoucherId) {
        await this.markVoucherAsUsed(tx, userVoucherId);
      }

      return {
        order,
        paymentDeadline: order.paymentDeadline,
      };
    });
  }

  // --- HELPER METHODS ---

  // [UPDATE] Filter cart items by storeId
  private async getUserCart(
    tx: any,
    userId: number,
    storeId: number,
    cartItemIds: number[]
  ) {
    const cart = await tx.cart.findFirst({
      where: {
        userId,
      },
      include: {
        cartItems: {
          where: {
            deletedAt: null,
            storeId: storeId,
            // [LOGIC BARU] Hanya ambil item yang ID-nya ada di list cartItemIds
            id: { in: cartItemIds },
          },
          include: {
            product: {
              include: {
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

    if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
      throw new AppError("Selected items not found in cart", 400);
    }

    return cart;
  }

  private async getUserAddress(tx: any, addressId: number, userId: number) {
    const userAddress = await tx.userAddress.findFirst({
      where: {
        id: addressId,
        userId,
        deletedAt: null,
      },
    });

    if (!userAddress) {
      throw new AppError("Shipping address not found", 404);
    }

    return userAddress;
  }

  // Method findNearestStore dihapus karena storeId sudah ditentukan dari input

  private async processCartItems(tx: any, cartItems: any[], storeId: number) {
    let subtotal = 0;
    const orderItems = [];

    for (const cartItem of cartItems) {
      // Ambil stok dari relasi yang sudah di-include di getUserCart
      // Array productStocks harusnya cuma isi 1 (milik toko tsb)
      const productStock = cartItem.product.productStocks[0];

      if (!productStock || productStock.quantity < cartItem.quantity) {
        throw new AppError(
          `Insufficient stock for product: ${cartItem.product.name}`,
          400
        );
      }

      const itemTotal = cartItem.product.defaultPrice * cartItem.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: cartItem.productId,
        productNameSnapshot: cartItem.product.name,
        priceAtPurchase: cartItem.product.defaultPrice,
        quantity: cartItem.quantity,
      });
    }

    return { subtotal, orderItems };
  }

  private async processVoucher(
    tx: any,
    voucherCode: string | undefined,
    userId: number,
    subtotal: number
  ) {
    let discountAmount = 0;
    let userVoucherId = undefined;

    if (voucherCode) {
      const userVoucher = await tx.userVoucher.findFirst({
        where: {
          user: { id: userId },
          voucher: {
            code: voucherCode,
            is_active: true,
            expiresAt: { gt: new Date() },
          },
          isUsed: false,
          deletedAt: null,
        },
        include: { voucher: true },
      });

      if (!userVoucher) {
        throw new AppError("Invalid or expired voucher", 400);
      }

      // Validasi minimum purchase jika ada (opsional)
      // if (userVoucher.voucher.minPurchase && subtotal < userVoucher.voucher.minPurchase) ...

      if (userVoucher.voucher.type === "PERCENTAGE") {
        discountAmount = Math.min(
          (subtotal * userVoucher.voucher.value) / 100,
          userVoucher.voucher.maxDiscountAmount || Number.MAX_SAFE_INTEGER
        );
      } else {
        discountAmount = Math.min(userVoucher.voucher.value, subtotal);
      }

      userVoucherId = userVoucher.id;
    }

    return { discountAmount, userVoucherId };
  }

  private async createOrderRecord(tx: any, orderData: ProcessedOrderData) {
    const order = await tx.order.create({
      data: {
        userId: orderData.userId,
        storeId: orderData.storeId,
        userAddressId: orderData.userAddressId,
        addressSnapshot: orderData.addressSnapshot,
        subtotal: orderData.subtotal,
        shippingCost: orderData.shippingCost,
        discountAmount: orderData.discountAmount,
        totalAmount: orderData.totalAmount,
        userVoucherId: orderData.userVoucherId,
        status: OrderStatus.PENDING_PAYMENT,
        paymentDeadline: new Date(Date.now() + 60 * 60 * 1000), // 1 Jam
        orderItems: {
          create: orderData.orderItems,
        },
      },
      include: {
        orderItems: {
          include: { product: true },
        },
        store: true,
        userAddress: true,
      },
    });

    await tx.payment.create({
      data: {
        orderId: order.id,
        paymentMethod: PaymentMethod.MANUAL_TRANSFER,
        status: PaymentStatus.PENDING,
      },
    });

    return order;
  }

  private async updateStockAndCreateJournals(
    tx: any,
    cartItems: any[],
    storeId: number,
    orderId: number
  ) {
    for (const cartItem of cartItems) {
      const productStock = await tx.productStock.findFirst({
        where: {
          productId: cartItem.productId,
          storeId,
          deletedAt: null,
        },
      });

      if (productStock) {
        await tx.productStock.update({
          where: { id: productStock.id },
          data: {
            quantity: { decrement: cartItem.quantity },
          },
        });

        await tx.stockJournal.create({
          data: {
            productStockId: productStock.id,
            orderId,
            quantityChange: -cartItem.quantity,
            reason: "order_created",
            // Tambahkan storeId jika ada di schema journal
          },
        });
      }
    }
  }

  private async clearCart(tx: any, cartId: number, processedItems: any[]) {
    // Ambil ID dari item yang SUDAH diproses menjadi order
    const processedItemIds = processedItems.map((item) => item.id);

    // Hapus (Soft Delete) hanya item tersebut
    // Item dari toko lain di cart yang sama akan TETAP ADA (Safe)
    await tx.cartItem.updateMany({
      where: {
        cartId: cartId,
        id: { in: processedItemIds },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  private async markVoucherAsUsed(tx: any, userVoucherId: number) {
    await tx.userVoucher.update({
      where: { id: userVoucherId },
      data: { isUsed: true },
    });
  }
}
