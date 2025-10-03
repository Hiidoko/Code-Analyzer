import simpleGit from 'simple-git';
import { mkdtempSync, rmSync, readdirSync, statSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, extname } from 'path';
import { analyzeByType } from '../analyzers';
import { buildSections } from './summaryBuilder';
import { FileType, GitRepositoryAnalysis, GitFileAnalysis } from '../types';

const EXT_MAP: Record<string, FileType> = {
  '.py': 'py',
  '.js': 'js',
  '.html': 'html',
  '.css': 'css',
  '.rb': 'rb',
  '.php': 'php',
  '.go': 'go',
};

function collectFiles(dir: string, base: string, acc: string[]) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = full.substring(base.length + 1);
    const st = statSync(full);
    if (st.isDirectory()) collectFiles(full, base, acc);
    else acc.push(rel);
  }
}

const MAX_FILES = Number(process.env.GIT_ANALYSIS_MAX_FILES || 400);
const MAX_FILE_SIZE = Number(process.env.GIT_ANALYSIS_MAX_FILE_SIZE || 200 * 1024); // 200KB
const MAX_TOTAL_SIZE = Number(process.env.GIT_ANALYSIS_MAX_TOTAL_SIZE || 6 * 1024 * 1024); // 6MB
const CONCURRENCY = Number(process.env.GIT_ANALYSIS_CONCURRENCY || 5);

type ProgressEvent =
  | { phase: 'start'; totalCandidates: number }
  | { phase: 'file'; path: string; analyzed: number; total: number }
  | { phase: 'done'; analyzed: number; skipped: number };

export async function analyzeGitRepository(
  repoUrl: string,
  branch?: string,
): Promise<GitRepositoryAnalysis> {
  return analyzeGitRepositoryWithProgress(repoUrl, branch);
}

export async function analyzeGitRepositoryWithProgress(
  repoUrl: string,
  branch: string | undefined,
  onProgress?: (e: ProgressEvent) => void,
  isCancelled?: () => boolean,
): Promise<GitRepositoryAnalysis> {
  const temp = mkdtempSync(join(tmpdir(), 'code-analyzer-'));
  const git = simpleGit({ baseDir: temp });
  let cleanupDone = false;
  const cleanup = () => { if (!cleanupDone) { try { rmSync(temp, { recursive: true, force: true }); } catch {} cleanupDone = true; } };
  try {
    await git.clone(repoUrl, temp, branch ? ['--branch', branch, '--single-branch', '--depth', '1'] : ['--depth', '1']);
    const files: string[] = [];
    collectFiles(temp, temp, files);
    // Pré-filtra por extensões suportadas para contagem inicial
    const candidateFiles = files.filter(f => EXT_MAP[extname(f).toLowerCase()]);
    onProgress?.({ phase: 'start', totalCandidates: candidateFiles.length });

    const analyzed: GitFileAnalysis[] = [];
    let skipped = 0;
    const byLanguage: GitRepositoryAnalysis['byLanguage'] = {
      py: { files: 0, issues: 0 },
      js: { files: 0, issues: 0 },
      html: { files: 0, issues: 0 },
      css: { files: 0, issues: 0 },
      rb: { files: 0, issues: 0 },
      php: { files: 0, issues: 0 },
      go: { files: 0, issues: 0 },
    };
    let totalSize = 0;
    let processed = 0;
    const toAnalyze = candidateFiles.slice(0, MAX_FILES);

    // Implementa pool simples de concorrência
    async function worker(rel: string) {
      const ext = extname(rel).toLowerCase();
      const fileType = EXT_MAP[ext];
      if (!fileType) { skipped++; return; }
      const full = join(temp, rel);
      try {
        const st = statSync(full);
        if (st.size > MAX_FILE_SIZE) { skipped++; return; }
        if (totalSize + st.size > MAX_TOTAL_SIZE) { skipped++; return; }
        totalSize += st.size;
        const content = readFileSync(full, 'utf8');
        const analysis = analyzeByType(fileType, content);
        const { sections, issuesCount } = buildSections(analysis.fileType, analysis.result as any);
        analyzed.push({
          path: rel,
          fileType: analysis.fileType,
          summary: { generatedAt: new Date().toISOString(), issuesCount, sections },
          issuesCount,
        });
        byLanguage[fileType].files += 1;
        byLanguage[fileType].issues += issuesCount;
      } catch {
        skipped++;
      } finally {
        processed++;
        onProgress?.({ phase: 'file', path: rel, analyzed: processed, total: toAnalyze.length });
      }
    }

    let active: Promise<void>[] = [];
    for (const rel of toAnalyze) {
      if (isCancelled?.()) break;
      const p = worker(rel).finally(() => {
        active = active.filter(a => a !== p);
      });
      active.push(p);
      if (active.length >= CONCURRENCY) {
        await Promise.race(active).catch(() => {});
      }
    }
    await Promise.allSettled(active);
    onProgress?.({ phase: 'done', analyzed: analyzed.length, skipped });
    const totalIssues = analyzed.reduce((s, f) => s + f.issuesCount, 0);
    return {
      repoUrl,
      branch,
      filesAnalyzed: analyzed.length,
      skipped,
      totalIssues,
      byLanguage,
      files: analyzed,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    cleanup();
  }
}

