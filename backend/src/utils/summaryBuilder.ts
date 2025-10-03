import {
  CssAnalysis,
  FileType,
  HtmlAnalysis,
  JavaScriptAnalysis,
  PythonAnalysis,
  ReportSection,
  GenericAnalysis,
} from "../types";

function buildPythonSections(result: PythonAnalysis): ReportSection[] {
  const sections: ReportSection[] = [];

  if (result.unusedFunctions.length > 0) {
    sections.push({
      id: "python-unused-functions",
      title: "⚠️ Funções declaradas e não usadas",
      severity: "warning",
      items: result.unusedFunctions,
      hint: "Remova funções não utilizadas para manter o código limpo.",
    });
  }

  if (result.unusedVars.length > 0) {
    sections.push({
      id: "python-unused-vars",
      title: "⚠️ Variáveis declaradas e não usadas",
      severity: "warning",
      items: result.unusedVars,
      hint: "Remova variáveis não utilizadas para manter o código organizado.",
    });
  }

  if (result.unusedImports.length > 0) {
    sections.push({
      id: "python-unused-imports",
      title: "⚠️ Imports não utilizados",
      severity: "warning",
      items: result.unusedImports,
    });
  }

  if (result.docstringIssues.length > 0) {
    sections.push({
      id: "python-docstrings",
      title: "⚠️ Problemas de docstring",
      severity: "warning",
      items: result.docstringIssues.map((issue) => `Linha ${issue.line}: ${issue.issue}`),
      hint: "Adicione docstrings para documentar funções e classes.",
    });
  }

  if (result.deadCode.length > 0) {
    sections.push({
      id: "python-dead-code",
      title: "⚠️ Código morto encontrado",
      severity: "warning",
      items: result.deadCode.map((entry) => `Linha ${entry.line}: ${entry.description}`),
    });
  }

  if (result.duplicateFunctions.length > 0) {
    sections.push({
      id: "python-duplicate-functions",
      title: "⚠️ Funções duplicadas",
      severity: "warning",
      items: result.duplicateFunctions.map((group) => group.join(", ")),
    });
  }

  const unusedWritesItems = Object.entries(result.unusedWrites).flatMap(([fn, vars]) =>
    vars.map((variable) => `Função '${fn}': ${variable}`),
  );
  if (unusedWritesItems.length > 0) {
    sections.push({
      id: "python-unused-writes",
      title: "⚠️ Variáveis atribuídas e não utilizadas",
      severity: "warning",
      items: unusedWritesItems,
    });
  }

  if (result.uninitializedVars.length > 0) {
    sections.push({
      id: "python-uninitialized",
      title: "⚠️ Variáveis usadas antes da atribuição",
      severity: "warning",
      items: result.uninitializedVars,
    });
  }

  if (result.styleIssues.length > 0) {
    sections.push({
      id: "python-style",
      title: "⚠️ Problemas de estilo (PEP 8)",
      severity: "warning",
      items: result.styleIssues,
    });
  }

  if (result.commonErrors.length > 0) {
    sections.push({
      id: "python-common-errors",
      title: "⚠️ Padrões de erro comuns",
      severity: "warning",
      items: result.commonErrors.map((entry) => `Linha ${entry.line}: ${entry.issue}`),
    });
  }

  if (result.refactorSuggestions.length > 0) {
    sections.push({
      id: "python-refactor",
      title: "⚠️ Sugestões de refatoração",
      severity: "warning",
      items: result.refactorSuggestions.map((item) => `Linha ${item.line}: ${item.suggestion}`),
    });
  }

  if (result.thirdPartyCode.length > 0) {
    sections.push({
      id: "python-third-party",
      title: "⚠️ Código de terceiros detectado",
      severity: "warning",
      items: result.thirdPartyCode.map((entry) => `Linha ${entry.line}: ${entry.description}`),
    });
  }

  if (result.performanceIssues.length > 0) {
    sections.push({
      id: "python-performance",
      title: "⚠️ Possíveis problemas de performance",
      severity: "warning",
      items: result.performanceIssues.map((issue) => `Linha ${issue.line}: ${issue.description}`),
    });
  }

  if (result.printStatements.length > 0) {
    sections.push({
      id: "python-prints",
      title: "ℹ️ Uso de print() detectado",
      severity: "info",
      items: result.printStatements.map((entry) => `Linha ${entry.line}: ${entry.code}`),
    });
  }

  if (sections.every((section) => section.severity !== "warning")) {
    sections.push({
      id: "python-success",
      title: "✅ Nenhum problema crítico encontrado",
      severity: "success",
      items: ["O código Python analisado não apresenta alertas."],
    });
  }

  return sections;
}

