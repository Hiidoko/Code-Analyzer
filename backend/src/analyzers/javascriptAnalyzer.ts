import { JavaScriptAnalysis } from "../types";

const IDENTIFIER_REGEX = /\b([A-Za-z_][\w]*)\b/g;

function normalize(source: string): string[] {
  return source.replace(/\r\n?/g, "\n").split("\n");
}

export function analyzeJavaScript(source: string): JavaScriptAnalysis {
  const lines = normalize(source);
  const declaredFunctions = new Map<string, number | null>();
  const calledFunctions: string[] = [];
  const declaredVariables = new Map<string, number | null>();
  const usedVariables = new Set<string>();

  const varUsage: number[] = [];
  const letUsage: number[] = [];
  const constUsage: number[] = [];
  const evalUsage: number[] = [];
  const documentWriteUsage: number[] = [];
  const todoComments: Array<{ comment: string; line: number }> = [];
  const longLines: number[] = [];
  const magicNumbers: Array<{ value: string; line: number }> = [];
  const semicolonMissing: number[] = [];
  const arrowFunctions: Array<{ name: string; line: number | null }> = [];
  const anonymousFunctions: Array<{ name: string; line: number | null }> = [];
  const doubleEquals: number[] = [];
  const tripleEquals: number[] = [];
  const consoleLogUsage: number[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();

    const functionMatch = line.match(/\s*function\s+([A-Za-z_][\w]*)\s*\(/);
    if (functionMatch) {
      declaredFunctions.set(functionMatch[1], lineNumber);
    }

    const arrowMatch = line.match(/\s*(?:const|let|var)\s+([A-Za-z_][\w]*)\s*=\s*\(?.*\)?\s*=>/);
    if (arrowMatch) {
      declaredFunctions.set(arrowMatch[1], lineNumber);
      arrowFunctions.push({ name: arrowMatch[1], line: lineNumber });
    }

    const anonMatch = line.match(/\s*(?:const|let|var)\s+([A-Za-z_][\w]*)\s*=\s*function\s*\(/);
    if (anonMatch) {
      declaredFunctions.set(anonMatch[1], lineNumber);
      anonymousFunctions.push({ name: anonMatch[1], line: lineNumber });
    }

    for (const varMatch of line.matchAll(/\b(?:let|const|var)\s+([A-Za-z_][\w]*)/g)) {
      declaredVariables.set(varMatch[1], lineNumber);
    }

    if (/\bvar\b/.test(line)) {
      varUsage.push(lineNumber);
    }
    if (/\blet\b/.test(line)) {
      letUsage.push(lineNumber);
    }
    if (/\bconst\b/.test(line)) {
      constUsage.push(lineNumber);
    }
    if (/\beval\s*\(/.test(line)) {
      evalUsage.push(lineNumber);
    }
    if (/document\.write\s*\(/.test(line)) {
      documentWriteUsage.push(lineNumber);
    }
    if (/\/\/.*(TODO|FIXME)/i.test(line)) {
      todoComments.push({ comment: trimmed, line: lineNumber });
    }
    if (line.length > 120) {
      longLines.push(lineNumber);
    }

    for (const numberMatch of line.matchAll(/[^A-Za-z_](-?\d+(?:\.\d+)?)/g)) {
      const value = numberMatch[1];
      if (value !== "0" && value !== "1") {
        magicNumbers.push({ value, line: lineNumber });
      }
    }

    if (
      trimmed !== "" &&
      !trimmed.startsWith("//") &&
      !/[;{}:]$/.test(trimmed) &&
      /[\w)\]\'"]$/.test(trimmed)
    ) {
      semicolonMissing.push(lineNumber);
    }

    if (trimmed.includes("==") && !trimmed.includes("!==") && !trimmed.includes("===")) {
      doubleEquals.push(lineNumber);
    }

    if (trimmed.includes("===")) {
      tripleEquals.push(lineNumber);
    }

    if (/console\.log\s*\(/.test(line)) {
      consoleLogUsage.push(lineNumber);
    }

    for (const callMatch of line.matchAll(/\b([A-Za-z_][\w]*)\s*\(/g)) {
      calledFunctions.push(callMatch[1]);
    }

    for (const identifier of line.matchAll(IDENTIFIER_REGEX)) {
      usedVariables.add(identifier[1]);
    }
  });

  const openBraceCount = lines.reduce(
    (total, line) => total + (line.match(/\{/g) ?? []).length,
    0,
  );
  const closeBraceCount = lines.reduce(
    (total, line) => total + (line.match(/\}/g) ?? []).length,
    0,
  );
  const openParenCount = lines.reduce(
    (total, line) => total + (line.match(/\(/g) ?? []).length,
    0,
  );
  const closeParenCount = lines.reduce(
    (total, line) => total + (line.match(/\)/g) ?? []).length,
    0,
  );

  const syntaxErrors: string[] = [];
  if (openBraceCount !== closeBraceCount) {
    syntaxErrors.push(
      `Quantidade de '{' (${openBraceCount}) diferente de '}' (${closeBraceCount}).`,
    );
  }
  if (openParenCount !== closeParenCount) {
    syntaxErrors.push(
      `Quantidade de '(' (${openParenCount}) diferente de ')' (${closeParenCount}).`,
    );
  }

  const declaredFunctionEntries = Array.from(declaredFunctions.entries());
  const unusedFunctions = declaredFunctionEntries
    .filter(([name]) => !calledFunctions.includes(name))
    .map(([name, line]) => ({ name, line }));

  const declaredFunctionsFormatted = declaredFunctionEntries.map(([name, line]) => ({ name, line }));

  const declaredVariableEntries = Array.from(declaredVariables.entries());
  const unusedVariables = declaredVariableEntries
    .filter(([name]) => !usedVariables.has(name))
    .map(([name, line]) => ({ name, line }));

  const declaredVariablesFormatted = declaredVariableEntries.map(([name, line]) => ({ name, line }));

  return {
    declaredFunctions: declaredFunctionsFormatted,
    unusedFunctions,
    declaredVariables: declaredVariablesFormatted,
    unusedVariables,
    syntaxErrors,
    varUsage,
    letUsage,
    constUsage,
    evalUsage,
    documentWriteUsage,
    todoComments,
    longLines,
    magicNumbers,
    semicolonMissing,
    arrowFunctions,
    anonymousFunctions,
    doubleEquals,
    tripleEquals,
    consoleLogUsage,
  };
}
