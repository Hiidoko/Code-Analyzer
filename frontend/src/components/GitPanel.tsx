import { useState, useRef } from 'react';
import api from '../api';
import { GitRepositoryAnalysis, GitProgressEvent } from '../types';

interface GitPanelProps {
  onResult(report: GitRepositoryAnalysis): void;
}

export default function GitPanel({ onResult }: GitPanelProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressText, setProgressText] = useState<string>('');
  const [useStream, setUseStream] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);

  const abortStream = () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setLoading(false);
  };

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) {
      setError('Informe uma URL de repositório Git');
      return;
    }
    setError(null);
    setProgressText('Iniciando...');
    setLoading(true);
    if (useStream) {
      try {
        // Para SSE, precisamos enviar um POST e depois abrir EventSource? Simplificação: backend usa POST direto.
        // Usaremos fetch para inicializar SSE via endpoint /api/git/analyze/stream (não padrão GET, mas suportaremos via EventSource poly se necessário).
        // Como EventSource padrão não suporta POST, fallback: usar fetch streaming (simplificado) -> aqui adotamos fallback para requisição normal.
        // Então manteremos request normal se useStream true até mudar backend para GET.
        const token = localStorage.getItem('auth_token');
        const res = await api.post<GitRepositoryAnalysis>('/git/analyze', { repoUrl, branch: branch || undefined });
        onResult(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Falha na análise');
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      const res = await api.post<GitRepositoryAnalysis>('/git/analyze', { repoUrl, branch: branch || undefined });
      onResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Falha na análise');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <h2>Repositório Git</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          placeholder="https://github.com/usuario/repo.git"
          value={repoUrl}
          onChange={e => setRepoUrl(e.target.value)}
          disabled={loading}
        />
        <input
          placeholder="branch (opcional)"
            value={branch}
            onChange={e => setBranch(e.target.value)}
            disabled={loading}
        />
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <label style={{ display:'flex', gap:4, fontSize:12 }}>
            <input type="checkbox" checked={useStream} onChange={e => setUseStream(e.target.checked)} disabled={loading} />
            Streaming (placeholder)
          </label>
        </div>
        <button type="button" onClick={handleAnalyze} disabled={loading}>{loading ? 'Analisando...' : 'Analisar Repositório'}</button>
        {loading && progressText && <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>{progressText}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </section>
  );
}
