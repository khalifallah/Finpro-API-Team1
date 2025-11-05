import yup from "../libs/yup";

const sharedAuthSchema = {
	email: yup.string().email().trim().required("Email is required"),
	password: yup.string().min(6).required("Password is required"),
	role: yup.string().oneOf(["USER", "ADMIN"]).required("Role is required"),
};

export const authSchema = yup.object().shape({
	...sharedAuthSchema,
});
