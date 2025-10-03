import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import { analyzeByType } from "./analyzers";
import { runEslintOnCode } from "./utils/eslintRunner";
import { analyzeGitRepository, analyzeGitRepositoryWithProgress } from "./utils/gitAnalyzer";
import { buildSections } from "./utils/summaryBuilder";
import { createPdfReport, createHtmlReport } from "./report";
import {
  AnalyzePayload,
  AnalyzeResponse,
  AnalyzeSummary,
  FileType,
  PythonAnalysis,
  HtmlAnalysis,
  CssAnalysis,
  JavaScriptAnalysis,
  GenericAnalysis,
  GenericAnalysis as AnyAnalysis,
  User,
  AnalysisHistoryEntry,
} from "./types";
import jwt from "jsonwebtoken";
import {
  authenticate,
  createUser,
  getUser,
  saveAnalysis,
  listUserAnalyses,
  getAnalysis,
  buildMetrics,
  cloneSummary,
  ensureDemoUser,
} from "./store";
import * as crypto from "crypto";

const PORT = Number(process.env.PORT ?? 4000);
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(16).toString("hex");

export const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

interface AuthedRequest extends Request {
  user?: User;
}

function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Não autenticado" });
  const token = header.replace(/^Bearer\s+/i, "");
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = getUser(decoded.sub);
    if (!user) return res.status(401).json({ error: "Token inválido" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

function isSupportedFileType(value: unknown): value is FileType {
  return ["py", "js", "html", "css", "rb", "php", "go"].includes(value as string);
}

// Auth endpoints
app.post("/api/auth/register", (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Dados inválidos" });
  try {
    const user = createUser(email, password);
    return res.json({ id: user.id, email: user.email, role: user.role });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.post("/api/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Dados inválidos" });
  const user = authenticate(email, password);
  if (!user) return res.status(401).json({ error: "Credenciais inválidas" });
  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "12h" });
  return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

// Login direto da demo (garante criação do usuário demo)
app.post("/api/auth/demo", (req: Request, res: Response) => {
  try {
    const user = ensureDemoUser();
    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "12h" });
    return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err: any) {
    return res.status(500).json({ error: "Falha ao gerar sessão demo" });
  }
});

app.post("/api/analyze", authMiddleware, async (req: AuthedRequest, res: Response) => {
  const payload = req.body as Partial<AnalyzePayload>;

  if (!payload.code || typeof payload.code !== "string") {
    return res.status(400).json({ error: "Código inválido." });
  }

  if (!isSupportedFileType(payload.fileType)) {
    return res.status(400).json({ error: "Tipo de arquivo não suportado." });
  }

  try {
    const analysis = analyzeByType(payload.fileType, payload.code);
    // Se for JS, roda ESLint e agrega resultados
    if (analysis.fileType === "js") {
      const jsResult: any = analysis.result;
      const eslintIssues = await runEslintOnCode(payload.code, payload.fileName || "input.js");
      jsResult.eslintProblems = eslintIssues.map((i) => ({
        ruleId: i.ruleId,
        severity: i.severity,
        message: i.message,
        line: i.line,
        column: i.column,
      }));
    }
    const { sections, issuesCount } = buildSections(analysis.fileType, analysis.result as any);
    const summary: AnalyzeSummary = {
      generatedAt: new Date().toISOString(),
      issuesCount,
      sections,
    };

    const response: AnalyzeResponse<PythonAnalysis | HtmlAnalysis | CssAnalysis | JavaScriptAnalysis | GenericAnalysis> = {
      fileType: analysis.fileType,
      result: analysis.result,
      summary,
    };

    if (req.user) {
      saveAnalysis({
        userId: req.user.id,
        fileType: analysis.fileType,
        fileName: payload.fileName,
        summary: cloneSummary(summary),
        result: analysis.result as any,
      });
    }

    return res.json(response);
  } catch (error) {
    console.error("Erro na análise de código", error);
    return res.status(500).json({ error: "Erro ao processar a análise." });
  }
});

function buildSummary(fileType: FileType, code: string) {
  const analysis = analyzeByType(fileType, code);
  const { sections, issuesCount } = buildSections(fileType, analysis.result);
  const summary: AnalyzeSummary = {
    generatedAt: new Date().toISOString(),
    issuesCount,
    sections,
  };
  return { summary, result: analysis.result };
}

app.post("/api/report/pdf", authMiddleware, async (req: AuthedRequest, res: Response) => {
  const { code, fileType, fileName } = req.body as Partial<AnalyzePayload> & { fileName?: string };

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Código inválido." });
  }

  if (!isSupportedFileType(fileType)) {
    return res.status(400).json({ error: "Tipo de arquivo não suportado." });
  }

  try {
    const { summary } = buildSummary(fileType, code);
    const pdfBuffer = await createPdfReport({
      fileType,
      summary,
      fileName,
    });

    const safeName = (fileName ?? `relatorio-${fileType}`).replace(/[^a-zA-Z0-9-_\.]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("Erro ao gerar relatório PDF", error);
    return res.status(500).json({ error: "Erro ao gerar o relatório em PDF." });
  }
});

