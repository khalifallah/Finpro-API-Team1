import { Request, Response, NextFunction } from "express";
import prisma from "../../libs/prisma";
import AppError from "../../errors/app.error";
import { responseBuilder } from "../../utils/response.builder";

export class OrderUserQueryController {
  async getUserOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const { page = 1, limit = 10, status } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const whereClause: any = {
        userId: req.user.id,
        deletedAt: null,
      };

      if (status && status !== "all") {
        whereClause.status = status;
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

  async getOrderDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const { orderId } = req.params;

      const order = await prisma.order.findFirst({
        where: {
          id: Number(orderId),
          userId: req.user.id,
          deletedAt: null,
        },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  productImages: {
                    where: { deletedAt: null },
                  },
                  category: true,
                },
              },
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true,
            },
          },
          userAddress: true,
          payment: true,
          userVoucher: {
            include: {
              voucher: true,
            },
          },
        },
      });

      if (!order) {
        throw new AppError("Order not found", 404);
      }

      res.status(200).json(
        responseBuilder(200, "Order details retrieved successfully", {
          order,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}
