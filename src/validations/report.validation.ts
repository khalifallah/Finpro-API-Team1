import * as yup from "yup";

// FIX: Schema dengan proper transform
export const salesReportSchema = yup.object().shape({
  month: yup
    .number()
    .typeError("Month must be a number")
    .required("Month is required")
    .min(1, "Month must be between 1-12")
    .max(12, "Month must be between 1-12"),
  
  year: yup
    .number()
    .typeError("Year must be a number")
    .required("Year is required")
    .min(2020, "Year must be 2020 or later")
    .max(new Date().getFullYear(), `Year cannot exceed ${new Date().getFullYear()}`),
  
  storeId: yup
    .number()
    .typeError("StoreId must be a number")
    .optional()
    .nullable(),
});

export const stockReportSchema = yup.object().shape({
  month: yup
    .number()
    .typeError("Month must be a number")
    .required("Month is required")
    .min(1, "Month must be between 1-12")
    .max(12, "Month must be between 1-12"),
  
  year: yup
    .number()
    .typeError("Year must be a number")
    .required("Year is required")
    .min(2020, "Year must be 2020 or later")
    .max(new Date().getFullYear(), `Year cannot exceed ${new Date().getFullYear()}`),
  
  storeId: yup
    .number()
    .typeError("StoreId must be a number")
    .optional()
    .nullable(),
  
  productId: yup
    .number()
    .typeError("ProductId must be a number")
    .optional()
    .nullable(),
});