function buildHtmlSections(result: HtmlAnalysis): ReportSection[] {
  const sections: ReportSection[] = [];

  if (result.unclosedTags.length > 0) {
    sections.push({
      id: "html-unclosed",
      title: "❗ Tags não fechadas",
      severity: "warning",
      items: result.unclosedTags.map((tag) => `<${tag.tag}> na linha ${tag.line}`),
    });
  }

  if (result.missingCloseTags.length > 0) {
    sections.push({
      id: "html-missing-close",
      title: "❗ Tags de fechamento sem abertura",
      severity: "warning",
      items: result.missingCloseTags.map((tag) => `</${tag.tag}> na linha ${tag.line}`),
    });
  }

  if (result.incompleteTags.length > 0) {
    sections.push({
      id: "html-incomplete",
      title: "⚠️ Tags incompletas",
      severity: "warning",
      items: result.incompleteTags.map((entry) => `${entry.snippet} (linha ${entry.line})`),
    });
  }

  if (result.duplicatedIds.length > 0) {
    sections.push({
      id: "html-duplicated-ids",
      title: "⚠️ IDs duplicados",
      severity: "warning",
      items: result.duplicatedIds,
    });
  }

  if (result.imgsWithoutAlt.length > 0) {
    sections.push({
      id: "html-img-alt",
      title: "🖼️ Imagens sem atributo alt",
      severity: "warning",
      items: result.imgsWithoutAlt.map((entry) => `${entry.snippet} (linha ${entry.line})`),
      hint: "Adicione alt às imagens para melhorar a acessibilidade.",
    });
  }

  if (result.linksWithoutHref.length > 0) {
    sections.push({
      id: "html-links-href",
      title: "🔗 Links sem href",
      severity: "warning",
      items: result.linksWithoutHref.map((entry) => `${entry.snippet} (linha ${entry.line})`),
    });
  }

  if (sections.length === 0) {
    sections.push({
      id: "html-success",
      title: "✅ Nenhum problema encontrado",
      severity: "success",
      items: ["O HTML analisado está consistente."],
    });
  }

  return sections;
}

function buildCssSections(result: CssAnalysis): ReportSection[] {
  const sections: ReportSection[] = [];

  if (result.duplicatedSelectors.length > 0) {
    sections.push({
      id: "css-duplicated-selectors",
      title: "❗ Seletores duplicados",
      severity: "warning",
      items: Array.from(new Set(result.duplicatedSelectors)),
    });
  }

  if (result.invalidSelectors.length > 0) {
    sections.push({
      id: "css-invalid-selectors",
      title: "⚠️ Seletores inválidos",
      severity: "warning",
      items: Array.from(new Set(result.invalidSelectors)),
    });
  }

  if (result.invalidProperties.length > 0) {
    sections.push({
      id: "css-invalid-properties",
      title: "⚠️ Propriedades mal formatadas",
      severity: "warning",
      items: result.invalidProperties.map(
        (entry) => `${entry.property} (seletor ${entry.selector}, linha ${entry.line})`,
      ),
    });
  }

  if (result.repeatedProperties.length > 0) {
    sections.push({
      id: "css-repeated-properties",
      title: "⚠️ Propriedades repetidas",
      severity: "warning",
      items: result.repeatedProperties.map(
        (entry) => `${entry.property} (seletor ${entry.selector}, linha ${entry.line})`,
      ),
    });
  }

  if (result.unknownProperties.length > 0) {
    sections.push({
      id: "css-unknown-properties",
      title: "⚠️ Propriedades desconhecidas",
      severity: "warning",
      items: result.unknownProperties.map(
        (entry) => `${entry.property} (seletor ${entry.selector}, linha ${entry.line})`,
      ),
    });
  }

  if (result.unusedSelectors.length > 0) {
    sections.push({
      id: "css-unused-selectors",
      title: "🔎 Seletores não utilizados",
      severity: "warning",
      items: Array.from(new Set(result.unusedSelectors)),
    });
  }

  if (sections.length === 0) {
    sections.push({
      id: "css-success",
      title: "✅ Nenhum problema encontrado",
      severity: "success",
      items: ["O CSS analisado está consistente."],
    });
  }

  return sections;
}

