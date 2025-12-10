import yup from "../libs/yup";

export const createOrderSchema = yup.object().shape({
  userAddressId: yup.number().required("Shipping address is required"),
  shippingMethod: yup.string().required("Shipping method is required"),
  storeId: yup.number().required("Store ID is required"),
  cartItemIds: yup
    .array()
    .of(yup.number())
    .min(1, "Select at least one item to checkout")
    .required("Cart items are required"),
  voucherCode: yup.string().optional(),
  notes: yup.string().max(500).optional(),
});

export const updateOrderStatusSchema = yup.object().shape({
  status: yup
    .string()
    .oneOf(
      [
        "PENDING_PAYMENT",
        "PENDING_CONFIRMATION",
        "PROCESSING",
        "SHIPPED",
        "CONFIRMED",
        "CANCELLED",
      ],
      "Invalid order status"
    )
    .required("Order status is required"),
  adminNotes: yup.string().max(500).optional(),
});

export const cancelOrderSchema = yup.object().shape({
  reason: yup.string().max(255).required("Cancellation reason is required"),
});

export const uploadPaymentSchema = yup.object().shape({
  paymentMethod: yup
    .string()
    .oneOf(["MANUAL_TRANSFER", "PAYMENT_GATEWAY"])
    .required("Payment method is required"),
});
