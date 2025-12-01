import prisma from "../../libs/prisma";
import AppError from "../../errors/app.error";
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../../generated/prisma-client";

export interface CreateOrderData {
  userId: number;
  userAddressId: number;
  shippingMethod: string;
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
  async createOrder(data: CreateOrderData) {
    return await prisma.$transaction(async (tx) => {
      const cart = await this.getUserCart(tx, data.userId);
      const userAddress = await this.getUserAddress(
        tx,
        data.userAddressId,
        data.userId
      );
      const nearestStore = await this.findNearestStore(tx);

      const { subtotal, orderItems } = await this.processCartItems(
        tx,
        cart.cartItems,
        nearestStore.id
      );

      const { discountAmount, userVoucherId } = await this.processVoucher(
        tx,
        data.voucherCode,
        data.userId,
        subtotal
      );

      const shippingCost = this.calculateShippingCost(
        data.shippingMethod,
        subtotal
      );
      const totalAmount = subtotal + shippingCost - discountAmount;

      const order = await this.createOrderRecord(tx, {
        userId: data.userId,
        storeId: nearestStore.id,
        userAddressId: userAddress.id,
        addressSnapshot: JSON.stringify(userAddress),
        subtotal,
        shippingCost,
        discountAmount,
        totalAmount,
        userVoucherId,
        orderItems,
      });

      await this.updateStockAndCreateJournals(
        tx,
        cart.cartItems,
        nearestStore.id,
        order.id
      );

      await this.clearCart(tx, cart.id);

      if (userVoucherId) {
        await this.markVoucherAsUsed(tx, userVoucherId);
      }

      return {
        order,
        paymentDeadline: order.paymentDeadline,
      };
    });
  }

  // Private helper methods for order creation
  private async getUserCart(tx: any, userId: number) {
    const cart = await tx.cart.findFirst({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        cartItems: {
          include: {
            product: {
              include: {
                productStocks: {
                  where: { deletedAt: null },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.cartItems.length === 0) {
      throw new AppError("Cart is empty", 400);
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

  private async findNearestStore(tx: any) {
    const nearestStore = await tx.store.findFirst({
      where: {
        deletedAt: null,
      },
      orderBy: {
        id: "asc",
      },
    });

    if (!nearestStore) {
      throw new AppError("No store available to fulfill order", 400);
    }

    return nearestStore;
  }

  private async processCartItems(tx: any, cartItems: any[], storeId: number) {
    let subtotal = 0;
    const orderItems = [];

    for (const cartItem of cartItems) {
      const productStock = await tx.productStock.findFirst({
        where: {
          productId: cartItem.productId,
          storeId,
          deletedAt: null,
        },
      });

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
        paymentDeadline: new Date(Date.now() + 60 * 60 * 1000),
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
            quantity: productStock.quantity - cartItem.quantity,
          },
        });

        await tx.stockJournal.create({
          data: {
            productStockId: productStock.id,
            orderId,
            quantityChange: -cartItem.quantity,
            reason: "order_created",
          },
        });
      }
    }
  }

  private async clearCart(tx: any, cartId: number) {
    await tx.cartItem.deleteMany({
      where: { cartId },
    });
  }

  private async markVoucherAsUsed(tx: any, userVoucherId: number) {
    await tx.userVoucher.update({
      where: { id: userVoucherId },
      data: { isUsed: true },
    });
  }

  private calculateShippingCost(method: string, subtotal: number): number {
    const baseCost = 15000;

    if (method === "express") {
      return baseCost * 1.5;
    } else if (method === "same_day") {
      return baseCost * 2;
    }

    return baseCost;
  }
}
