import yup from "../libs/yup";

export const registerSchema = yup.object().shape({
  fullName: yup.string().min(2).max(100).required("Full name is required"),
  email: yup.string().email().trim().required("Email is required"),
  password: yup.string().min(8).optional(), // Make password optional
  role: yup
    .string()
    .oneOf(["USER", "STORE_ADMIN", "SUPER_ADMIN"])
    .default("USER"),
  referredBy: yup.string().optional(),
});

export const setPasswordSchema = yup.object().shape({
  token: yup.string().required("Token is required"),
  password: yup.string().min(8).required("Password is required"),
});

export const loginSchema = yup.object().shape({
  email: yup.string().email().trim().required("Email is required"),
  password: yup.string().required("Password is required"),
});

export const changePasswordSchema = yup.object().shape({
  currentPassword: yup.string().required("Current password is required"),
  newPassword: yup.string().min(8).required("New password is required"),
});

export const resetPasswordSchema = yup.object().shape({
  token: yup.string().required("Token is required"),
  newPassword: yup.string().min(8).required("New password is required"),
});

export const updateProfileSchema = yup.object().shape({
  fullName: yup.string().min(2).max(100).optional(),
  email: yup.string().email().optional(),
});
