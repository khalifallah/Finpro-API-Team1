import yup from "../libs/yup";

export const createStoreSchema = yup.object().shape({
  name: yup.string().min(3).max(255).required("Store name is required"),
  address: yup.string().required("Store address is required"),
  latitude: yup
    .number()
    .min(-90)
    .max(90)
    .required("Latitude is required and must be between -90 and 90"),
  longitude: yup
    .number()
    .min(-180)
    .max(180)
    .required("Longitude is required and must be between -180 and 180"),
});

export const updateStoreSchema = yup.object().shape({
  name: yup.string().min(3).max(255).optional(),
  address: yup.string().optional(),
  latitude: yup.number().min(-90).max(90).optional(),
  longitude: yup.number().min(-180).max(180).optional(),
});

export const assignStoreAdminSchema = yup.object().shape({
  userId: yup.number().required("User ID is required"),
  storeId: yup.number().required("Store ID is required"),
});
