import yup from "../libs/yup";

export const salesReportSchema = yup.object().shape({
  month: yup.number().min(1).max(12).required("Month is required"),
  year: yup.number().min(2020).max(new Date().getFullYear()).required("Year is required"),
  storeId: yup.number().optional(),
});

export const stockReportSchema = yup.object().shape({
  month: yup.number().min(1).max(12).required("Month is required"),
  year: yup.number().min(2020).max(new Date().getFullYear()).required("Year is required"),
  storeId: yup.number().optional(),
  productId: yup.number().optional(),
});