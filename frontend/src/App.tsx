import { ChangeEvent, useEffect, useMemo, useState, useRef } from "react";
import ResultPanel from "./components/ResultPanel";
import { AnalyzeResponse, AnalyzeSummary, FileType, AuthUser, GitRepositoryAnalysis } from "./types";
import GitPanel from "./components/GitPanel";
import AuthPanel from "./components/AuthPanel";
import HistoryPanel from "./components/HistoryPanel";
import MetricsDashboard from "./components/MetricsDashboard";
import api from "./api";

const extensionToType: Record<string, FileType> = {
  py: "py",
  js: "js",
  mjs: "js",
  cjs: "js",
  html: "html",
  htm: "html",
  css: "css",
  rb: "rb",
  php: "php",
  go: "go",
};

const fileTypeLabels: Record<FileType, string> = {
  py: "Python (.py)",
  js: "JavaScript (.js)",
  html: "HTML (.html)",
  css: "CSS (.css)",
  rb: "Ruby (.rb)",
  php: "PHP (.php)",
  go: "Go (.go)",
};

function guessFileType(fileName: string): FileType | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension) {
    return null;
  }
  return extensionToType[extension] ?? null;
}

function buildDownloadName(fileName: string | null, extension: string, fallback: string): string {
  const base = fileName?.replace(/\.[^.]+$/, "") ?? fallback;
  return `${base}.${extension}`;
}

