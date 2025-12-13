import yup from "../libs/yup";

export const createAddressSchema = yup.object().shape({
  label: yup.string().max(50).optional(),
  fullAddress: yup.string().required("Full address is required"),
  latitude: yup.number().required("Latitude is required"),
  longitude: yup.number().required("Longitude is required"),
  recipientName: yup.string().required("Recipient name is required"),
  recipientPhone: yup.string().optional(),
  isMain: yup.boolean().optional().default(false),
});

export const updateAddressSchema = yup.object().shape({
  label: yup.string().max(50).optional(),
  fullAddress: yup.string().optional(),
  latitude: yup.number().optional(),
  longitude: yup.number().optional(),
  recipientName: yup.string().optional(),
  recipientPhone: yup.string().optional(),
  isMain: yup.boolean().optional(),
});
