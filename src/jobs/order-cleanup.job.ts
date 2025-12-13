import cron from "node-cron";
import prisma from "../libs/prisma";
import { OrderStatus } from "@prisma/client";

export class OrderCleanupJob {
  public start() {
    // Jalankan setiap 1 menit: "* * * * *"
    cron.schedule("* * * * *", async () => {
      console.log("Running Order Cleanup Job: Checking expired orders...");
      await this.processExpiredOrders();
      await this.processAutoCompleteOrders();
    });
  }

  private async processExpiredOrders() {
    try {
      // 1. Cari Order yang kadaluwarsa
      // Status: PENDING_PAYMENT
      // Deadline: Kurang dari waktu sekarang (Sudah lewat)
      const expiredOrders = await prisma.order.findMany({
        where: {
          status: OrderStatus.PENDING_PAYMENT,
          paymentDeadline: {
            lt: new Date(), // Less Than Now
          },
          deletedAt: null,
        },
        include: {
          orderItems: true,
        },
      });

      if (expiredOrders.length === 0) return;

      console.log(
        `Found ${expiredOrders.length} expired orders. Processing...`
      );

      // 2. Proses pembatalan satu per satu
      for (const order of expiredOrders) {
        await this.cancelOrder(order);
      }
    } catch (error) {
      console.error("Error in Order Cleanup Job:", error);
    }
  }

  private async processAutoCompleteOrders() {
    try {
      // Hitung tanggal 7 hari yang lalu
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const shippedOrders = await prisma.order.findMany({
        where: {
          status: OrderStatus.SHIPPED, // Hanya yang sedang dikirim
          updatedAt: { lt: sevenDaysAgo }, // Yang diupdate (dikirim) > 7 hari lalu
          deletedAt: null,
        },
      });

      if (shippedOrders.length > 0) {
        console.log(
          `Found ${shippedOrders.length} shipped orders > 7 days. Completing...`
        );

        // Update massal (Batch Update) karena tidak ada logika stok rumit
        const result = await prisma.order.updateMany({
          where: {
            id: { in: shippedOrders.map((o) => o.id) },
          },
          data: {
            status: OrderStatus.CONFIRMED, //
            updatedAt: new Date(),
          },
        });

        console.log(`Auto-completed ${result.count} orders.`);
      }
    } catch (error) {
      console.error("Error in Auto-Complete Job:", error);
    }
  }

  // Logika pembatalan (Mirip CancellationService tapi versi System)
  private async cancelOrder(order: any) {
    try {
      await prisma.$transaction(async (tx) => {
        // A. Update Status Order -> CANCELLED
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CANCELLED,
            updatedAt: new Date(),
          },
        });

        // B. Kembalikan Stok (Restore Stock)
        for (const item of order.orderItems) {
          const productStock = await tx.productStock.findFirst({
            where: {
              productId: item.productId,
              storeId: order.storeId,
            },
          });

          if (productStock) {
            // Tambah stok kembali
            await tx.productStock.update({
              where: { id: productStock.id },
              data: { quantity: productStock.quantity + item.quantity },
            });

            // Catat Jurnal (PENTING untuk Laporan)
            await tx.stockJournal.create({
              data: {
                productStockId: productStock.id,
                orderId: order.id,
                quantityChange: item.quantity, // Positif (Nambah)
                reason: "system_auto_cancel_expired", // Alasan jelas
              },
            });
          }
        }

        // C. Kembalikan Voucher jika dipakai
        if (order.userVoucherId) {
          await tx.userVoucher.update({
            where: { id: order.userVoucherId },
            data: { isUsed: false },
          });
        }
      });

      console.log(`Order #${order.id} auto-cancelled successfully.`);
    } catch (err) {
      console.error(`Failed to auto-cancel order #${order.id}:`, err);
    }
  }
}
