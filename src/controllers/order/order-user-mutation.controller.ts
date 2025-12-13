import { Request, Response, NextFunction } from "express";
import AppError from "../../errors/app.error";
import { responseBuilder } from "../../utils/response.builder";
import { OrderCreationService } from "../../services/order/order-creation.service";
import { OrderCancellationService } from "../../services/order/order-cancellation.service";
import { OrderPaymentService } from "../../services/order/order-payment.service";
import { OrderCompletionService } from "../../services/order/order-completion.service";

export class OrderUserMutationController {
  private orderCreationService: OrderCreationService;
  private orderCancellationService: OrderCancellationService;
  private orderPaymentService: OrderPaymentService;
  private orderCompletionService: OrderCompletionService;

  constructor() {
    this.orderCreationService = new OrderCreationService();
    this.orderCancellationService = new OrderCancellationService();
    this.orderPaymentService = new OrderPaymentService();
    this.orderCompletionService = new OrderCompletionService();
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

      const {
        userAddressId,
        shippingMethod,
        voucherCode,
        notes,
        storeId,
        cartItemIds,
      } = req.body;

      const result = await this.orderCreationService.createOrder({
        userId: req.user.id,
        userAddressId,
        shippingMethod,
        voucherCode,
        notes,
        storeId, // Pass ke service
        cartItemIds, // Pass ke service
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

  async uploadPaymentProof(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401);
      }

      const { orderId } = req.params;
      const file = req.file; // File didapat dari middleware Multer

      if (!file) {
        throw new AppError("Payment proof image is required", 400);
      }

      const result = await this.orderPaymentService.uploadPaymentProof(
        req.user.id,
        Number(orderId),
        file
      );

      res
        .status(200)
        .json(
          responseBuilder(200, "Payment proof uploaded successfully", result)
        );
    } catch (error) {
      next(error);
    }
  }

  async confirmOrderReceived(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw new AppError("User not authenticated", 401);

      const { orderId } = req.params;

      const result = await this.orderCompletionService.confirmOrderReceived(
        req.user.id,
        Number(orderId)
      );

      res
        .status(200)
        .json(responseBuilder(200, "Order confirmed received", result));
    } catch (error) {
      next(error);
    }
  }
}
