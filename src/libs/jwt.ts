import jwt, { SignOptions } from "jsonwebtoken";

const jwtSecret = process.env.AUTH_JWT_SECRET;

if (!jwtSecret) {
	throw new Error("AUTH_JWT_SECRET is not set in environment variables.");
}

export const generateJWT = (payload: object): string => {
	return jwt.sign(payload, jwtSecret, {
		expiresIn: "1d",
	} as SignOptions);
};

export const verifyJWT = (token: string) => {
	return jwt.verify(token, jwtSecret);
};
