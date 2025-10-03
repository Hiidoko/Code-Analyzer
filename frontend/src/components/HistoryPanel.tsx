import { useEffect, useState } from 'react';
import api from '../api';
import { HistoryItem } from '../types';

interface HistoryPanelProps {
  onSelect(id: string): void;
}

export function HistoryPanel({ onSelect }: HistoryPanelProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/history');
      setItems(res.data.items);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <section className="panel" id="historico">
      <div className="panel__header-row">
        <h2>Histórico</h2>
        <button type="button" onClick={load} disabled={loading}>{loading ? '...' : 'Recarregar'}</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <ul className="history-list">
        {loading && items.length === 0 && (
          Array.from({ length: 4 }).map((_,i) => (
            <li key={i} className="skeleton" style={{ height:48, borderRadius:10, background:'var(--c-bg-alt)', position:'relative' }} />
          ))
        )}
        {items.map(item => (
          <li key={item.id}>
            <button type="button" onClick={() => onSelect(item.id)} className="history-item-btn">
              <span className="lang-tag">{item.fileType}</span>
              <span className="fname">{item.fileName || '(sem nome)'}</span>
              <span className="issues">{item.issues} issues</span>
              <time>{new Date(item.createdAt).toLocaleString()}</time>
            </button>
          </li>
        ))}
        {items.length === 0 && !loading && <li>Nenhuma análise ainda.</li>}
      </ul>
    </section>
  );
}

export default HistoryPanel;