import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in .env");
}

const adapter = new PrismaNeon({
  connectionString,
});

export const prisma = new PrismaClient({
  adapter,
});

console.log(
  "Prisma models:",
  Object.keys(prisma).filter((key) => !key.startsWith("$")),
);