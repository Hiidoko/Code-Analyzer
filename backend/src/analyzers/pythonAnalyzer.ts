import { createHash } from "node:crypto";
import { PythonAnalysis } from "../types.js";

const PYTHON_KEYWORDS = new Set([
  "False",
  "None",
  "True",
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
]);

const PYTHON_BUILTINS = new Set([
  "abs",
  "all",
  "any",
  "ascii",
  "bin",
  "bool",
  "bytearray",
  "bytes",
  "callable",
  "chr",
  "classmethod",
  "compile",
  "complex",
  "dict",
  "dir",
  "divmod",
  "enumerate",
  "eval",
  "exec",
  "filter",
  "float",
  "format",
  "frozenset",
  "getattr",
  "globals",
  "hasattr",
  "hash",
  "help",
  "hex",
  "id",
  "input",
  "int",
  "isinstance",
  "issubclass",
  "iter",
  "len",
  "list",
  "locals",
  "map",
  "max",
  "memoryview",
  "min",
  "next",
  "object",
  "oct",
  "open",
  "ord",
  "pow",
  "print",
  "property",
  "range",
  "repr",
  "reversed",
  "round",
  "set",
  "setattr",
  "slice",
  "sorted",
  "staticmethod",
  "str",
  "sum",
  "super",
  "tuple",
  "type",
  "vars",
  "zip",
]);

const THIRD_PARTY_HASHES = new Map<string, string>([
  ["86fb269d190d2c85f6e0468ceca42a20", "Função 'hello_world' de exemplo"],
]);

const ASSIGNMENT_REGEX = /\b([A-Za-z_][\w]*)\s*(?:\+|-|\*|\/|%|\/\/|\*\*|&|\||\^)?=(?!=)/g;
const IDENTIFIER_REGEX = /\b([A-Za-z_][\w]*)\b/g;

function normalizeLineEndings(source: string): string {
  return source.replace(/\r\n?/g, "\n");
}

function getIndentWidth(line: string): number {
  if (!line) {
    return 0;
  }
  const replaced = line.replace(/\t/g, "    ");
  return replaced.length - replaced.trimStart().length;
}

function extractIdentifiers(line: string): string[] {
  const identifiers: string[] = [];
  for (const match of line.matchAll(IDENTIFIER_REGEX)) {
    identifiers.push(match[1]);
  }
  return identifiers;
}

interface BlockInfo {
  indices: number[];
  end: number;
  baseIndent: number;
}

function collectBlock(lines: string[], headerIndex: number): BlockInfo {
  const indices: number[] = [];
  const baseIndent = getIndentWidth(lines[headerIndex]);
  let end = headerIndex;
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const current = lines[i];
    if (current.trim() === "") {
      indices.push(i);
      end = i;
      continue;
    }
    const indent = getIndentWidth(current);
    if (indent > baseIndent) {
      indices.push(i);
      end = i;
      continue;
    }
    break;
  }
  return { indices, end, baseIndent };
}

function findFirstContentLine(lines: string[], indices: number[]): number | null {
  for (const index of indices) {
    const trimmed = lines[index].trim();
    if (trimmed !== "" && !trimmed.startsWith("#")) {
      return index;
    }
  }
  return null;
}

function hasTripleQuotedString(line: string): boolean {
  return line.startsWith("\"\"\"") || line.startsWith("'''");
}

function ensureDocstring(
  kind: "Função" | "Classe",
  name: string,
  lines: string[],
  block: BlockInfo,
  issues: Array<{ line: number; issue: string }>,
  definitionLine: number,
): void {
  const firstContentIndex = findFirstContentLine(lines, block.indices);
  if (firstContentIndex === null) {
    issues.push({ line: definitionLine, issue: `${kind} '${name}' sem docstring.` });
    return;
  }
  const firstContent = lines[firstContentIndex].trim();
  if (!hasTripleQuotedString(firstContent)) {
    issues.push({ line: firstContentIndex + 1, issue: `${kind} '${name}' sem docstring.` });
    return;
  }
  const quote = firstContent.startsWith("\"\"") ? "\"\"\"" : "'''";
  if (firstContent.split(quote).length > 2) {
    return; // docstring inline on the same line
  }
  for (let i = firstContentIndex + 1; i <= block.end; i += 1) {
    if (lines[i].includes(quote)) {
      return;
    }
  }
  issues.push({ line: firstContentIndex + 1, issue: `${kind} '${name}' com docstring não finalizada.` });
}

