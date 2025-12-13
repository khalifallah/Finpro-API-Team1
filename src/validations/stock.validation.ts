import yup from "../libs/yup"

// new stock validation schema
export const stockSchema = yup.object().shape({
    productId: yup.number().integer().positive().required("Product ID is required"),
    storeId: yup.number().integer().positive().required("Store ID is required"),
    quantity: yup.number().integer().min(0).required("Quantity must be a non-negative integer"),
});

export const updateStockSchema = yup.object().shape({
    quantity: yup.number().integer().min(0).required("Quantity must be a non-negative integer"),
});


