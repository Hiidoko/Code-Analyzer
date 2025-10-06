import { GenericAnalysis } from "../types.js";

// Implementação simplificada para linguagens ainda não suportadas com regras específicas.
// Faz uma contagem básica de linhas, funções (heurística simples) e comentários.
export function analyzeGeneric(code: string, lang: "rb" | "php" | "go"): GenericAnalysis {
  const linesArr = code.split(/\r?\n/);
  const functionPatterns: Record<string, RegExp> = {
    rb: /def\s+([a-zA-Z0-9_!?]+)/g,
    php: /function\s+([a-zA-Z0-9_]+)/g,
    go: /func\s+([A-Za-z0-9_]+)/g,
  };
  const commentPatterns: Record<string, RegExp> = {
    rb: /#(.*)$/,
    php: /\/\/.*$|#.*$|\/\*[\s\S]*?\*\//,
    go: /\/\/.*$|\/\*[\s\S]*?\*\//,
  };

  const functions = new Set<string>();
  const funcRegex = functionPatterns[lang];
  for (const line of linesArr) {
    let match: RegExpExecArray | null;
    while ((match = funcRegex.exec(line)) !== null) {
      functions.add(match[1]);
    }
  }

  const comments = linesArr.filter((l) => commentPatterns[lang].test(l)).length;

  const info: string[] = [];
  if (functions.size === 0) info.push("Nenhuma função detectada (heurística simples)." );
  if (comments === 0) info.push("Nenhum comentário encontrado.");

  return {
    lines: linesArr.length,
    functions: Array.from(functions),
    comments,
    info,
  };
}