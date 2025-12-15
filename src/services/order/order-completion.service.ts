import prisma from "../../libs/prisma";
import AppError from "../../errors/app.error";
import { OrderStatus } from "@prisma/client";

export class OrderCompletionService {
  // KONFIGURASI CONSTANT (Bisa dipindah ke .env nanti)
  private readonly LOYALTY_THRESHOLD = 5; // Setiap 5 order dapat reward
  private readonly SPENDING_THRESHOLD = 1000000; // Belanja > 1 Juta dapat reward

  // Pastikan Admin sudah membuat Voucher dengan Kode ini di Database!
  private readonly VOUCHER_CODE_LOYALTY = "LOYALTY-FREESHIP";
  private readonly VOUCHER_CODE_SPENDER = "BIG-SPENDER";

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

      await this.processRewards(userId, updatedOrder.totalAmount);

      return {
        success: true,
        message: "Order confirmed successfully",
        order: updatedOrder,
      };
    } catch (error) {
      console.error("Confirm order error:", error);
      // Jika errornya dari AppError (validasi), lempar ke controller
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to confirm order", 500);
    }
  }

  // --- HELPER METHODS UNTUK REWARD ---

  private async processRewards(userId: number, orderTotal: number) {
    try {
      // Jalankan paralel agar efisien
      await Promise.all([
        this.checkLoyaltyReward(userId),
        this.checkSpendingReward(userId, orderTotal),
      ]);
    } catch (error) {
      // Kita hanya log error reward, jangan sampai user gagal confirm order cuma gara-gara voucher gagal
      console.error("Failed to process rewards:", error);
    }
  }

  private async checkLoyaltyReward(userId: number) {
    const completedOrdersCount = await prisma.order.count({
      where: {
        userId: userId,
        status: OrderStatus.CONFIRMED,
      },
    });

    if (
      completedOrdersCount > 0 &&
      completedOrdersCount % this.LOYALTY_THRESHOLD === 0
    ) {
      await this.giveVoucherToUser(
        userId,
        this.VOUCHER_CODE_LOYALTY,
        "Loyalty Reward (5th Order)"
      );
    }
  }

  private async checkSpendingReward(userId: number, totalAmount: number) {
    if (totalAmount >= this.SPENDING_THRESHOLD) {
      await this.giveVoucherToUser(
        userId,
        this.VOUCHER_CODE_SPENDER,
        "High Spender Reward"
      );
    }
  }

  // C. Fungsi Generik Memberikan Voucher
  private async giveVoucherToUser(
    userId: number,
    voucherCode: string,
    source: string
  ) {
    // 1. Cari Template Voucher di DB
    const templateVoucher = await prisma.voucher.findUnique({
      where: { code: voucherCode },
    });

    if (!templateVoucher) {
      console.warn(
        `[REWARD] Template voucher '${voucherCode}' not found. Cannot give reward.`
      );
      return;
    }

    // 2. Berikan ke User
    // Expired date: Default 30 hari dari sekarang
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.userVoucher.create({
      data: {
        userId: userId,
        voucherId: templateVoucher.id,
        isUsed: false,
      },
    });

    console.log(
      `[REWARD] User ${userId} received voucher ${voucherCode} via ${source}`
    );
  }
}