app.post("/api/report/html", authMiddleware, (req: AuthedRequest, res: Response) => {
// Exportações adicionais (CSV, JSON)
app.post("/api/report/json", authMiddleware, (req: AuthedRequest, res: Response) => {
  const { code, fileType, fileName } = req.body as Partial<AnalyzePayload> & { fileName?: string };
  if (!code || !isSupportedFileType(fileType)) {
    return res.status(400).json({ error: "Dados inválidos" });
  }
  try {
    const analysis = analyzeByType(fileType, code);
    const { sections, issuesCount } = buildSections(analysis.fileType, analysis.result as any);
    const summary: AnalyzeSummary = {
      generatedAt: new Date().toISOString(),
      issuesCount,
      sections,
    };
    const response = {
      fileType: analysis.fileType,
      fileName: fileName || undefined,
      result: analysis.result,
      summary,
    };
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const safeName = (fileName ?? `relatorio-${fileType}`).replace(/[^a-zA-Z0-9-_\.]/g, "_");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.json"`);
    return res.send(JSON.stringify(response, null, 2));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao gerar JSON" });
  }
});

app.post("/api/report/csv", authMiddleware, (req: AuthedRequest, res: Response) => {
  const { code, fileType, fileName } = req.body as Partial<AnalyzePayload> & { fileName?: string };
  if (!code || !isSupportedFileType(fileType)) {
    return res.status(400).json({ error: "Dados inválidos" });
  }
  try {
    const analysis = analyzeByType(fileType, code);
    const { sections, issuesCount } = buildSections(analysis.fileType, analysis.result as any);
    const rows: string[] = ["section_id;title;severity;item"];
    sections.forEach((sec) => {
      sec.items.forEach((item) => {
        rows.push([sec.id, sec.title.replace(/;/g, ","), sec.severity, item.replace(/;/g, ",")].join(";"));
      });
    });
    const csv = rows.join("\n");
    const safeName = (fileName ?? `relatorio-${fileType}`).replace(/[^a-zA-Z0-9-_\.]/g, "_");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao gerar CSV" });
  }
});

// Histórico
app.get("/api/history", authMiddleware, (req: AuthedRequest, res: Response) => {
  const list = listUserAnalyses(req.user!.id).map((a) => ({
    id: a.id,
    fileType: a.fileType,
    fileName: a.fileName,
    createdAt: a.createdAt,
    issues: a.summary.issuesCount,
  }));
  return res.json({ items: list });
});

app.get("/api/history/:id", authMiddleware, (req: AuthedRequest, res: Response) => {
  const item = getAnalysis(req.params.id, req.user!.id);
  if (!item) return res.status(404).json({ error: "Não encontrado" });
  return res.json(item);
});

// Métricas (dashboard)
app.get("/api/metrics", authMiddleware, (req: AuthedRequest, res: Response) => {
  const metrics = buildMetrics(req.user!.id);
  return res.json(metrics);
});

// Análise de repositório Git
app.post("/api/git/analyze", authMiddleware, async (req: AuthedRequest, res: Response) => {
  const { repoUrl, branch } = req.body || {};
  if (!repoUrl || typeof repoUrl !== "string") {
    return res.status(400).json({ error: "repoUrl obrigatório" });
  }
  try {
    const report = await analyzeGitRepository(repoUrl, branch);
    return res.json(report);
  } catch (err: any) {
    console.error("Erro ao analisar repositório", err);
    return res.status(500).json({ error: "Falha ao analisar repositório", detail: err.message });
  }
});

// Streaming (SSE) GET /api/git/analyze/stream?repoUrl=...&branch=...&reqId=...
const activeGitCancels = new Map<string, { cancel: () => void }>();
app.get("/api/git/analyze/stream", authMiddleware, async (req: AuthedRequest, res: Response) => {
  const repoUrl = req.query.repoUrl as string | undefined;
  const branch = req.query.branch as string | undefined;
  const reqId = (req.query.reqId as string | undefined) || crypto.randomUUID();
  if (!repoUrl) return res.status(400).json({ error: "repoUrl obrigatório" });
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  let cancelled = false;
  activeGitCancels.set(reqId, { cancel: () => { cancelled = true; } });
  const send = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  send('meta', { reqId });
  try {
    const report = await analyzeGitRepositoryWithProgress(
      repoUrl,
      branch,
      (e) => send('progress', e),
      () => cancelled,
    );
    if (cancelled) {
      send('cancelled', { message: 'Análise cancelada' });
    } else {
      send('done', report);
    }
  } catch (err: any) {
    send('error', { message: err.message || 'Erro desconhecido' });
  } finally {
    activeGitCancels.delete(reqId);
    res.end();
  }
});

// Cancelamento manual: POST /api/git/analyze/cancel { reqId }
app.post("/api/git/analyze/cancel", authMiddleware, (req: AuthedRequest, res: Response) => {
  const { reqId } = req.body || {};
  if (!reqId) return res.status(400).json({ error: 'reqId obrigatório' });
  const entry = activeGitCancels.get(reqId);
  if (!entry) return res.status(404).json({ error: 'Processo não encontrado' });
  entry.cancel();
  return res.json({ ok: true });
});
  const { code, fileType, fileName } = req.body as Partial<AnalyzePayload> & { fileName?: string };

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Código inválido." });
  }

  if (!isSupportedFileType(fileType)) {
    return res.status(400).json({ error: "Tipo de arquivo não suportado." });
  }

  try {
    const { summary } = buildSummary(fileType, code);
    const html = createHtmlReport({
      fileType,
      summary,
      fileName,
    });

    const safeName = (fileName ?? `relatorio-${fileType}`).replace(/[^a-zA-Z0-9-_\.]/g, "_");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.html"`);
    return res.send(html);
  } catch (error) {
    console.error("Erro ao gerar relatório HTML", error);
    return res.status(500).json({ error: "Erro ao gerar o relatório em HTML." });
  }
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

if (process.env.JEST_WORKER_ID === undefined) {
  app.listen(PORT, () => {
    console.log(`Servidor em execução na porta ${PORT}`);
  });
}
