import prisma from "../../libs/prisma";
import AppError from "../../errors/app.error";
import { OrderStatus } from "../../generated/prisma-client";
import { cloudinaryUpload } from "../../utils/cloudinary.utils";

export class OrderPaymentService {
  async uploadPaymentProof(
    userId: number,
    orderId: number,
    file: Express.Multer.File
  ) {
    // 1. Validasi Input
    if (!file) {
      throw new AppError("Please upload a payment proof image", 400);
    }

    // 2. Cari Order & Payment terkait
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    // 3. Validasi Order
    if (!order) {
      throw new AppError("Order not found", 404);
    }

    // Cek Kepemilikan (Security)
    if (order.userId !== userId) {
      throw new AppError("Unauthorized to update this order", 403);
    }

    // Cek Status: Hanya boleh upload jika status PENDING_PAYMENT
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new AppError(
        `Cannot upload payment proof. Current status: ${order.status}`,
        400
      );
    }

    try {
      // 4. Upload ke Cloudinary
      // Asumsi fungsi ini mengembalikan object { secure_url: string }
      const uploadResult = await cloudinaryUpload(file);
      const imageUrl = uploadResult.secure_url;

      // 5. Update Database (Transaction)
      // Kita update Payment URL dan Status Order sekaligus agar konsisten
      const updatedOrder = await prisma.$transaction(async (tx) => {
        // Update tabel Payment
        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: {
              paymentProofUrl: imageUrl,
              // Status payment masih PENDING sampai Admin mengkonfirmasi
            },
          });
        } else {
          throw new AppError("Payment record not found for this order", 500);
        }

        // Update tabel Order -> MENUNGGU KONFIRMASI
        return await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.PENDING_CONFIRMATION,
            updatedAt: new Date(),
          },
          include: {
            payment: true,
            orderItems: {
              include: { product: true },
            },
          },
        });
      });

      return updatedOrder;
    } catch (error) {
      console.error("Upload payment proof error:", error);
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to process payment proof upload", 500);
    }
  }
}
