import { OrderUserQueryController } from "./order-user-query.controller";
import { OrderUserMutationController } from "./order-user-mutation.controller";

// Create instances
const orderUserQueryController = new OrderUserQueryController();
const orderUserMutationController = new OrderUserMutationController();

export class OrderUserController {
  // Query methods
  async getUserOrders(req: any, res: any, next: any) {
    return orderUserQueryController.getUserOrders(req, res, next);
  }

  async getOrderDetail(req: any, res: any, next: any) {
    return orderUserQueryController.getOrderDetail(req, res, next);
  }

  // Mutation methods
  async createOrder(req: any, res: any, next: any) {
    return orderUserMutationController.createOrder(req, res, next);
  }

  async cancelOrder(req: any, res: any, next: any) {
    return orderUserMutationController.cancelOrder(req, res, next);
  }

  async uploadPaymentProof(req: any, res: any, next: any) {
    return orderUserMutationController.uploadPaymentProof(req, res, next);
  }
}
