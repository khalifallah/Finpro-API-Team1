import { PrismaClient } from "../generated/prisma-client";

const prisma = new PrismaClient({
  log: ["query", "warn", "error", "info"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export default prisma;
