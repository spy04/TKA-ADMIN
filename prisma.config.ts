import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, env } from "prisma/config";

const localEnvPath = resolve(process.cwd(), ".env.local");

if (!process.env.DATABASE_URL && existsSync(localEnvPath)) {
  const localEnv = readFileSync(localEnvPath, "utf8");
  const databaseUrlLine = localEnv
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("DATABASE_URL="));

  if (databaseUrlLine) {
    process.env.DATABASE_URL = databaseUrlLine
      .slice("DATABASE_URL=".length)
      .trim()
      .replace(/^"(.*)"$/, "$1");
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
