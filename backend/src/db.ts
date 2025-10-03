import { PrismaClient } from "@prisma/client";

if (process.env.JEST_WORKER_ID !== undefined) {
  process.env.DATABASE_URL = "file:./test.db";
} else if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

export const prisma = new PrismaClient();

process.on("beforeExit", async () => {
  await prisma.$disconnect().catch(() => undefined);
});
