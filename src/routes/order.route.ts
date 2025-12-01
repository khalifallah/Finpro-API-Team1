import { Router } from "express";
import { OrderController } from "../controllers/order/order.controller";
import {
  verifyToken,
  requireVerifiedUser,
  canPlaceOrders,
  attachAuthStatus,
  requirePermission,
} from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validator.middleware";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
} from "../validations/order.validation";

const router = Router();

// All order routes require authentication and auth status
router.use(verifyToken);
router.use(attachAuthStatus);

// Order operations that require verification
router.get("/", requireVerifiedUser, OrderController.getUserOrders);

router.get("/:orderId", requireVerifiedUser, OrderController.getOrderDetail);

router.post(
  "/create",
  validateRequest(createOrderSchema),
  requireVerifiedUser,
  canPlaceOrders,
  OrderController.createOrder
);

router.post(
  "/:orderId/cancel",
  validateRequest(cancelOrderSchema),
  requireVerifiedUser,
  OrderController.cancelOrder
);

// Admin only routes
router.get(
  "/admin/all",
  requireVerifiedUser,
  requirePermission("manage_orders"),
  OrderController.getAllOrders
);

router.patch(
  "/admin/:orderId/status",
  validateRequest(updateOrderStatusSchema),
  requireVerifiedUser,
  requirePermission("manage_orders"),
  OrderController.updateOrderStatus
);

export default router;