function collectAssignments(line: string): string[] {
  const assignments: string[] = [];
  for (const match of line.matchAll(ASSIGNMENT_REGEX)) {
    assignments.push(match[1]);
  }
  const forMatch = line.match(/^\s*for\s+([A-Za-z_][\w]*)\s+in\b/);
  if (forMatch) {
    assignments.push(forMatch[1]);
  }
  const withMatch = line.match(/\bas\s+([A-Za-z_][\w]*)\b/);
  if (withMatch) {
    assignments.push(withMatch[1]);
  }
  return assignments;
}

function extractParameters(definition: string): string[] {
  const paramsMatch = definition.match(/\((.*)\)/);
  if (!paramsMatch) {
    return [];
  }
  const raw = paramsMatch[1];
  if (!raw.trim()) {
    return [];
  }
  return raw
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.split("=")[0].trim())
    .filter((parameter) => /^[A-Za-z_][\w]*$/.test(parameter));
}

function joinBlock(lines: string[], start: number, end: number): string {
  return lines
    .slice(start, end + 1)
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

function buildPythonAnalysisTemplate(): PythonAnalysis {
  return {
    declaredFunctions: [],
    calledFunctions: [],
    unusedFunctions: [],
    declaredVars: [],
    usedVars: [],
    unusedVars: [],
    printStatements: [],
    uninitializedVars: [],
    docstringIssues: [],
    functionComplexity: {},
    styleIssues: [],
    commonErrors: [],
    refactorSuggestions: [],
    unusedImports: [],
    deadCode: [],
    duplicateFunctions: [],
    unusedWrites: {},
    thirdPartyCode: [],
    performanceIssues: [],
  };
}

export function analyzePython(source: string): PythonAnalysis {
  const code = normalizeLineEndings(source);
  const lines = code.split("\n");

  const analysis = buildPythonAnalysisTemplate();
  const declaredFunctions = new Set<string>();
  const calledFunctions = new Set<string>();
  const declaredVars = new Set<string>();
  const usedVars = new Set<string>();
  const usedNames = new Set<string>();
  const uninitializedCandidates = new Set<string>();
  const functionHashes = new Map<string, string[]>();
  const unusedImports = new Map<string, number>();
  const unusedWrites = new Map<string, Set<string>>();

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (rawLine.endsWith(" ")) {
      analysis.styleIssues.push(`Linha ${i + 1}: espaço em branco ao final.`);
    }
    if (rawLine.includes("\t")) {
      analysis.styleIssues.push(`Linha ${i + 1}: tabulação detectada (prefira espaços).`);
    }
    if (rawLine.length > 100) {
      analysis.styleIssues.push(`Linha ${i + 1}: comprimento maior que 100 caracteres.`);
    }

    if (trimmed.startsWith("import ")) {
      const imported = trimmed
        .slice("import ".length)
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      imported.forEach((segment) => {
        const [original, alias] = segment.split(/\s+as\s+/);
        const name = (alias ?? original).trim();
        if (name) {
          unusedImports.set(name, i + 1);
        }
      });
    } else if (trimmed.startsWith("from ")) {
      const fromMatch = trimmed.match(/^from\s+([\w\.]+)\s+import\s+(.+)/);
      if (fromMatch) {
        const imports = fromMatch[2]
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        imports.forEach((segment) => {
          const [original, alias] = segment.split(/\s+as\s+/);
          const name = (alias ?? original).trim();
          if (name) {
            unusedImports.set(name, i + 1);
          }
        });
      }
    }

    if (trimmed.startsWith("def ")) {
      const functionMatch = trimmed.match(/^def\s+([A-Za-z_][\w]*)\s*\((.*)\)\s*:/);
      if (!functionMatch) {
        continue;
      }
      const [, functionName] = functionMatch;
      declaredFunctions.add(functionName);
      const block = collectBlock(lines, i);
      ensureDocstring("Função", functionName, lines, block, analysis.docstringIssues, i + 1);

    const functionBodyHash = joinBlock(lines, i, block.end);
    const hash = createHash("md5").update(functionBodyHash).digest("hex");
      const hashed = functionHashes.get(hash) ?? [];
      hashed.push(functionName);
      functionHashes.set(hash, hashed);
      if (THIRD_PARTY_HASHES.has(hash)) {
        analysis.thirdPartyCode.push({
          line: i + 1,
          description: THIRD_PARTY_HASHES.get(hash) ?? "Código de terceiros detectado",
        });
      }

      const dependenciesWrites = new Set<string>();
      const dependenciesReads = new Set<string>();
      const parameters = extractParameters(trimmed);
      parameters.forEach((param) => {
        if (!PYTHON_KEYWORDS.has(param)) {
          declaredVars.add(param);
          dependenciesWrites.add(param);
        }
      });

      let loops = 0;
      let callDepth = 0;
      let returnSeen = false;
      const baseIndent = block.baseIndent;
      const docstringIndex = findFirstContentLine(lines, block.indices);

      for (const index of block.indices) {
        const line = lines[index];
        const lineTrimmed = line.trim();
        const indent = getIndentWidth(line);
        const words = extractIdentifiers(line);
        words.forEach((word) => {
          usedNames.add(word);
          if (!PYTHON_KEYWORDS.has(word)) {
            usedVars.add(word);
            if (!dependenciesWrites.has(word) && !PYTHON_BUILTINS.has(word)) {
              dependenciesReads.add(word);
            }
          }
        });

        if (index !== docstringIndex) {
          const assignments = collectAssignments(line);
          assignments.forEach((variable) => {
            if (!PYTHON_KEYWORDS.has(variable)) {
              declaredVars.add(variable);
              dependenciesWrites.add(variable);
            }
          });
        }

        if (/^\s*print\s*\(/.test(lineTrimmed)) {
          analysis.printStatements.push({ line: index + 1, code: lineTrimmed });
        }

        if (/^\s*if\s+False\b/.test(lineTrimmed)) {
          analysis.deadCode.push({ line: index + 1, description: "Bloco 'if False' encontrado" });
        }

        if (/^[^#]*\[[0-9]+\]/.test(line)) {
          analysis.commonErrors.push({ line: index + 1, issue: "Possível IndexError detectado." });
        }

        const callMatches = line.match(/\b([A-Za-z_][\w]*)\s*\(/g);
        if (callMatches) {
          callDepth += callMatches.length;
          callMatches.forEach((match) => {
            const name = match.replace("(", "").trim();
            if (!PYTHON_KEYWORDS.has(name)) {
              calledFunctions.add(name);
            }
          });
        }

        if (/^\s*(for|while)\b/.test(lineTrimmed)) {
          loops += 1;
          const loopBlock = collectBlock(lines, index);
          const hasCallInside = loopBlock.indices.some((loopIndex) => /\b[A-Za-z_][\w]*\s*\(/.test(lines[loopIndex]));
          if (hasCallInside) {
            analysis.performanceIssues.push({
              line: index + 1,
              description: "Chamada de função dentro de loop.",
            });
          }
        }

        if (/^\s*return\b/.test(lineTrimmed) && indent <= baseIndent + 4) {
          returnSeen = true;
        } else if (
          returnSeen &&
          indent <= baseIndent + 4 &&
          lineTrimmed !== "" &&
          !lineTrimmed.startsWith("#")
        ) {
          analysis.deadCode.push({ line: index + 1, description: "Código após 'return' encontrado" });
          returnSeen = false;
        }
      }

      analysis.functionComplexity[functionName] = { loops, depth: callDepth };
      if (loops > 2 || callDepth > 10) {
        analysis.refactorSuggestions.push({
          line: i + 1,
          suggestion: `Função '${functionName}' é muito complexa. Considere refatorar.`,
        });
      }

      unusedWrites.set(functionName, dependenciesWrites);
      dependenciesReads.forEach((value) => {
        if (!PYTHON_BUILTINS.has(value)) {
          uninitializedCandidates.add(value);
        }
      });

      i = block.end;
      continue;
    }

    if (trimmed.startsWith("class ")) {
      const classMatch = trimmed.match(/^class\s+([A-Za-z_][\w]*)/);
      if (classMatch) {
        const [, className] = classMatch;
        const block = collectBlock(lines, i);
        ensureDocstring("Classe", className, lines, block, analysis.docstringIssues, i + 1);
      }
    }

    const words = extractIdentifiers(rawLine);
    words.forEach((word) => {
      usedNames.add(word);
      if (!PYTHON_KEYWORDS.has(word)) {
        usedVars.add(word);
      }
    });

    const assignments = collectAssignments(rawLine);
    assignments.forEach((variable) => {
      if (!PYTHON_KEYWORDS.has(variable)) {
        declaredVars.add(variable);
      }
    });

    if (/^\s*print\s*\(/.test(trimmed)) {
      analysis.printStatements.push({ line: i + 1, code: trimmed });
    }

    if (/^[^#]*\[[0-9]+\]/.test(rawLine)) {
      analysis.commonErrors.push({ line: i + 1, issue: "Possível IndexError detectado." });
    }

    const callMatches = rawLine.match(/\b([A-Za-z_][\w]*)\s*\(/g);
    if (callMatches) {
      callMatches.forEach((match) => {
        const name = match.replace("(", "").trim();
        if (!PYTHON_KEYWORDS.has(name)) {
          calledFunctions.add(name);
        }
      });
    }
  }

  analysis.declaredFunctions = Array.from(declaredFunctions);
  analysis.calledFunctions = Array.from(calledFunctions);
  analysis.unusedFunctions = analysis.declaredFunctions.filter(
    (fn) => !calledFunctions.has(fn),
  );

  const declaredVarList = Array.from(declaredVars);
  analysis.declaredVars = declaredVarList;
  analysis.usedVars = declaredVarList.filter((name) => usedVars.has(name));

  const filteredDeclared = new Set(declaredVarList);
  const uninitialized = Array.from(usedVars)
    .filter((name) => !filteredDeclared.has(name))
    .filter((name) => !PYTHON_BUILTINS.has(name) && !["self", "cls"].includes(name));

  analysis.unusedVars = declaredVarList.filter((name) => !usedVars.has(name));
  analysis.uninitializedVars = uninitialized;

  const unusedImportList: string[] = [];
  unusedImports.forEach((lineNumber, name) => {
    if (!usedNames.has(name)) {
      unusedImportList.push(`${name} (linha ${lineNumber})`);
    }
  });
  analysis.unusedImports = unusedImportList;

  const duplicateFunctions: string[][] = [];
  functionHashes.forEach((names) => {
    if (names.length > 1) {
      duplicateFunctions.push(names);
    }
  });
  analysis.duplicateFunctions = duplicateFunctions;

  const unusedWritesResult: Record<string, string[]> = {};
  unusedWrites.forEach((writes, functionName) => {
    const unused = Array.from(writes).filter((item) => {
      return !analysis.usedVars.includes(item);
    });
    if (unused.length > 0) {
      unusedWritesResult[functionName] = unused;
    }
  });
  analysis.unusedWrites = unusedWritesResult;

  analysis.performanceIssues = analysis.performanceIssues.filter(
    (value, index, array) =>
      array.findIndex((candidate) => candidate.line === value.line && candidate.description === value.description) ===
      index,
  );

  analysis.commonErrors = analysis.commonErrors.filter(
    (value, index, array) =>
      array.findIndex((candidate) => candidate.line === value.line && candidate.issue === value.issue) === index,
  );

  return analysis;
}
