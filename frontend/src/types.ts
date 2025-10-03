export type FileType = "py" | "js" | "html" | "css" | "rb" | "php" | "go";

export interface ReportSection {
  id: string;
  title: string;
  severity: "info" | "warning" | "success";
  description?: string;
  items: string[];
  hint?: string;
}

export interface AnalyzeSummary {
  generatedAt: string;
  issuesCount: number;
  sections: ReportSection[];
}

export interface AnalyzeResponse<T = Record<string, unknown>> {
  fileType: FileType;
  result: T;
  summary: AnalyzeSummary;
}

export interface AuthUser {
  id: string;
  email: string;
  role: "user" | "admin";
}

export interface HistoryItem {
  id: string;
  fileType: FileType;
  fileName?: string;
  createdAt: string;
  issues: number;
}

export interface MetricsOverview {
  totalAnalyses: number;
  byLanguage: Record<FileType, number>;
  avgIssues: number;
  lastAnalyses: Array<{ id: string; fileType: FileType; issues: number; createdAt: string }>;
}

export interface GitFileAnalysis {
  path: string;
  fileType: FileType;
  issuesCount: number;
  summary: AnalyzeSummary;
}

export interface GitRepositoryAnalysis {
  repoUrl: string;
  branch?: string;
  filesAnalyzed: number;
  skipped: number;
  totalIssues: number;
  byLanguage: Record<FileType, { files: number; issues: number }>;
  files: GitFileAnalysis[];
  generatedAt: string;
}

export interface GitProgressEventStart { phase: 'start'; totalCandidates: number; }
export interface GitProgressEventFile { phase: 'file'; path: string; analyzed: number; total: number; }
export interface GitProgressEventDone { phase: 'done'; analyzed: number; skipped: number; }
export type GitProgressEvent = GitProgressEventStart | GitProgressEventFile | GitProgressEventDone;
