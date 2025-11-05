import { genSalt, hash, compare } from "bcrypt";

const hashPassword = async (plainPassword: string) => {
	const salt = await genSalt(10);
	return await hash(plainPassword, salt);
};

const comparePassword = async (
	plainPassword: string,
	hashedPassword: string
) => {
	return await compare(plainPassword, hashedPassword);
};

export { hashPassword, comparePassword };
