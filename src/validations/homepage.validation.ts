import yup from "../libs/yup";

export const homepageQuerySchema = yup.object().shape({
  lat: yup.number().min(-90).max(90).optional(),
  lng: yup.number().min(-180).max(180).optional(),
  page: yup.number().min(1).default(1).optional(),
  limit: yup.number().min(1).max(50).default(10).optional(),
});

export const storeLocationSchema = yup.object().shape({
  lat: yup.number().min(-90).max(90).required(),
  lng: yup.number().min(-180).max(180).required(),
});
