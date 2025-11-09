import jwt, { SignOptions } from "jsonwebtoken";
import { UserRole } from "../generated/prisma-client";

const jwtSecret = process.env.AUTH_JWT_SECRET;

if (!jwtSecret) {
	throw new Error("AUTH_JWT_SECRET is not set in environment variables.");
}

export type JwtPayload = {
	id: number;
	role: UserRole;
	iat?: number;
	exp?: number;
};

export const generateJWT = (payload: object): string => {
	return jwt.sign(payload, jwtSecret, {
		expiresIn: "1d",
	} as SignOptions);
};

export const verifyJWT = (token: string) : JwtPayload => {
	const decoded = jwt.verify(token, jwtSecret);
	if (typeof decoded === "string") {
		throw new Error("Invalid token payload");
	}
	return decoded as JwtPayload;
};
