import { OrderUserController } from "./order-user.controller";
import { OrderAdminController } from "./order-admin.controller";

// Create instances for proper binding
const orderUserController = new OrderUserController();
const orderAdminController = new OrderAdminController();

export class OrderController {
  // User order methods - use instance methods directly
  static async getUserOrders(req: any, res: any, next: any) {
    return orderUserController.getUserOrders(req, res, next);
  }

  static async getOrderDetail(req: any, res: any, next: any) {
    return orderUserController.getOrderDetail(req, res, next);
  }

  static async createOrder(req: any, res: any, next: any) {
    return orderUserController.createOrder(req, res, next);
  }

  static async cancelOrder(req: any, res: any, next: any) {
    return orderUserController.cancelOrder(req, res, next);
  }

  static async uploadPaymentProof(req: any, res: any, next: any) {
    return orderUserController.uploadPaymentProof(req, res, next);
  }

  static async confirmOrderReceived(req: any, res: any, next: any) {
    return orderUserController.confirmOrderReceived(req, res, next);
  }

  // Admin order methods
  static async getAllOrders(req: any, res: any, next: any) {
    return orderAdminController.getAllOrders(req, res, next);
  }

  static async getAdminOrderDetail(req: any, res: any, next: any) {
    return orderAdminController.getOrderDetail(req, res, next);
  }

  static async updateOrderStatus(req: any, res: any, next: any) {
    return orderAdminController.updateOrderStatus(req, res, next);
  }
}
