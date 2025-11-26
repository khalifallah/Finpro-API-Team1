import jwt, { SignOptions } from "jsonwebtoken";
import { UserRole } from "../generated/prisma-client";

// Use JWT_SECRET to match app.config.ts
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  console.error(`
🚨 CRITICAL: JWT_SECRET is not set in environment variables!

Please add JWT_SECRET to your .env file:
JWT_SECRET=your-super-secure-jwt-secret-key

You can generate one using:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  `);
  process.exit(1);
}

export type JwtPayload = {
  id: number;
  role: UserRole;
  storeId?: number;
  iat?: number;
  exp?: number;
};

export const generateJWT = (payload: object): string => {
  return jwt.sign(payload, jwtSecret, {
    expiresIn: "1d",
  } as SignOptions);
};

export const verifyJWT = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, jwtSecret);
    if (typeof decoded === "string") {
      throw new Error("Invalid token payload");
    }
    return decoded as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expired");
    }
    throw error;
  }
};

export const refreshJWT = (token: string): string => {
  const decoded = verifyJWT(token);
  const { iat, exp, ...payload } = decoded;
  return generateJWT(payload);
};
