import { AnalysisHistoryEntry, MetricsOverview, User, FileType, AnalyzeSummary } from "./types";
import crypto from "crypto";

// Armazenamento em memória (pode ser substituído por banco posteriormente)
const users = new Map<string, User>();
const analyses = new Map<string, AnalysisHistoryEntry>();

// Usuário admin padrão para testes
if (!process.env.DISABLE_DEFAULT_ADMIN) {
  const adminId = crypto.randomUUID();
  users.set(adminId, {
    id: adminId,
    email: "admin@example.com",
    // senha: admin (hash simples NÃO usar em produção)
    passwordHash: hashPassword("admin"),
    role: "admin",
    createdAt: new Date().toISOString(),
  });
}

// Usuário demo padrão (email: user@email.com / senha: user)
export function ensureDemoUser(): User {
  const email = 'user@email.com';
  let demo = Array.from(users.values()).find(u => u.email === email);
  if (!demo) {
    demo = {
      id: crypto.randomUUID(),
      email,
      passwordHash: hashPassword('user'),
      role: 'user',
      createdAt: new Date().toISOString(),
    };
    users.set(demo.id, demo);
  }
  return demo;
}

if (!process.env.DISABLE_DEFAULT_DEMO) {
  ensureDemoUser();
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function createUser(email: string, password: string): User {
  const exists = Array.from(users.values()).find((u) => u.email === email);
  if (exists) throw new Error("E-mail já registrado");
  const user: User = {
    id: crypto.randomUUID(),
    email,
    passwordHash: hashPassword(password),
    role: "user",
    createdAt: new Date().toISOString(),
  };
  users.set(user.id, user);
  return user;
}

export function authenticate(email: string, password: string): User | null {
  const user = Array.from(users.values()).find((u) => u.email === email);
  if (!user) return null;
  if (user.passwordHash !== hashPassword(password)) return null;
  return user;
}

export function getUser(id: string): User | null {
  return users.get(id) ?? null;
}

export function saveAnalysis(entry: Omit<AnalysisHistoryEntry, "id" | "createdAt">): AnalysisHistoryEntry {
  const id = crypto.randomUUID();
  const full: AnalysisHistoryEntry = {
    ...entry,
    id,
    createdAt: new Date().toISOString(),
  };
  analyses.set(id, full);
  return full;
}

export function listUserAnalyses(userId: string): AnalysisHistoryEntry[] {
  return Array.from(analyses.values())
    .filter((a) => a.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getAnalysis(id: string, userId: string): AnalysisHistoryEntry | null {
  const a = analyses.get(id);
  if (!a || a.userId !== userId) return null;
  return a;
}

export function buildMetrics(userId: string): MetricsOverview {
  const items = listUserAnalyses(userId);
  const totalAnalyses = items.length;
  const byLanguage = items.reduce<Record<FileType, number>>((acc, cur) => {
    acc[cur.fileType] = (acc[cur.fileType] ?? 0) + 1;
    return acc;
  }, {} as any);
  const avgIssues = totalAnalyses
    ? items.reduce((sum, a) => sum + a.summary.issuesCount, 0) / totalAnalyses
    : 0;
  const lastAnalyses = items.slice(0, 10).map((a) => ({
    id: a.id,
    fileType: a.fileType,
    issues: a.summary.issuesCount,
    createdAt: a.createdAt,
  }));
  return { totalAnalyses, byLanguage, avgIssues, lastAnalyses };
}

export function purgeAll() {
  analyses.clear();
}

export function cloneSummary(summary: AnalyzeSummary): AnalyzeSummary {
  return JSON.parse(JSON.stringify(summary));
}