import prisma from "../../libs/prisma";
import AppError from "../../errors/app.error";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { EmailService } from "../email.service";

export interface CancelOrderData {
  orderId: number;
  userId: number;
  reason: string;
  role: "USER" | "ADMIN";
}

export class OrderCancellationService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }
  async cancelOrder(data: CancelOrderData) {
    // 1. Cari Order beserta User dan Store untuk data email
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: {
        payment: true,
        orderItems: true,
        user: true,
        store: {
          include: { users: true },
        },
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    // 2. Validasi Status (Hanya boleh cancel jika belum dikirim/selesai)
    if (
      order.status === OrderStatus.SHIPPED ||
      order.status === OrderStatus.CONFIRMED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new AppError("Cannot cancel this order in current status", 400);
    }

    // 3. Proses Database (Hanya Update Status & Balikin Stok)
    // KITA TIDAK MENYIMPAN REASON DI SINI
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

    // 4. KIRIM EMAIL (Reason dipakai di sini)
    // Jika ADMIN yang cancel -> Kirim email ke USER
    if (data.role === "ADMIN") {
      await this.emailService.sendCancellationEmail({
        to: order.user.email,
        subject: `Order #${order.id} Cancelled by Store`,
        userName: order.user.fullName,
        orderId: order.id,
        orderDate: order.createdAt,
        reason: data.reason,
        cancelledBy: "Store Admin",
      });
    }
    // Jika USER yang cancel -> Kirim email ke STORE ADMIN
    else if (data.role === "USER") {
      // Asumsi kita kirim ke email pemilik toko
      // Jika tabel store tidak punya email langsung, ambil dari relasi user-nya
      const storeAdmin = order.store?.users?.[0];
      const storeEmail = storeAdmin?.email;
      if (storeEmail) {
        await this.emailService.sendCancellationEmail({
          to: storeEmail,
          subject: `Order #${order.id} Cancelled by Customer`,
          userName: "Store Admin",
          orderId: order.id,
          orderDate: order.createdAt,
          reason: data.reason,
          cancelledBy: "Customer",
        });
      }
    }

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
