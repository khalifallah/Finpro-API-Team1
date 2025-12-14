import * as jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";

// Use JWT_SECRET to match app.config.ts
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  console.error(`
CRITICAL: JWT_SECRET is not set in environment variables!

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

export const generateJWT = (payload: object, expiresIn?: string): string => {
  const secret = jwtSecret as jwt.Secret;
  return jwt.sign(payload, secret, {
    expiresIn: expiresIn || "24h", // Default to 24h, but override for verification
  } as jwt.SignOptions);
};
export const verifyJWT = (token: string): any => {
  const secret = jwtSecret as jwt.Secret;
  return jwt.verify(token, secret) as any;
};
// Specific function for verification tokens (1 hour expiry)
export const generateVerificationToken = (payload: object): string => {
  return generateJWT(payload, "1h");
};
