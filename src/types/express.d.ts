import TUser from "../models/user.model";
import { JwtPayload } from "../libs/jwt"; // Import dari jwt.ts

declare module "express-serve-static-core" {
	interface Request {
		user?: TUser | JwtPayload; 
	}
}
