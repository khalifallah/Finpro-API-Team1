import yup from "../libs/yup"

export const discountRuleSchema = yup.object().shape({
    productId: yup.number().integer().positive().optional(),
    description: yup.string().required("Description is required"),
    type: yup.string().oneOf(["BOGO", "DIRECT_PERCENTAGE", "DIRECT_NOMINAL"]).required("Type is required"),
    value: yup.number().positive().when(["type"], ([type], schema) => {
        return type !== "BOGO" ? schema.required("Value is required for this discount type") : schema;
    }),
    minPurchase: yup.number().min(0).optional(),
    maxDiscountAmount: yup.number().positive().optional(),
    startDate: yup.date().optional(),
    endDate: yup.date().optional(),
})

export const updateDiscountRuleSchema = yup.object().shape({
    description: yup.string().optional(),
    type: yup.string().oneOf(["BOGO", "DIRECT_PERCENTAGE", "DIRECT_NOMINAL"]).optional(),
    value: yup.number().positive().optional(),
    minPurchase: yup.number().min(0).optional(),
    maxDiscountAmount: yup.number().positive().optional(),
    startDate: yup.date().optional(),
    endDate: yup.date().optional(),
    is_active: yup.boolean().optional(),
})

export const applyDiscountSchema = yup.object().shape({
    discountRuleId: yup.number().integer().positive().required("Discount Rule ID is required"),
    orderId: yup.number().integer().positive().required("Order ID is required"),
    subtotal: yup.number().positive().required("Subtotal is required"),
})