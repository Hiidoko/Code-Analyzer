import { FormEvent, useEffect, useState, useMemo } from 'react';
import zxcvbn from 'zxcvbn';
import api from '../api';
import { AuthUser } from '../types';

interface AuthPanelProps {
  onAuth(user: AuthUser): void;
}

export function AuthPanel({ onAuth }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  function passwordScore(pw: string) {
    const req = {
      length: pw.length >= 8,
      lower: /[a-z]/.test(pw),
      upper: /[A-Z]/.test(pw),
      digit: /\d/.test(pw),
      special: /[^A-Za-z0-9]/.test(pw),
    };
    if (!pw) return { score: 0, label: 'Muito fraca', requirements: req, crack: '', z: null as any };
    const zx = zxcvbn(pw);
    const score = zx.score; // 0..4
    const labels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Excelente'];
    const crack = zx.crack_times_display.offline_slow_hashing_1e4_per_second;
    return { score, label: labels[score], requirements: req, crack, z: zx };
  }

  const pwInfo = useMemo(() => passwordScore(password), [password]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('prefill_register')) {
      localStorage.removeItem('prefill_register');
      setMode('register');
      setEmail('');
      setPassword('');
    }
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        // bloqueia submissão se força < 2 (Razoável)
        if (pwInfo.score < 2) {
          setError('A senha é muito fraca. Atenda aos requisitos mínimos.');
          return;
        }
        await api.post('/auth/register', { email, password });
      }
      const loginRes = await api.post('/auth/login', { email, password });
      if (remember) {
        sessionStorage.removeItem('auth_token');
        localStorage.setItem('auth_token', loginRes.data.token);
      } else {
        localStorage.removeItem('auth_token');
        sessionStorage.setItem('auth_token', loginRes.data.token);
      }
      onAuth(loginRes.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Falha na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel auth-panel-refined">
      <div className="auth-header-row">
        <div className="auth-switch" role="tablist" aria-label="Alternar entre entrar e registrar">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >Entrar</button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >Criar conta</button>
        </div>
      </div>
      <p className="auth-sublead">Analise qualidade, estilo e riscos de múltiplas linguagens em segundos.</p>
      <form onSubmit={submit} className="auth-form refined" noValidate>
        <div className="form-group">
          <label data-testid="auth-email">
            <span className="field-label">E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete={mode === 'login' ? 'email' : 'new-email'} />
          </label>
        </div>
        <div className="form-group password-group">
          <label data-testid="auth-password">
            <span className="field-label row">
              <span>Senha</span>
              {mode === 'register' && <span className="field-hint">Mínimo 8 caracteres</span>}
            </span>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                onFocus={() => setShowPolicy(true)}
                onBlur={() => setShowPolicy(false)}
                aria-describedby={mode === 'register' ? 'pw-policy' : undefined}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="toggle-pass"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >{showPassword ? 'Ocultar' : 'Mostrar'}</button>
            </div>
          </label>
          {mode === 'register' && (
            <div className="pw-dynamic" aria-live="polite">
              <div className="pw-bar multi">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i <= pwInfo.score ? 'seg on' : 'seg'} />
                ))}
              </div>
              <div className="pw-meta"><strong>{pwInfo.label}</strong>{pwInfo.crack && <span className="crack">≈ {pwInfo.crack}</span>}</div>
              {showPolicy && (
                <ul id="pw-policy" className="pw-reqs compact">
                  <li className={pwInfo.requirements.length ? 'ok' : 'nok'}>8+ chars</li>
                  <li className={pwInfo.requirements.lower ? 'ok' : 'nok'}>minúscula</li>
                  <li className={pwInfo.requirements.upper ? 'ok' : 'nok'}>maiúscula</li>
                  <li className={pwInfo.requirements.digit ? 'ok' : 'nok'}>número</li>
                  <li className={pwInfo.requirements.special ? 'ok' : 'nok'}>símbolo</li>
                </ul>
              )}
            </div>
          )}
        </div>
        {mode === 'login' && (
          <div className="form-inline-row">
            <label className="remember">
              <input type="checkbox" checked={remember} onChange={(e)=> setRemember(e.target.checked)} /> Manter conectado
            </label>
            <span className="security-note">Senha protegida e não armazenada em texto plano.</span>
          </div>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="primary-actions">
          <button
            type="submit"
            disabled={loading || (mode === 'register' && pwInfo.score < 2)}
            className="submit-btn"
          >{loading ? '...' : (mode === 'login' ? 'Entrar' : 'Criar conta')}</button>
          {mode === 'register' && pwInfo.score < 2 && (
            <div className="hint weak-hint">Fortaleça a senha para ativar o cadastro.</div>
          )}
        </div>
        <div className="secondary-actions">
          <button
            type="button"
            className="link-like demo"
            disabled={loading}
            onClick={async () => {
              setMode('login');
              setError(null);
              setLoading(true);
              try {
                const demoRes = await api.post('/auth/demo');
                localStorage.setItem('auth_token', demoRes.data.token);
                onAuth(demoRes.data.user);
              } catch {
                try {
                  setEmail('user@email.com');
                  setPassword('user');
                  await new Promise(r => setTimeout(r, 60));
                  const loginRes = await api.post('/auth/login', { email: 'user@email.com', password: 'user' });
                  localStorage.setItem('auth_token', loginRes.data.token);
                  onAuth(loginRes.data.user);
                } catch (err2: any) {
                  setError(err2.response?.data?.error || 'Falha ao autenticar demo');
                }
              } finally {
                setLoading(false);
              }
            }}
          >Testar a Demo</button>
        </div>
      </form>
    </section>
  );
}

export default AuthPanel;