import prisma from "../../libs/prisma";
import AppError from "../../errors/app.error";
import { OrderStatus, PaymentStatus } from "../../generated/prisma-client";

export interface CancelOrderData {
  orderId: number;
  userId: number;
  reason: string;
}

export class OrderCancellationService {
  async cancelOrder(data: CancelOrderData) {
    const order = await prisma.order.findFirst({
      where: {
        id: data.orderId,
        userId: data.userId,
        deletedAt: null,
      },
      include: {
        payment: true,
        orderItems: true,
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (
      order.status !== OrderStatus.PENDING_PAYMENT &&
      order.status !== OrderStatus.PENDING_CONFIRMATION
    ) {
      throw new AppError(
        "Order can only be cancelled before payment is made",
        400
      );
    }

    if (order.payment?.status === PaymentStatus.CONFIRMED) {
      throw new AppError("Cannot cancel order with confirmed payment", 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });

      await this.restoreStock(tx, order.orderItems, order.storeId, order.id);

      if (order.userVoucherId) {
        await tx.userVoucher.update({
          where: { id: order.userVoucherId },
          data: { isUsed: false },
        });
      }
    });

    return { success: true };
  }

  private async restoreStock(
    tx: any,
    orderItems: any[],
    storeId: number,
    orderId: number
  ) {
    for (const orderItem of orderItems) {
      const productStock = await tx.productStock.findFirst({
        where: {
          productId: orderItem.productId,
          storeId,
          deletedAt: null,
        },
      });

      if (productStock) {
        await tx.productStock.update({
          where: { id: productStock.id },
          data: {
            quantity: productStock.quantity + orderItem.quantity,
          },
        });

        await tx.stockJournal.create({
          data: {
            productStockId: productStock.id,
            orderId,
            quantityChange: orderItem.quantity,
            reason: "order_cancelled",
          },
        });
      }
    }
  }
}
