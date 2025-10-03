import { AnalyzeSummary } from "../types";

interface ResultPanelProps {
  summary: AnalyzeSummary;
}

const severityClass: Record<"info" | "warning" | "success", string> = {
  warning: "card card-warning",
  info: "card card-info",
  success: "card card-success",
};

export function ResultPanel({ summary }: ResultPanelProps) {
  return (
    <section className="results">
      <header className="results__header">
        <h2>Resumo da análise</h2>
        <div className="summary">
          <span>
            Emitido em: <strong>{new Date(summary.generatedAt).toLocaleString()}</strong>
          </span>
          <span>
            Categorias com alerta: <strong>{summary.issuesCount}</strong>
          </span>
        </div>
      </header>
      <div className="results__grid">
        {summary.sections.length === 0 && (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <article key={i} className="card skeleton" style={{ height:160 }} />
            ))}
          </>
        )}
        {summary.sections.map((section) => (
          <article key={section.id} className={severityClass[section.severity]}>
            <h3>{section.title}</h3>
            {section.description ? <p className="description">{section.description}</p> : null}
            <ul>
              {section.items.map((item, index) => (
                <li key={`${section.id}-${index}`}>{item}</li>
              ))}
            </ul>
            {section.hint ? <p className="hint">Dica: {section.hint}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export default ResultPanel;
