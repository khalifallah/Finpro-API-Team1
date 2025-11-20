import { PrismaClient } from "../generated/prisma-client";

const prisma = new PrismaClient({ log: ["query", "warn", "error", "info"] });

export default prisma;
