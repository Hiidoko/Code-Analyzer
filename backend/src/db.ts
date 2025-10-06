import { PrismaClient } from "@prisma/client";

// Em modo de teste ainda podemos isolar uma base (Mongo memory não está configurado; usar variável externa ou skip)
// Removido fallback SQLite porque agora provider é MongoDB.
if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL não definida. Defina a URL do MongoDB no .env.");
}

export const prisma = new PrismaClient();

process.on("beforeExit", async () => {
  await prisma.$disconnect().catch(() => undefined);
});
