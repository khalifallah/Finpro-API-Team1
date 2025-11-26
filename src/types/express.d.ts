import TUser from "../models/user.model";
import { JwtPayload } from "../libs/jwt";

declare module "express-serve-static-core" {
  interface Request {
    user?: TUser;
    jwtPayload?: JwtPayload;
  }
}

export interface IUserReqParam {
  id: number;
  email: string;
  fullName: string;
  role: string;
  photoUrl?: string;
}
