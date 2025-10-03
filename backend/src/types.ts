// FileType agora inclui linguagens experimentais (Ruby, PHP, Go)
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

export interface AnalyzePayload {
  code: string;
  fileType: FileType;
  fileName?: string;
}

export interface PythonAnalysis {
  declaredFunctions: string[];
  calledFunctions: string[];
  unusedFunctions: string[];
  declaredVars: string[];
  usedVars: string[];
  unusedVars: string[];
  printStatements: Array<{ line: number; code: string }>;
  uninitializedVars: string[];
  docstringIssues: Array<{ line: number; issue: string }>;
  functionComplexity: Record<string, { loops: number; depth: number }>;
  styleIssues: string[];
  commonErrors: Array<{ line: number; issue: string }>;
  refactorSuggestions: Array<{ line: number; suggestion: string }>;
  unusedImports: string[];
  deadCode: Array<{ line: number; description: string }>;
  duplicateFunctions: string[][];
  unusedWrites: Record<string, string[]>;
  thirdPartyCode: Array<{ line: number; description: string }>;
  performanceIssues: Array<{ line: number; description: string }>;
}

export interface HtmlAnalysis {
  unclosedTags: Array<{ tag: string; line: number }>;
  missingCloseTags: Array<{ tag: string; line: number }>;
  incompleteTags: Array<{ snippet: string; line: number }>;
  duplicatedIds: string[];
  imgsWithoutAlt: Array<{ snippet: string; line: number }>;
  linksWithoutHref: Array<{ snippet: string; line: number }>;
}

export interface CssAnalysis {
  selectors: string[];
  selectorLines: Record<string, number[]>;
  duplicatedSelectors: string[];
  invalidSelectors: string[];
  invalidProperties: Array<{ selector: string; line: number; property: string }>;
  repeatedProperties: Array<{ selector: string; line: number; property: string }>;
  unknownProperties: Array<{ selector: string; line: number; property: string }>;
  unusedSelectors: string[];
}

export interface JavaScriptAnalysis {
  declaredFunctions: Array<{ name: string; line: number | null }>;
  unusedFunctions: Array<{ name: string; line: number | null }>;
  declaredVariables: Array<{ name: string; line: number | null }>;
  unusedVariables: Array<{ name: string; line: number | null }>;
  syntaxErrors: string[];
  varUsage: number[];
  letUsage: number[];
  constUsage: number[];
  evalUsage: number[];
  documentWriteUsage: number[];
  todoComments: Array<{ comment: string; line: number }>;
  longLines: number[];
  magicNumbers: Array<{ value: string; line: number }>;
  semicolonMissing: number[];
  arrowFunctions: Array<{ name: string; line: number | null }>;
  anonymousFunctions: Array<{ name: string; line: number | null }>;
  doubleEquals: number[];
  tripleEquals: number[];
  consoleLogUsage: number[];
  eslintProblems?: Array<{ ruleId: string | null; severity: number; message: string; line: number; column: number }>;
}

export type AnalysisResult =
  | { fileType: "py"; result: PythonAnalysis }
  | { fileType: "js"; result: JavaScriptAnalysis }
  | { fileType: "html"; result: HtmlAnalysis }
  | { fileType: "css"; result: CssAnalysis }
  | { fileType: "rb"; result: GenericAnalysis }
  | { fileType: "php"; result: GenericAnalysis }
  | { fileType: "go"; result: GenericAnalysis };

export interface AnalyzeResponse<T> {
  fileType: FileType;
  result: T;
  summary: AnalyzeSummary;
}

// Análise genérica (linguagens experimentais)
export interface GenericAnalysis {
  lines: number;
  functions: string[];
  comments: number;
  info: string[]; // mensagens gerais
}

// Usuários e Auth
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: "user" | "admin";
  createdAt: string;
}

export interface AuthTokenPayload {
  sub: string; // user id
  role: User["role"];
  iat: number;
  exp: number;
}

// Histórico de análises
export interface AnalysisHistoryEntry<T = unknown> {
  id: string;
  userId: string;
  fileType: FileType;
  fileName?: string;
  createdAt: string;
  summary: AnalyzeSummary;
  result: T;
}

export type MetricsPeriod = "7d" | "30d" | "90d" | "all";

export interface MetricsFilters {
  period?: MetricsPeriod;
  fileType?: FileType;
}

export interface MetricsOverview {
  totalAnalyses: number;
  byLanguage: Record<FileType, number>;
  avgIssues: number;
  lastAnalyses: Array<{ id: string; fileType: FileType; issues: number; createdAt: string }>;
  trend: Array<{ date: string; analyses: number; avgIssues: number }>;
  filters: {
    period: MetricsPeriod;
    fileType?: FileType;
    availableLanguages: FileType[];
  };
}

// Git repository aggregated analysis types
export interface GitFileAnalysis {
  path: string;
  fileType: FileType;
  summary: AnalyzeSummary;
  issuesCount: number;
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
