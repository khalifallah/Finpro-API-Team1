import { Request, Response, NextFunction } from "express";
import prisma from "../../libs/prisma";
import AppError from "../../errors/app.error";
import { responseBuilder } from "../../utils/response.builder";
import { OrderCancellationService } from "../../services/order/order-cancellation.service";
import { OrderStatus, PaymentStatus } from "../../generated/prisma-client";
import { EmailService } from "../../services/email.service";

export class OrderAdminController {
  private ordercancellationService: OrderCancellationService;
  private emailService: EmailService;

  constructor() {
    this.ordercancellationService = new OrderCancellationService();
    this.emailService = new EmailService();
  }

  async getAllOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const { page = 1, limit = 10, status, storeId } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const whereClause: any = {
        deletedAt: null,
      };

      if (status && status !== "all") {
        whereClause.status = status;
      }

      if (storeId && req.user.role === "SUPER_ADMIN") {
        whereClause.storeId = Number(storeId);
      } else if (req.user.role === "STORE_ADMIN" && req.user.storeId) {
        whereClause.storeId = req.user.storeId;
      }

      const orders = await prisma.order.findMany({
        where: whereClause,
        include: {
          orderItems: {
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
          store: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          userAddress: true,
          payment: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: Number(limit),
      });

      const totalOrders = await prisma.order.count({
        where: whereClause,
      });

      res.status(200).json(
        responseBuilder(200, "Orders retrieved successfully", {
          orders,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalOrders,
            pages: Math.ceil(totalOrders / Number(limit)),
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  async updateOrderStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const { orderId } = req.params;
      const { status, adminNotes } = req.body;

      const order = await prisma.order.findFirst({
        where: {
          id: Number(orderId),
          deletedAt: null,
        },
        include: {
          store: true,
          payment: true,
          user: true,
        },
      });

      if (!order) {
        throw new AppError("Order not found", 404);
      }

      if (
        req.user.role === "STORE_ADMIN" &&
        order.storeId !== req.user.storeId
      ) {
        throw new AppError("Access denied to this order", 403);
      }

      if (status === OrderStatus.CANCELLED) {
        await this.ordercancellationService.cancelOrder({
          orderId: order.id,
          userId: order.userId,
          reason: adminNotes || "Cancelled by admin",
        });

        this.sendNotificationEmail(order, OrderStatus.CANCELLED).catch(
          console.error
        );

        res
          .status(200)
          .json(responseBuilder(200, "Order cancelled & stock restored", null));
        return;
      }

      const updatedOrder = await prisma.$transaction(async (tx) => {
        if (status === OrderStatus.PROCESSING) {
          if (order.payment) {
            await tx.payment.update({
              where: { id: order.payment.id },
              data: { status: PaymentStatus.CONFIRMED },
            });
          }
        } else if (status === OrderStatus.PENDING_PAYMENT) {
          if (order.payment) {
            await tx.payment.update({
              where: { id: order.payment.id },
              data: { status: PaymentStatus.REJECTED },
            });
          }
        }

        return await tx.order.update({
          where: { id: order.id },
          data: { status },
          include: {
            orderItems: { include: { product: true } },
            user: { select: { id: true, fullName: true, email: true } },
            payment: true,
          },
        });
      });

      this.sendNotificationEmail(order, status).catch((err) => {
        console.error("Failed to send order status email:", err);
      });

      res.status(200).json(
        responseBuilder(200, "Order status updated successfully", {
          order: updatedOrder,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  // Helper yang kita bahas sebelumnya
  private async sendNotificationEmail(order: any, newStatus: string) {
    const userEmail = order.user.email;
    const userName = order.user.fullName;
    let subject = "";
    let message = "";
    let displayStatus = "";

    switch (newStatus) {
      case OrderStatus.PROCESSING:
        subject = "Pembayaran Diterima";
        message =
          "Terima kasih! Pembayaran Anda telah kami terima. Tim kami sedang menyiapkan pesanan Anda.";
        displayStatus = "Diproses";
        break;

      case OrderStatus.PENDING_PAYMENT: // Rejected
        subject = "Bukti Pembayaran Ditolak";
        message =
          "Mohon maaf, bukti pembayaran Anda tidak dapat kami verifikasi. Silakan upload ulang bukti yang jelas.";
        displayStatus = "Menunggu Pembayaran Ulang";
        break;

      case OrderStatus.SHIPPED:
        subject = "Pesanan Dikirim";
        message =
          "Kabar baik! Pesanan Anda sudah diserahkan ke kurir pengiriman.";
        displayStatus = "Sedang Dikirim";
        break;

      case OrderStatus.CANCELLED:
        subject = "Pesanan Dibatalkan";
        message =
          "Mohon maaf, pesanan Anda telah dibatalkan. Jika Anda sudah melakukan pembayaran, dana akan kami proses untuk pengembalian (refund).";
        displayStatus = "Dibatalkan";
        break;

      default:
        return;
    }

    // Panggil Service yang baru kita update
    await this.emailService.sendOrderStatusEmail(
      userEmail,
      userName,
      order.id,
      order.totalAmount,
      displayStatus, // Status yang enak dibaca user
      subject,
      message
    );
  }
}
