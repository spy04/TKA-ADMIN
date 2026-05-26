import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prismaAdapter?: PrismaPg;
  prisma?: PrismaClient;
};

export function getPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return null;
  }

  const adapter =
    globalForPrisma.prismaAdapter ??
    new PrismaPg({ connectionString: databaseUrl });

  const client =
    globalForPrisma.prisma ??
    new PrismaClient({
      adapter,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaAdapter = adapter;
    globalForPrisma.prisma = client;
  }

  return client;
}
