import { useEffect, useRef, useState } from 'react';
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
  const [progressText, setProgressText] = useState('');
  const [useStream, setUseStream] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reqIdRef = useRef<string | null>(null);
  const finishedRef = useRef(false);

  const closeStream = () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  };

  const finalizeStream = () => {
    closeStream();
    reqIdRef.current = null;
    finishedRef.current = true;
    setLoading(false);
  };

  useEffect(() => () => closeStream(), []);

  const describeProgress = (event: GitProgressEvent) => {
    if (event.phase === 'start') {
      if (!event.totalCandidates) {
        return 'Nenhum arquivo candidato encontrado.';
      }
      return `Encontrados ${event.totalCandidates} arquivos candidatos.`;
    }
    if (event.phase === 'file') {
      const percent = event.total ? Math.round((event.analyzed / event.total) * 100) : 0;
      return `Analisando (${event.analyzed}/${event.total}, ${percent}%): ${event.path}`;
    }
    return `Resumo: ${event.analyzed} analisados, ${event.skipped} ignorados.`;
  };

  const parseMessage = <T,>(raw: MessageEvent<string>): T | null => {
    try {
      return JSON.parse(raw.data) as T;
    } catch (err) {
      console.warn('Falha ao interpretar mensagem SSE', err, raw.data);
      return null;
    }
  };

  const handleCancel = async () => {
    finishedRef.current = true;
    setProgressText('Cancelando...');
    closeStream();
    const reqId = reqIdRef.current;
    reqIdRef.current = null;
    setLoading(false);
    if (!reqId) {
      setProgressText('Análise cancelada.');
      return;
    }
    try {
      await api.post('/git/analyze/cancel', { reqId });
      setProgressText('Análise cancelada.');
    } catch (err) {
      console.warn('Falha ao cancelar stream ativo', err);
      setProgressText('Análise cancelada (erro ao notificar servidor).');
    }
  };

  const startStream = () => {
    if (typeof window !== 'undefined' && !('EventSource' in window)) {
      setError('Este navegador não suporta streaming SSE.');
      setLoading(false);
      return;
    }

    closeStream();
    const trimmedRepo = repoUrl.trim();
    const trimmedBranch = branch.trim();
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    const params = new URLSearchParams();
    params.set('repoUrl', trimmedRepo);
    if (trimmedBranch) {
      params.set('branch', trimmedBranch);
    }
    if (token) {
      params.set('token', token);
    }
    const url = `/api/git/analyze/stream?${params.toString()}`;

    try {
      const evtSource = new EventSource(url);
      eventSourceRef.current = evtSource;
      reqIdRef.current = null;
      finishedRef.current = false;
      setProgressText('Conectando ao servidor...');

      const handleStreamError = (raw: Event) => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        if (raw instanceof MessageEvent && raw.data) {
          const payload = parseMessage<{ message?: string }>(raw);
          setError(payload?.message || 'Erro ao processar análise.');
        } else {
          setError('Conexão com o servidor perdida.');
        }
        finalizeStream();
      };

      evtSource.addEventListener('meta', (raw) => {
        const data = parseMessage<{ reqId: string }>(raw as MessageEvent<string>);
        if (data?.reqId) {
          reqIdRef.current = data.reqId;
        }
      });

      evtSource.addEventListener('progress', (raw) => {
        const data = parseMessage<GitProgressEvent>(raw as MessageEvent<string>);
        if (data) {
          setProgressText(describeProgress(data));
        }
      });

      evtSource.addEventListener('done', (raw) => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const data = parseMessage<GitRepositoryAnalysis>(raw as MessageEvent<string>);
        if (data) {
          setProgressText('Análise concluída!');
          onResult(data);
        }
        finalizeStream();
      });

      evtSource.addEventListener('cancelled', () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        setProgressText('Análise cancelada pelo servidor.');
        finalizeStream();
      });

      evtSource.addEventListener('error', handleStreamError);
    } catch (err) {
      console.error('Falha ao abrir EventSource', err);
      setError('Não foi possível iniciar o streaming SSE.');
      finalizeStream();
    }
  };

  const handleAnalyze = async () => {
    const trimmedRepo = repoUrl.trim();
    if (!trimmedRepo) {
      setError('Informe uma URL de repositório Git');
      return;
    }
    setError(null);
    setProgressText('Iniciando...');
    setLoading(true);

    if (useStream) {
      startStream();
      return;
    }

    try {
      const res = await api.post<GitRepositoryAnalysis>('/git/analyze', {
        repoUrl: trimmedRepo,
        branch: branch.trim() || undefined,
      });
      setProgressText('Análise concluída!');
      onResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Falha na análise');
      setProgressText('');
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
          onChange={(e) => setRepoUrl(e.target.value)}
          disabled={loading}
        />
        <input
          placeholder="branch (opcional)"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          disabled={loading}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 4, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={useStream}
              onChange={(e) => setUseStream(e.target.checked)}
              disabled={loading}
            />
            Streaming SSE
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={handleAnalyze} disabled={loading}>
            {loading ? 'Analisando...' : 'Analisar Repositório'}
          </button>
          {loading && useStream && (
            <button type="button" onClick={handleCancel}>
              Cancelar
            </button>
          )}
        </div>
        {progressText && <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>{progressText}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </section>
  );
}
