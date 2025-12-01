import { Request, Response, NextFunction } from "express";
import AppError from "../../errors/app.error";
import { responseBuilder } from "../../utils/response.builder";
import { OrderCreationService } from "../../services/order/order-creation.service";
import { OrderCancellationService } from "../../services/order/order-cancellation.service";

export class OrderUserMutationController {
  private orderCreationService: OrderCreationService;
  private orderCancellationService: OrderCancellationService;

  constructor() {
    this.orderCreationService = new OrderCreationService();
    this.orderCancellationService = new OrderCancellationService();
  }

  async createOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const { userAddressId, shippingMethod, voucherCode, notes } = req.body;

      const result = await this.orderCreationService.createOrder({
        userId: req.user.id,
        userAddressId,
        shippingMethod,
        voucherCode,
        notes,
      });

      res
        .status(201)
        .json(responseBuilder(201, "Order created successfully", result));
    } catch (error) {
      next(error);
    }
  }

  async cancelOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const { orderId } = req.params;
      const { reason } = req.body;

      await this.orderCancellationService.cancelOrder({
        orderId: Number(orderId),
        userId: req.user.id,
        reason,
      });

      res
        .status(200)
        .json(responseBuilder(200, "Order cancelled successfully", {}));
    } catch (error) {
      next(error);
    }
  }
}
