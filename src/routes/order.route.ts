import { Router } from "express";
import { OrderController } from "../controllers/order/order.controller";
import { ShippingController } from "../controllers/shipping.controller";
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
import {
  calculateShippingSchema,
  validateCheckoutSchema,
} from "../validations/shipping.validation";
import { uploadPaymentProof } from "../middlewares/upload.middleware";

const router = Router();

// All order routes require authentication and auth status
router.use(verifyToken);
router.use(attachAuthStatus);

// ==================== SHIPPING & CHECKOUT ROUTES ====================
// Get checkout preview
router.get(
  "/checkout/preview",
  requireVerifiedUser,
  ShippingController.getCheckoutPreview
);

// Calculate shipping cost
router.post(
  "/shipping/calculate",
  validateRequest(calculateShippingSchema),
  requireVerifiedUser,
  ShippingController.calculateShipping
);

// Validate checkout
router.post(
  "/checkout/validate",
  validateRequest(validateCheckoutSchema),
  requireVerifiedUser,
  ShippingController.validateCheckout
);

// Get nearest store
router.get(
  "/shipping/nearest-store",
  requireVerifiedUser,
  ShippingController.getNearestStore
);

// Calculate distance
router.post(
  "/shipping/distance",
  requireVerifiedUser,
  ShippingController.calculateDistance
);

// ==================== ORDER ROUTES ====================
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
  "/:orderId/payment-proof",
  requireVerifiedUser,
  uploadPaymentProof,
  OrderController.uploadPaymentProof
);

router.post(
  "/:orderId/confirm",
  requireVerifiedUser,
  OrderController.confirmOrderReceived
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
