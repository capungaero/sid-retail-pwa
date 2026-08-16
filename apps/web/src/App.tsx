import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Boxes, Building2, ChevronLeft, CircleDollarSign, ClipboardList, Gauge, LogOut, Menu, PackageSearch, ReceiptText, Settings, ShoppingCart, UsersRound, Wifi, WifiOff, X } from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Pos } from './pages/Pos';
import { Inventory } from './pages/Inventory';
import { Finance } from './pages/Finance';
import { Reports } from './pages/Reports';
import { Hrd } from './pages/Hrd';
import { Settings as SettingsPage } from './pages/Settings';
import { ModuleOverview } from './pages/ModuleOverview';
import { isDemoMode, login as apiLogin, logout as apiLogout } from './lib/api';

const sections = [
  { label: 'Ringkasan', path: '/dashboard', icon: Gauge, ready: true },
  { label: 'Master Data', path: '/master', icon: PackageSearch, ready: true },
  { label: 'Transaksi', path: '/pos', icon: ShoppingCart, ready: true },
  { label: 'Persediaan', path: '/inventory', icon: Boxes, ready: true },
  { label: 'Keuangan', path: '/finance', icon: CircleDollarSign, ready: true },
  { label: 'Laporan', path: '/reports', icon: ReceiptText, ready: true },
  { label: 'HRD', path: '/hrd', icon: UsersRound, ready: true },
  { label: 'Pengaturan', path: '/settings', icon: Settings, ready: true }
];

const moduleInfo: Record<string, { title: string; description: string; items: string[] }> = {};

function Login({ onLogin }: { onLogin: () => void }) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  return <main className="login-page"><section className="login-panel" aria-labelledby="login-title">
    <div className="brand-mark"><Building2 aria-hidden="true" /><span>SID</span></div>
    <p className="eyebrow">Sistem Informasi Dagang</p><h1 id="login-title">Masuk ke SID Retail</h1><p className="muted">Gunakan akun karyawan untuk memulai shift.</p>
    {isDemoMode && <div className="notice warning" role="status">Mode demo aktif — belum terhubung ke MariaDB.</div>}
    <form onSubmit={async e => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      const username = String(data.get('username') ?? ''); const password = String(data.get('password') ?? '');
      if (!username || !password) { setError('Username dan password wajib diisi.'); return; }
      if (isDemoMode) { onLogin(); return; }
      setPending(true); setError('');
      try { await apiLogin(username, password); onLogin(); }
      catch (err) { setError(err instanceof Error ? err.message : 'Login gagal.'); }
      finally { setPending(false); }
    }}>
      <label>Username<input name="username" autoComplete="username" defaultValue={isDemoMode ? 'kasir' : ''} autoFocus /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" defaultValue={isDemoMode ? 'demo123' : ''} /></label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="button primary full" type="submit" disabled={pending}>{pending ? 'Memeriksa…' : 'Masuk'}</button>
    </form>
    {isDemoMode && <p className="login-help">Demo: kasir / demo123</p>}
  </section></main>;
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false); const [online, setOnline] = useState(navigator.onLine); const location = useLocation();
  useEffect(() => { const yes = () => setOnline(true); const no = () => setOnline(false); window.addEventListener('online', yes); window.addEventListener('offline', no); return () => { window.removeEventListener('online', yes); window.removeEventListener('offline', no); }; }, []);
  useEffect(() => setOpen(false), [location.pathname]);
  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark compact"><Building2 aria-hidden="true" /><span>SID</span></div><button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Tutup menu"><X /></button></div>
      <nav aria-label="Navigasi utama">{sections.map(item => <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><item.icon aria-hidden="true" /><span>{item.label}</span>{!item.ready && <span className="nav-status">Segera</span>}</NavLink>)}</nav>
      <div className="sidebar-footer"><span className={`connection ${online ? 'online' : 'offline'}`}>{online ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}{online ? 'Terhubung' : 'Offline'}</span><button className="nav-link logout" onClick={onLogout}><LogOut aria-hidden="true" />Keluar</button></div>
    </aside>
    {open && <button className="scrim" aria-label="Tutup menu" onClick={() => setOpen(false)} />}
    <main className="workspace"><header className="topbar"><button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Buka menu"><Menu /></button><div><strong>{import.meta.env.VITE_STORE_NAME || 'SID Retail'}</strong><span>Terminal KASIR-01</span></div>{isDemoMode && <span className="demo-badge" title="Data simulasi; tidak menulis ke database lama">Mode simulasi</span>}<div className="topbar-user"><span className="avatar">KA</span><div><strong>Kasir Demo</strong><span>Kasir</span></div></div></header>
      {!online && <div className="offline-banner" role="alert"><WifiOff /> Koneksi terputus. Transaksi finansial tidak dapat diselesaikan.</div>}
      <div className="page-area"><Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/master" element={<Products />} />
        <Route path="/pos" element={<Pos online={online} />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/hrd" element={<Hrd />} />
        <Route path="/settings" element={<SettingsPage />} />
        {Object.entries(moduleInfo).map(([key, value]) => <Route key={key} path={`/${key}`} element={<ModuleOverview {...value} />} />)}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes></div>
    </main>
  </div>;
}

export function App() {
  const [loggedIn, setLoggedIn] = useState(() => isDemoMode ? sessionStorage.getItem('sid-session') === 'demo' : Boolean(sessionStorage.getItem('sid-token')));
  if (!loggedIn) return <Login onLogin={() => { if (isDemoMode) sessionStorage.setItem('sid-session', 'demo'); setLoggedIn(true); }} />;
  return <Shell onLogout={() => { sessionStorage.removeItem('sid-session'); void apiLogout(); setLoggedIn(false); }} />;
}
