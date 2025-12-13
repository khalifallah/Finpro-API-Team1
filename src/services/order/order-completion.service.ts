import prisma from "../../libs/prisma";
import AppError from "../../errors/app.error";
import { OrderStatus } from "@prisma/client";

export class OrderCompletionService {
  async confirmOrderReceived(userId: number, orderId: number) {
    // 1. Cari Order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    // 2. Cek Kepemilikan
    if (order.userId !== userId) {
      throw new AppError("Unauthorized to confirm this order", 403);
    }

    // 3. Validasi Status
    // User HANYA boleh konfirmasi jika statusnya 'SHIPPED' (Dikirim)
    if (order.status !== OrderStatus.SHIPPED) {
      throw new AppError(
        `Cannot confirm order. Current status is ${order.status}. Order must be SHIPPED first.`,
        400
      );
    }

    try {
      // 4. Update Status jadi CONFIRMED
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CONFIRMED,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message: "Order confirmed successfully",
        order: updatedOrder,
      };
    } catch (error) {
      console.error("Confirm order error:", error);
      throw new AppError("Failed to confirm order", 500);
    }
  }
}