function App() {
  const [code, setCode] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<FileType>("py");
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawResult, setShowRawResult] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [historySelected, setHistorySelected] = useState<string | null>(null);
  const [loadingHistoryItem, setLoadingHistoryItem] = useState(false);
  const [gitReport, setGitReport] = useState<GitRepositoryAnalysis | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('theme_pref') as 'dark' | 'light') || 'dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [activeSection, setActiveSection] = useState<string>('entrada');
  const [showAbout, setShowAbout] = useState(false);
  const aboutInitialRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // restore sidebar preference
    const stored = localStorage.getItem('sidebar_collapsed');
    if (stored) {
      setSidebarCollapsed(stored === '1');
    }
    const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
    if (!token) return;
    api.get("/metrics").then(() => {
      setUser({ id: "me", email: "sessao@local", role: "user" });
    }).catch(() => {
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark','theme-light');
    root.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
    localStorage.setItem('theme_pref', theme);
    root.classList.add('theme-switching');
    const t = setTimeout(()=> root.classList.remove('theme-switching'), 500);
    return () => clearTimeout(t);
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showAbout) {
          setShowAbout(false);
          return;
        }
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showAbout]);

  // foco inicial no modal
  useEffect(() => {
    if (showAbout && aboutInitialRef.current) {
      aboutInitialRef.current.focus();
    }
  }, [showAbout]);

  // Scrollspy
  useEffect(() => {
    const sectionIds = ['entrada','historico','git','metricas','resultado'];
    const els = sectionIds.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
            setActiveSection(id);
        }
      });
    }, { rootMargin:'-45% 0px -45% 0px', threshold:[0, 0.25, 0.5, 1] });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [analysis, gitReport]);

  // persist sidebar state
  useEffect(()=> { localStorage.setItem('sidebar_collapsed', sidebarCollapsed ? '1':'0'); }, [sidebarCollapsed]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const text = loadEvent.target?.result;
      if (typeof text === "string") {
        setCode(text);
        setAnalysis(null);
      }
    };
    reader.readAsText(file);
    setFileName(file.name);
    const guessed = guessFileType(file.name);
    if (guessed) {
      setFileType(guessed);
    }
  };

  const handleAnalyze = async () => {
    if (!code.trim()) {
      setError("Cole ou selecione um arquivo com conteúdo antes de analisar.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<AnalyzeResponse>("/analyze", {
        code,
        fileType,
        fileName,
      });
      setAnalysis(response.data);
    } catch (err) {
      console.error(err);
      setError("Não foi possível analisar o código. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = async (format: "pdf" | "html" | "csv" | "json") => {
    if (!code.trim()) {
      setError("Nenhum código disponível para gerar relatório.");
      return;
    }

    try {
      const response = await api.post(`/report/${format}`, {
        code,
        fileType,
        fileName,
      }, {
        responseType: format === 'json' ? 'json' : 'blob',
      });
      const blob = new Blob([response.data], {
        type: format === "pdf" ? "application/pdf" : (format === 'html' ? 'text/html' : (format === 'csv' ? 'text/csv' : 'application/json')),
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = buildDownloadName(fileName, format, `relatorio-${fileType}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Falha ao gerar o relatório. Tente novamente.");
    }
  };

  const copySummaryToClipboard = async () => {
    if (!analysis) {
      return;
    }
    const text = JSON.stringify(analysis, null, 2);
    await navigator.clipboard.writeText(text);
  };

  const summary: AnalyzeSummary | null = analysis?.summary ?? null;
  const rawResult = useMemo(() => (analysis ? JSON.stringify(analysis, null, 2) : ""), [analysis]);

  if (!user) {
    return (
      <div className="auth-layout auth-split">
        <div className="auth-hero">
          <div className="hero-inner">
            <h1 className="hero-title">
              <span className="gradient-text">Code Analyzer</span>
              <span className="subtitle">Qualidade de código em tempo real</span>
            </h1>
            <p className="hero-lead">
              Identifique problemas, riscos e oportunidades de melhoria em <strong>Python</strong>, <strong>JavaScript</strong>, <strong>HTML</strong>, <strong>CSS</strong> e mais — em segundos.
            </p>
            <ul className="feature-list">
              <li>⚡ Análise instantânea e leve</li>
              <li>🧪 Relatórios estruturados (PDF, HTML, JSON, CSV)</li>
              <li>🛡️ Lint integrado (ESLint) + métricas de qualidade</li>
              <li>📊 Histórico e dashboard de evolução</li>
              <li>🌐 Análise de repositórios Git</li>
            </ul>
            {/* mini-cta removida conforme solicitação */}
          </div>
          <div className="hero-bg-accent" aria-hidden="true" />
        </div>
        <div className="auth-card side glass">
          <AuthPanel onAuth={(u) => setUser(u)} />
          <footer className="login-footer">
            <span>© {new Date().getFullYear()} Code Analyzer</span>
            <span className="dot">•</span>
            <a href="https://github.com/Hiidoko/Code-Analyzer" target="_blank" rel="noreferrer">GitHub</a>
          </footer>
        </div>
      </div>
    );
  }

  const loadHistoryItem = async (id: string) => {
    setLoadingHistoryItem(true);
    try {
      const res = await api.get(`/history/${id}`);
      setAnalysis(res.data);
      setHistorySelected(id);
    } catch (err) {
      setError('Erro ao carregar análise do histórico');
    } finally {
      setLoadingHistoryItem(false);
    }
  };

  const hasQuickStats = !!analysis || !!gitReport;
  return (
    <div className={`app app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="topbar">
        <div className="brand" title="Code Analyzer">
          <span className="brand-main">Code <span className="accent">Analyzer</span></span>
          {user.email === 'user@email.com' && <span className="env-badge" title="Sessão de Demonstração">Demo</span>}
        </div>
        <button
          type="button"
          aria-label={sidebarCollapsed ? 'Expandir navegação' : 'Recolher navegação'}
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed(c => !c)}
        >{sidebarCollapsed ? '☰' : '❮'}</button>
        <div className="topbar-center">
          <div className="quick-stats" aria-label="Resumo rápido">
            {hasQuickStats ? (
              <>
                <div className="qs-item" title="Issues encontradas na última análise">
                  <span className="label">Issues</span>
                  <span className="value warn">{analysis ? (analysis.summary?.issuesCount ?? 0) : '--'}</span>
                </div>
                <div className="qs-item" title="Arquivos analisados do repositório">
                  <span className="label">Git Files</span>
                  <span className="value info">{gitReport ? gitReport.filesAnalyzed : '--'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="qs-item skeleton">
                  <span className="label">Issues</span>
                  <span className="value warn skeleton-line" style={{ width: 30 }} />
                </div>
                <div className="qs-item skeleton">
                  <span className="label">Git Files</span>
                  <span className="value info skeleton-line" style={{ width: 40 }} />
                </div>
              </>
            )}
          </div>
        </div>
        <div className="user-zone">
          <button
            type="button"
            className="theme-toggle"
            aria-label="Alternar tema"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          >{theme === 'dark' ? '🌞' : '🌙'}</button>
          <div className="user-chip" title={user.email} onClick={() => setShowUserMenu(m => !m)} aria-haspopup="true" aria-expanded={showUserMenu} ref={userMenuRef}>
            <div className="avatar-seed">{user.email.slice(0,2).toUpperCase()}</div>
            <div className="user-meta">
              <span className="u-mail">{user.email}</span>
              <span className="u-role">{user.role}</span>
            </div>
            {showUserMenu && (
              <div className="user-pop" role="menu">
                <div className="pop-section">
                  <span className="pop-label">Sessão</span>
                  <div className="pop-email" title={user.email}>{user.email}</div>
                </div>
                <div className="pop-section">
                  <button type="button" role="menuitem" className="pop-btn" disabled>Chave API (em breve)</button>
                  <button type="button" role="menuitem" className="pop-btn" onClick={() => { setShowAbout(true); setShowUserMenu(false); }}>Sobre</button>
                  <button
                    type="button"
                    role="menuitem"
                    className="pop-btn danger"
                    onClick={() => {
                      localStorage.removeItem('auth_token');
                      sessionStorage.removeItem('auth_token');
                      setUser(null);
                    }}
                  >Sair</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <aside className="sidebar" aria-label="Navegação principal">
        <nav>
          <ul>
            <li><a className={activeSection==='entrada' ? 'active' : ''} href="#entrada"><span className="nav-ico" aria-hidden="true">{/* Code icon */}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></span><span className="nav-label">Entrada</span></a></li>
            <li><a className={activeSection==='historico' ? 'active' : ''} href="#historico"><span className="nav-ico" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span><span className="nav-label">Histórico</span></a></li>
            <li><a className={activeSection==='git' ? 'active' : ''} href="#git"><span className="nav-ico" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M6 9v2a6 6 0 0 0 6 6"/><path d="M18 9v2a6 6 0 0 1-6 6"/></svg></span><span className="nav-label">Git</span></a></li>
            <li><a className={activeSection==='metricas' ? 'active' : ''} href="#metricas"><span className="nav-ico" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="19" x2="4" y2="10"/><line x1="12" y1="19" x2="12" y2="4"/><line x1="20" y1="19" x2="20" y2="14"/></svg></span><span className="nav-label">Métricas</span></a></li>
            <li><a className={activeSection==='resultado' ? 'active' : ''} href="#resultado"><span className="nav-ico" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4h6l1 2h4v14H4V6h4z"/><path d="M10 12l2 2 4-4"/></svg></span><span className="nav-label">Resultado</span></a></li>
          </ul>
        </nav>
      </aside>
      <header className="app__header intro-block">
        <div className="intro-text">
          <h1 className="page-title">Análises Multilíngue & Métricas</h1>
          <p className="subtitle-line">Envie código, gere relatórios, acompanhe histórico e inspecione repositórios Git com feedback rápido.</p>
        </div>
      </header>
      {user.email === 'sessao@local' && (
        <div className="demo-banner banner-shift">
          <strong>Sessão de Demonstração:</strong> alterações e histórico são temporários. <button
            type="button"
            className="link-btn"
            onClick={() => {
              localStorage.setItem('prefill_register', '1');
              localStorage.removeItem('auth_token');
              setUser(null);
            }}
          >Crie sua própria conta</button> para salvar de forma isolada.
        </div>
      )}

      <main className="app__content app__grid">
        <section id="entrada" className="panel span-2">
          <h2>Entrada</h2>
          <div className="input-group">
            <label className="file-input">
              <span>Selecione um arquivo</span>
              <input type="file" accept=".py,.js,.html,.css,.rb,.php,.go" onChange={handleFileChange} />
            </label>
            <div className="select-group">
              <label htmlFor="fileType">Tipo do arquivo</label>
              <select
                id="fileType"
                value={fileType}
                onChange={(event) => setFileType(event.target.value as FileType)}
              >
                {Object.entries(fileTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <textarea
            value={code}
            placeholder="Cole o código aqui ou selecione um arquivo para começar."
            onChange={(event) => setCode(event.target.value)}
            rows={18}
          />
          <div className="actions wrap">
            <button type="button" className="primary" onClick={handleAnalyze} disabled={isLoading}>
              {isLoading ? "Analisando..." : "Analisar"}
            </button>
            <button type="button" onClick={() => downloadReport("pdf")} disabled={isLoading}>PDF</button>
            <button type="button" onClick={() => downloadReport("html")} disabled={isLoading}>HTML</button>
            <button type="button" onClick={() => downloadReport("csv")} disabled={isLoading}>CSV</button>
            <button type="button" onClick={() => downloadReport("json")} disabled={isLoading}>JSON</button>
            <button type="button" onClick={copySummaryToClipboard} disabled={!analysis}>
              Copiar resultado
            </button>
            <button type="button" onClick={() => setShowRawResult((value) => !value)} disabled={!analysis}>
              {showRawResult ? "Ocultar JSON" : "Ver JSON"}
            </button>
            {historySelected && <span className="badge">Exibindo histórico</span>}
          </div>
          {error ? <p className="error" role="alert">{error}</p> : null}
          {fileName ? <p className="file-name">Arquivo selecionado: {fileName}</p> : null}
          {loadingHistoryItem && <p>Carregando análise salva...</p>}
        </section>

        <div id="historico" className="anchor-wrapper"><HistoryPanel onSelect={loadHistoryItem} /></div>
        <div id="git" className="anchor-wrapper"><GitPanel onResult={(r) => { setGitReport(r); }} /></div>
        <div id="metricas" className="anchor-wrapper"><MetricsDashboard onSelectHistory={loadHistoryItem} /></div>
        {summary ? <div id="resultado" className="anchor-wrapper"><ResultPanel summary={summary} /></div> : <section id="resultado" className="panel"><h2>Sem resultado</h2><p>Execute uma análise para ver o resumo.</p></section>}
        {gitReport && (
          <section className="panel span-2">
            <h2>Resultado Git</h2>
            <p><strong>Repositório:</strong> {gitReport.repoUrl} {gitReport.branch && <span>({gitReport.branch})</span>}</p>
            <p><strong>Arquivos analisados:</strong> {gitReport.filesAnalyzed} | <strong>Ignorados:</strong> {gitReport.skipped} | <strong>Issues totais:</strong> {gitReport.totalIssues}</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:12, margin:'12px 0' }}>
              {Object.entries(gitReport.byLanguage).map(([lang, stats]) => (
                <div key={lang} style={{ background:'#1e293b', padding:'8px 12px', borderRadius:8, fontSize:12 }}>
                  <strong>{lang}</strong>: {stats.files} arquivos / {stats.issues} issues
                </div>
              ))}
            </div>
            <details>
              <summary style={{ cursor:'pointer' }}>Arquivos ({gitReport.files.length})</summary>
              <ul style={{ listStyle:'none', padding:0, margin:'12px 0', display:'flex', flexDirection:'column', gap:6, maxHeight:300, overflow:'auto' }}>
                {gitReport.files.map(f => (
                  <li key={f.path} style={{ background:'#0f172a', padding:'6px 10px', borderRadius:6, fontSize:12, display:'flex', gap:8 }}>
                    <span style={{ background:'#334155', padding:'2px 6px', borderRadius:4 }}>{f.fileType}</span>
                    <span style={{ flex:1 }}>{f.path}</span>
                    <span style={{ color:'#fbbf24' }}>{f.issuesCount} issues</span>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        )}
        {showRawResult && analysis ? (
          <section className="panel">
            <h2>Resultado bruto (JSON)</h2>
            <pre className="code-block">{rawResult}</pre>
          </section>
        ) : null}
      </main>
      {showAbout && (
        <div className="modal-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowAbout(false); }}>
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title">
            <header className="modal-header">
              <h2 id="about-title">Sobre o Code Analyzer</h2>
              <button type="button" aria-label="Fechar" className="close-btn" onClick={() => setShowAbout(false)}>×</button>
            </header>
            <div className="modal-body">
              <p><strong>Code Analyzer</strong> é uma ferramenta focada em inspeção rápida de qualidade de código e geração de relatórios para múltiplas linguagens.</p>
              <div className="about-grid">
                <section>
                  <h3>Pilares</h3>
                  <ul>
                    <li>Análise multi‑linguagem (Python, JS, HTML, CSS, genérico)</li>
                    <li>Lint integrado (ESLint) + sumarização</li>
                    <li>Relatórios exportáveis (PDF / HTML / CSV / JSON)</li>
                    <li>Histórico & métricas agregadas</li>
                    <li>Análise de repositórios Git (limites & progresso)</li>
                    <li>UX focada em clareza e velocidade</li>
                  </ul>
                </section>
                <section>
                  <h3>Tecnologias</h3>
                  <ul>
                    <li><strong>Frontend:</strong> React + Vite + TypeScript</li>
                    <li><strong>Estilo:</strong> CSS custom (design system leve)</li>
                    <li><strong>Backend:</strong> Node.js / Express / TypeScript</li>
                    <li><strong>Lint:</strong> ESLint API programática</li>
                    <li><strong>Relatórios:</strong> PDFKit & HTML templates</li>
                    <li><strong>Git:</strong> simple-git + parsing seletivo</li>
                    <li><strong>Auth:</strong> JWT (in‑memory store)</li>
                  </ul>
                </section>
                <section>
                  <h3>Recursos Avançados</h3>
                  <ul>
                    <li>Theme switching (light/dark)</li>
                    <li>SSE / streaming (em evolução)</li>
                    <li>Skeleton loading & feedback instantâneo</li>
                    <li>Scrollspy & navegação contextual</li>
                    <li>Estrutura pronta para chaves de API</li>
                  </ul>
                </section>
                <section>
                  <h3>Próximos Passos</h3>
                  <ul>
                    <li>Integração de linters extras (Python)</li>
                    <li>Persistência externa (DB)</li>
                    <li>Alertas em tempo real mais granulares</li>
                    <li>API pública & tokens de acesso</li>
                  </ul>
                </section>
              </div>
              <div className="credits">
                <p><strong>Versão:</strong> 1.0.0 (preview). Criado para demonstrar arquitetura modular e foco em DX.</p>
              </div>
            </div>
            <footer className="modal-footer">
              <button ref={aboutInitialRef} type="button" className="primary" onClick={() => setShowAbout(false)}>Fechar</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
