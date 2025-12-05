import yup from "../libs/yup";

export const addToCartSchema = yup.object().shape({
  productId: yup.number().required("Product ID is required"),
  quantity: yup.number().min(1).required("Quantity is required"),
  storeId: yup.number().required("Store ID is required for stock validation"),
});

export const updateCartItemSchema = yup.object().shape({
  quantity: yup.number().min(1).required("Quantity is required"),
});
