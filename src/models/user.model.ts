import { User } from "../generated/prisma";

type TUser = Omit<User, "password"> | null;

export default TUser;
