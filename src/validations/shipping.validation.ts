import yup from "../libs/yup";

export const calculateShippingSchema = yup.object().shape({
  addressId: yup.number().required("Address ID is required"),
  weight: yup.number().min(1).required("Weight is required"),
});

export const validateCheckoutSchema = yup.object().shape({
  addressId: yup.number().required("Address ID is required"),
  shippingMethod: yup.string().required("Shipping method is required"),
});

export const shippingConfigSchema = yup.object().shape({
  serviceName: yup.string().required("Service name is required"),
  serviceCode: yup.string().required("Service code is required"),
  description: yup.string().optional(),
  cost: yup.number().min(0).required("Cost is required"),
  estimatedDays: yup.string().required("Estimated days is required"),
  maxDistance: yup.number().min(0).optional(),
  isActive: yup.boolean().default(true),
});
