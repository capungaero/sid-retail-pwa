import { useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { SidMark } from '@web/SidMark';
import { listBranches } from '../lib/branches';
import { loginAllBranches, loginBranch } from '../lib/hqApi';
import type { LoginResult } from '../lib/hqApi';

// One credential, tried against every registered branch in parallel. The owner provisions an
// identical 'hq' admin account on each branch (Pengaturan > Pengguna di aplikasi cabang);
// branches that fail show their own error and can be retried individually.
export function Login({ onLogin }: { onLogin: () => void }) {
  const [branches] = useState(() => listBranches());
  const [results, setResults] = useState<LoginResult[] | null>(null);
  const [pending, setPending] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [error, setError] = useState('');

  const okCount = results?.filter(r => r.ok).length ?? 0;

  return <main className="login-page"><section className="login-panel" aria-labelledby="login-title">
    <div className="brand-mark"><SidMark /><span>SID</span></div>
    <p className="eyebrow">Kantor Pusat</p><h1 id="login-title">Masuk ke SID Pusat</h1>
    <p className="muted">Kredensial dicoba ke semua cabang terdaftar ({branches.length} cabang).</p>
    <form onSubmit={async e => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      const username = String(data.get('username') ?? ''); const password = String(data.get('password') ?? '');
      if (!username || !password) { setError('Username dan password wajib diisi.'); return; }
      if (!branches.length) { setError('Belum ada cabang terdaftar.'); return; }
      setPending(true); setError('');
      const loginResults = await loginAllBranches(branches, username, password);
      setResults(loginResults);
      setPending(false);
      if (!loginResults.some(r => r.ok)) setError('Login gagal di semua cabang.');
    }}>
      <label>Username<input name="username" autoComplete="username" autoFocus /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" /></label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="button primary full" type="submit" disabled={pending}>{pending ? 'Menghubungi cabang…' : 'Masuk'}</button>
    </form>
    {results && <>
      <ul className="login-branch-list">
        {results.map(r => <li key={r.branch.code}>
          <span>{r.ok ? <CheckCircle2 aria-hidden="true" style={{ color: 'var(--success)', verticalAlign: 'middle' }} /> : <XCircle aria-hidden="true" style={{ color: 'var(--danger)', verticalAlign: 'middle' }} />} {r.branch.name}</span>
          {!r.ok && <>
            <span className="branch-error">{r.error}</span>
            <button className="icon-button" aria-label={`Coba lagi ${r.branch.name}`} disabled={retrying === r.branch.code} onClick={async () => {
              const form = document.querySelector<HTMLFormElement>('.login-panel form');
              const data = form ? new FormData(form) : null;
              const username = String(data?.get('username') ?? ''); const password = String(data?.get('password') ?? '');
              if (!username || !password) return;
              setRetrying(r.branch.code);
              try {
                await loginBranch(r.branch, username, password);
                setResults(prev => prev?.map(x => x.branch.code === r.branch.code ? { branch: x.branch, ok: true } : x) ?? null);
              } catch (err) {
                setResults(prev => prev?.map(x => x.branch.code === r.branch.code ? { branch: x.branch, ok: false, error: err instanceof Error ? err.message : 'Login gagal.' } : x) ?? null);
              } finally { setRetrying(null); }
            }}><RefreshCw /></button>
          </>}
        </li>)}
      </ul>
      {okCount > 0 && <button className="button primary full" style={{ marginTop: 14 }} onClick={onLogin}>
        Lanjut ke dashboard ({okCount}/{results.length} cabang terhubung)
      </button>}
    </>}
  </section></main>;
}
