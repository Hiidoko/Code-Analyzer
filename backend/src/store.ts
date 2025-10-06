import { AnalysisHistoryEntry, AnalyzeSummary, FileType, MetricsFilters, MetricsOverview, MetricsPeriod, User } from "./types.js";
import { prisma } from "./db.js";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);
const FILE_TYPES: FileType[] = ["py", "js", "html", "css", "rb", "php", "go"];

type DbUser = Awaited<ReturnType<typeof prisma.user.create>>;
type DbAnalysis = NonNullable<Awaited<ReturnType<typeof prisma.analysis.findFirst>>>;

function parseSummary(value: string): AnalyzeSummary {
  return JSON.parse(value) as AnalyzeSummary;
}

function parseResult<T>(value: string): T {
  return JSON.parse(value) as T;
}

function toDomainUser(entity: DbUser): User {
  return {
    id: entity.id,
    email: entity.email,
    passwordHash: entity.passwordHash,
    role: entity.role === "admin" ? "admin" : "user",
    createdAt: entity.createdAt.toISOString(),
  };
}

function toDomainAnalysis<T = unknown>(entity: DbAnalysis): AnalysisHistoryEntry<T> {
  return {
    id: entity.id,
    userId: entity.userId,
    fileType: entity.fileType as FileType,
    fileName: entity.fileName ?? undefined,
    createdAt: entity.createdAt.toISOString(),
    summary: parseSummary(entity.summary),
    result: parseResult<T>(entity.result),
  };
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function ensureDemoUser(): Promise<User> {
  const email = "user@email.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return toDomainUser(existing as DbUser);
  }
  const passwordHash = await hashPassword("user");
  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "user",
    },
  });
  return toDomainUser(created as DbUser);
}

export async function ensureDefaultAdmin(): Promise<User> {
  const email = "admin@example.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return toDomainUser(existing as DbUser);
  const password = process.env.DEFAULT_ADMIN_PASSWORD ?? "admin";
  const passwordHash = await hashPassword(password);
  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "admin",
    },
  });
  return toDomainUser(created as DbUser);
}

export async function createUser(email: string, password: string): Promise<User> {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new Error("E-mail já registrado");
  const passwordHash = await hashPassword(password);
  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "user",
    },
  });
  return toDomainUser(created as DbUser);
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  return toDomainUser(user as DbUser);
}

export async function getUser(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? toDomainUser(user as DbUser) : null;
}

export async function saveAnalysis(entry: Omit<AnalysisHistoryEntry, "id" | "createdAt">): Promise<AnalysisHistoryEntry> {
  const created = await prisma.analysis.create({
    data: {
      userId: entry.userId,
      fileType: entry.fileType,
      fileName: entry.fileName ?? null,
      summary: JSON.stringify(entry.summary),
      result: JSON.stringify(entry.result ?? null),
      issuesCount: entry.summary.issuesCount,
    },
  });
  return toDomainAnalysis(created as DbAnalysis);
}

export async function listUserAnalyses(userId: string): Promise<AnalysisHistoryEntry[]> {
  const items = (await prisma.analysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })) as DbAnalysis[];
  return items.map((item) => toDomainAnalysis(item));
}

export async function getAnalysis(id: string, userId: string): Promise<AnalysisHistoryEntry | null> {
  const item = await prisma.analysis.findFirst({ where: { id, userId } });
  return item ? toDomainAnalysis(item as DbAnalysis) : null;
}

function resolvePeriod(period?: MetricsPeriod): { from?: Date; period: MetricsPeriod } {
  const fallback: MetricsPeriod = period ?? "30d";
  if (fallback === "all") {
    return { period: "all" };
  }
  const days = Number(fallback.replace(/\D/g, "")) || 30;
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { from, period: fallback };
}

export async function buildMetrics(userId: string, filters?: MetricsFilters): Promise<MetricsOverview> {
  const { from, period } = resolvePeriod(filters?.period);
  const where: { userId: string; fileType?: string; createdAt?: { gte: Date } } = { userId };
  if (filters?.fileType) {
    where.fileType = filters.fileType;
  }
  if (from) {
    where.createdAt = { gte: from };
  }

  const analyses = (await prisma.analysis.findMany({ where, orderBy: { createdAt: "desc" } })) as DbAnalysis[];
  const languageGroups = await prisma.analysis.groupBy({
    by: ["fileType"],
    where: { userId },
    _count: { fileType: true },
  });
  type LanguageGroup = (typeof languageGroups)[number];

  const totalAnalyses = analyses.length;
  const parsedSummaries: AnalyzeSummary[] = analyses.map((item) => parseSummary(item.summary));
  const issuesSum = parsedSummaries.reduce<number>((sum, summary) => sum + summary.issuesCount, 0);
  const avgIssues = totalAnalyses ? issuesSum / totalAnalyses : 0;

  const languageCounts: Record<FileType, number> = {
    py: 0,
    js: 0,
    html: 0,
    css: 0,
    rb: 0,
    php: 0,
    go: 0,
  };
  analyses.forEach((item) => {
    const ft = item.fileType as FileType;
    if (FILE_TYPES.includes(ft)) {
      languageCounts[ft] += 1;
    }
  });

  const lastAnalyses = analyses.slice(0, 10).map((item, index) => ({
    id: item.id,
    fileType: item.fileType as FileType,
    issues: parsedSummaries[index].issuesCount,
    createdAt: item.createdAt.toISOString(),
  }));

  const trendMap = new Map<string, { count: number; issueSum: number }>();
  analyses.forEach((item, index) => {
    const key = item.createdAt.toISOString().slice(0, 10);
    const entry = trendMap.get(key) ?? { count: 0, issueSum: 0 };
    entry.count += 1;
    entry.issueSum += parsedSummaries[index].issuesCount;
    trendMap.set(key, entry);
  });

  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, { count, issueSum }]) => ({
      date,
      analyses: count,
      avgIssues: count ? issueSum / count : 0,
    }));

  const availableLanguagesSet = new Set<FileType>();
  languageGroups.forEach((group: LanguageGroup) => {
    const ft = group.fileType as FileType;
    if (FILE_TYPES.includes(ft)) {
      availableLanguagesSet.add(ft);
    }
  });
  const availableLanguages = Array.from(availableLanguagesSet).sort();

  return {
    totalAnalyses,
    byLanguage: languageCounts,
    avgIssues,
    lastAnalyses,
    trend,
    filters: {
      period,
      fileType: filters?.fileType,
      availableLanguages,
    },
  };
}

export async function purgeAll(): Promise<void> {
  await prisma.analysis.deleteMany();
  await prisma.user.deleteMany({
    where: {
      NOT: { email: { in: ["admin@example.com", "user@email.com"] } },
    },
  });
}

export function cloneSummary(summary: AnalyzeSummary): AnalyzeSummary {
  return JSON.parse(JSON.stringify(summary));
}