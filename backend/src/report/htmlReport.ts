import { AnalyzeSummary, FileType } from "../types.js";

export interface HtmlReportOptions {
  fileType: FileType;
  summary: AnalyzeSummary;
  fileName?: string;
}

const FILE_TYPE_LABELS: Record<FileType, string> = {
  py: "Python",
  js: "JavaScript",
  html: "HTML",
  css: "CSS",
  rb: "Ruby",
  php: "PHP",
  go: "Go",
};

const SEVERITY_CLASS: Record<"info" | "warning" | "success", string> = {
  warning: "warning",
  info: "info",
  success: "success",
};

export function createHtmlReport({ fileType, summary, fileName }: HtmlReportOptions): string {
  const sections = summary.sections
    .map((section) => {
      const items = section.items
        .map((item) => `<li class="item">${item}</li>`)
        .join("\n");
      const hint = section.hint ? `<p class="hint">Dica: ${section.hint}</p>` : "";
      const description = section.description ? `<p>${section.description}</p>` : "";
      return `
      <section class="card ${SEVERITY_CLASS[section.severity]}">
        <h2>${section.title}</h2>
        ${description}
        <ul>${items}</ul>
        ${hint}
      </section>
      `;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="utf-8" />
  <title>Relatório de Análise de Código</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 32px; }
    h1 { color: #38bdf8; }
    .meta { margin-bottom: 24px; }
    .grid { display: grid; gap: 16px; }
    .card { padding: 16px 20px; border-radius: 12px; background: #1e293b; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.3); }
    .card.warning { border-left: 4px solid #f97316; }
    .card.info { border-left: 4px solid #38bdf8; }
    .card.success { border-left: 4px solid #22c55e; }
    h2 { margin-top: 0; }
    ul { padding-left: 20px; }
    .hint { color: #facc15; font-style: italic; margin-top: 8px; }
  </style>
</head>
<body>
  <h1>Relatório de Análise de Código</h1>
  <div class="meta">
    <p><strong>Arquivo:</strong> ${fileName ?? "não informado"}</p>
    <p><strong>Tipo:</strong> ${FILE_TYPE_LABELS[fileType]}</p>
    <p><strong>Emissão:</strong> ${new Date(summary.generatedAt).toLocaleString()}</p>
    <p><strong>Categorias com alerta:</strong> ${summary.issuesCount}</p>
  </div>
  <div class="grid">
    ${sections}
  </div>
</body>
</html>`;
}