function buildJavaScriptSections(result: JavaScriptAnalysis): ReportSection[] {
  const sections: ReportSection[] = [];

  if (result.syntaxErrors.length > 0) {
    sections.push({
      id: "js-syntax",
      title: "❗ Erros de sintaxe",
      severity: "warning",
      items: result.syntaxErrors,
    });
  }

  if (result.unusedFunctions.length > 0) {
    sections.push({
      id: "js-unused-functions",
      title: "⚠️ Funções não utilizadas",
      severity: "warning",
      items: result.unusedFunctions.map((entry) =>
        entry.line ? `${entry.name} (linha ${entry.line})` : entry.name,
      ),
    });
  }

  if (result.unusedVariables.length > 0) {
    sections.push({
      id: "js-unused-vars",
      title: "⚠️ Variáveis não utilizadas",
      severity: "warning",
      items: result.unusedVariables.map((entry) =>
        entry.line ? `${entry.name} (linha ${entry.line})` : entry.name,
      ),
    });
  }

  if (result.varUsage.length > 0) {
    sections.push({
      id: "js-var",
      title: "⚠️ Uso de var",
      severity: "warning",
      items: result.varUsage.map((line) => `Linha ${line}`),
      hint: "Prefira let ou const para declarar variáveis.",
    });
  }

  if (result.evalUsage.length > 0) {
    sections.push({
      id: "js-eval",
      title: "⚠️ Uso de eval",
      severity: "warning",
      items: result.evalUsage.map((line) => `Linha ${line}`),
    });
  }

  if (result.documentWriteUsage.length > 0) {
    sections.push({
      id: "js-document-write",
      title: "⚠️ Uso de document.write",
      severity: "warning",
      items: result.documentWriteUsage.map((line) => `Linha ${line}`),
    });
  }

  if (result.todoComments.length > 0) {
    sections.push({
      id: "js-todo",
      title: "⚠️ Comentários TODO/FIXME",
      severity: "warning",
      items: result.todoComments.map((entry) => `${entry.comment} (linha ${entry.line})`),
    });
  }

  if (result.longLines.length > 0) {
    sections.push({
      id: "js-long-lines",
      title: "⚠️ Linhas muito longas",
      severity: "warning",
      items: result.longLines.map((line) => `Linha ${line}`),
    });
  }

  if (result.magicNumbers.length > 0) {
    sections.push({
      id: "js-magic-numbers",
      title: "⚠️ Números mágicos",
      severity: "warning",
      items: result.magicNumbers.map((entry) => `${entry.value} (linha ${entry.line})`),
    });
  }

  if (result.semicolonMissing.length > 0) {
    sections.push({
      id: "js-semicolon",
      title: "⚠️ Possível falta de ponto e vírgula",
      severity: "warning",
      items: result.semicolonMissing.map((line) => `Linha ${line}`),
    });
  }

  if (result.doubleEquals.length > 0) {
    sections.push({
      id: "js-double-equals",
      title: "⚠️ Uso de ==",
      severity: "warning",
      items: result.doubleEquals.map((line) => `Linha ${line}`),
      hint: "Prefira === para comparações estritas.",
    });
  }

  if (result.consoleLogUsage.length > 0) {
    sections.push({
      id: "js-console",
      title: "ℹ️ Uso de console.log",
      severity: "info",
      items: result.consoleLogUsage.map((line) => `Linha ${line}`),
    });
  }

  if (result.arrowFunctions.length > 0) {
    sections.push({
      id: "js-arrow-functions",
      title: "ℹ️ Funções arrow",
      severity: "info",
      items: result.arrowFunctions.map((entry) =>
        entry.line ? `${entry.name} (linha ${entry.line})` : entry.name,
      ),
    });
  }

  if (result.anonymousFunctions.length > 0) {
    sections.push({
      id: "js-anonymous-functions",
      title: "ℹ️ Funções anônimas",
      severity: "info",
      items: result.anonymousFunctions.map((entry) =>
        entry.line ? `${entry.name} (linha ${entry.line})` : entry.name,
      ),
    });
  }

  if (result.eslintProblems && result.eslintProblems.length > 0) {
    const warnings = result.eslintProblems.filter((p) => p.severity === 1);
    const errors = result.eslintProblems.filter((p) => p.severity === 2);
    if (errors.length > 0) {
      sections.push({
        id: "js-eslint-errors",
        title: "❗ Erros ESLint",
        severity: "warning",
        items: errors.map((e) => `Linha ${e.line}:${e.column} ${e.message} (${e.ruleId || 'sem-regra'})`),
      });
    }
    if (warnings.length > 0) {
      sections.push({
        id: "js-eslint-warnings",
        title: "⚠️ Warnings ESLint",
        severity: "warning",
        items: warnings.map((e) => `Linha ${e.line}:${e.column} ${e.message} (${e.ruleId || 'sem-regra'})`),
      });
    }
  }

  if (sections.every((section) => section.severity !== "warning")) {
    sections.push({
      id: "js-success",
      title: "✅ Nenhum problema crítico encontrado",
      severity: "success",
      items: ["O JavaScript analisado não apresenta alertas."],
    });
  }

  return sections;
}

