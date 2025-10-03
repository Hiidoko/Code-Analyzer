import { useEffect, useState } from 'react';
import api from '../api';
import { MetricsOverview, FileType } from '../types';

interface MetricsDashboardProps {
  onSelectHistory(id: string): void;
}

function bar(width: number) {
  return { width: `${width}%` };
}

export function MetricsDashboard({ onSelectHistory }: MetricsDashboardProps) {
  const [metrics, setMetrics] = useState<MetricsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/metrics');
      setMetrics(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (error) return <section className="panel" id="metricas"><h2>Métricas</h2><p className="error">{error}</p></section>;
  if (!metrics) return <section className="panel" id="metricas"><h2>Métricas</h2>
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {[1,2,3].map(i => <div key={i} className="skeleton-line" style={{ width: i===1? '60%':'40%', height:12 }} />)}
      <div className="skeleton-line" style={{ width:'80%', height:10 }} />
      <div className="skeleton-line" style={{ width:'70%', height:10 }} />
    </div>
  </section>;

  const max = Object.values(metrics.byLanguage).reduce((m, v) => Math.max(m, v), 0) || 1;

  return (
    <section className="panel" id="metricas">
      <div className="panel__header-row">
        <h2>Métricas</h2>
        <button type="button" onClick={load} disabled={loading}>{loading ? '...' : 'Atualizar'}</button>
      </div>
      <p>Total de análises: <strong>{metrics.totalAnalyses}</strong></p>
      <p>Média de issues por análise: <strong>{metrics.avgIssues.toFixed(2)}</strong></p>
      <div className="lang-metrics">
        {Object.entries(metrics.byLanguage).map(([lang, count]) => (
          <div key={lang} className="lang-metric-row">
            <span className="lang-label">{lang}</span>
            <div className="bar-bg"><div className="bar-fill" style={bar((count / max) * 100)} /></div>
            <span className="count">{count}</span>
          </div>
        ))}
      </div>
      <h3>Últimas análises</h3>
      <ul className="mini-history">
        {metrics.lastAnalyses.map(item => (
          <li key={item.id}>
            <button type="button" onClick={() => onSelectHistory(item.id)}>
              {item.fileType} • {item.issues} issues • {new Date(item.createdAt).toLocaleString()}
            </button>
          </li>
        ))}
        {metrics.lastAnalyses.length === 0 && <li>Nenhuma análise.</li>}
      </ul>
    </section>
  );
}

export default MetricsDashboard;