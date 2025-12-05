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

export const updateProfileSchema = yup
  .object()
  .shape({
    fullName: yup.string().min(2).max(100).optional(),
    email: yup.string().email().optional(),
    currentPassword: yup.string().optional(),
    newPassword: yup.string().min(8).optional(),
  })
  .test(
    "password-change",
    "Current password is required when changing password",
    function (value) {
      if (value.newPassword && !value.currentPassword) {
        return this.createError({
          path: "currentPassword",
          message: "Current password is required when setting new password",
        });
      }
      return true;
    }
  );

export const emailUpdateSchema = yup.object().shape({
  email: yup.string().email().required("New email is required"),
  currentPassword: yup
    .string()
    .required("Current password is required for email change"),
});

export const resendVerificationSchema = yup.object().shape({
  email: yup.string().email().required("Email is required"),
});

export const googleAuthSchema = yup.object().shape({
  idToken: yup.string().required("Google ID token is required"),
});

export const setSocialPasswordSchema = yup.object().shape({
  password: yup.string().min(8).required("Password is required"),
});
