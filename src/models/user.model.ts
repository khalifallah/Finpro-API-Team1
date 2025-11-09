import { User } from "../generated/prisma-client";

type TUser = Omit<User, "passwordHash"> | null;

export default TUser;
