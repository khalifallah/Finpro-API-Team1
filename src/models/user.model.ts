import { User } from "@prisma/client";

type TUser = Omit<User, "passwordHash"> | null;

export default TUser;