function buildGenericSections(result: GenericAnalysis): ReportSection[] {
  const sections: ReportSection[] = [];
  sections.push({
    id: "generic-overview",
    title: "📄 Estatísticas básicas",
    severity: "info",
    items: [
      `Total de linhas: ${result.lines}`,
      `Funções detectadas: ${result.functions.length}`,
      `Linhas de comentário (heurística): ${result.comments}`,
    ],
  });
  if (result.info.length) {
    sections.push({
      id: "generic-info",
      title: "ℹ️ Observações",
      severity: "info",
      items: result.info,
    });
  }
  sections.push({
    id: "generic-success",
    title: "✅ Análise básica concluída",
    severity: "success",
    items: ["Suporte experimental - métricas limitadas."],
  });
  return sections;
}

export function buildSections(fileType: FileType, result: PythonAnalysis | HtmlAnalysis | CssAnalysis | JavaScriptAnalysis | GenericAnalysis): {
  sections: ReportSection[];
  issuesCount: number;
} {
  let sections: ReportSection[] = [];
  switch (fileType) {
    case "py":
      sections = buildPythonSections(result as PythonAnalysis);
      break;
    case "html":
      sections = buildHtmlSections(result as HtmlAnalysis);
      break;
    case "css":
      sections = buildCssSections(result as CssAnalysis);
      break;
    case "js":
      sections = buildJavaScriptSections(result as JavaScriptAnalysis);
      break;
    case "rb":
    case "php":
    case "go":
      sections = buildGenericSections(result as GenericAnalysis);
      break;
    default:
      sections = [];
  }

  const issuesCount = sections.filter((section) => section.severity === "warning").length;
  return { sections, issuesCount };
}
