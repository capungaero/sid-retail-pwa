import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Boxes, ChevronLeft, CircleDollarSign, ClipboardList, Gauge, LogOut, Menu, PackageSearch, ReceiptText, RefreshCw, Settings, ShoppingCart, UsersRound, Wifi, WifiOff, X } from 'lucide-react';
import { SidMark } from './SidMark';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Products } from './pages/Products';
import { Pos } from './pages/Pos';
import { Inventory } from './pages/Inventory';
import { Finance } from './pages/Finance';
import { Reports } from './pages/Reports';
import { Hrd } from './pages/Hrd';
import { Settings as SettingsPage } from './pages/Settings';
import { ModuleOverview } from './pages/ModuleOverview';
import { getStoredUser, isDemoMode, login as apiLogin, logout as apiLogout, setUnauthorizedHandler } from './lib/api';
import type { AuthUser } from './lib/api';
import { resolveRole } from './lib/permissions';
import { demoRolePermissions } from './data';
import type { PermissionKey } from './types';

// `permission: null` (Ringkasan) is the one section with no matching row in Pengaturan > Hak
// akses per peran — it's a cross-module overview, so it's shown to any role that manages more
// than pure checkout (i.e. has some permission besides 'pos'), and hidden for a bare kasir who
// only ever needs the Transaksi screen. Every other section maps 1:1 to a permission checkbox.
const sections: { label: string; path: string; icon: typeof Gauge; ready: boolean; permission: PermissionKey | null }[] = [
  { label: 'Ringkasan', path: '/dashboard', icon: Gauge, ready: true, permission: null },
  { label: 'Master Data', path: '/master', icon: PackageSearch, ready: true, permission: 'inventory' },
  { label: 'Transaksi', path: '/pos', icon: ShoppingCart, ready: true, permission: 'pos' },
  { label: 'Persediaan', path: '/inventory', icon: Boxes, ready: true, permission: 'inventory' },
  { label: 'Keuangan', path: '/finance', icon: CircleDollarSign, ready: true, permission: 'finance' },
  { label: 'Laporan', path: '/reports', icon: ReceiptText, ready: true, permission: 'reports' },
  { label: 'HRD', path: '/hrd', icon: UsersRound, ready: true, permission: 'hrd' },
  { label: 'Pengaturan', path: '/settings', icon: Settings, ready: true, permission: 'settings' }
];

function sectionVisible(section: { permission: PermissionKey | null }, granted: PermissionKey[]): boolean {
  if (section.permission === null) return granted.some(k => k !== 'pos');
  return granted.includes(section.permission);
}

// Riwayat transaksi isn't a sidebar section (only reachable via Dashboard's "Lihat semua" link),
// but it's still a real route that needs the same guard — same visibility rule as Ringkasan,
// since it's a Dashboard-adjacent reporting view a bare kasir has no reason to be looking at.
const guardedRoutes: { path: string; permission: PermissionKey | null }[] = [...sections, { path: '/transactions', permission: null }];

function isPathAllowed(pathname: string, granted: PermissionKey[]): boolean {
  const route = guardedRoutes.find(r => r.path === pathname);
  return !route || sectionVisible(route, granted);
}

const moduleInfo: Record<string, { title: string; description: string; items: string[] }> = {};

function Login({ onLogin }: { onLogin: (user?: AuthUser) => void }) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  return <main className="login-page"><section className="login-panel" aria-labelledby="login-title">
    <div className="brand-mark"><SidMark /><span>SID</span></div>
    <p className="eyebrow">Sistem Informasi Dagang</p><h1 id="login-title">Masuk ke SID Retail</h1><p className="muted">Gunakan akun karyawan untuk memulai shift.</p>
    {isDemoMode && <div className="notice warning" role="status">Mode demo aktif — belum terhubung ke MariaDB.</div>}
    <form onSubmit={async e => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      const username = String(data.get('username') ?? ''); const password = String(data.get('password') ?? '');
      if (!username || !password) { setError('Username dan password wajib diisi.'); return; }
      if (isDemoMode) { onLogin(); return; }
      setPending(true); setError('');
      try { const user = await apiLogin(username, password); onLogin(user); }
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}

function Shell({ user, onLogout }: { user: AuthUser | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false); const [online, setOnline] = useState(navigator.onLine); const location = useLocation();
  useEffect(() => { const yes = () => setOnline(true); const no = () => setOnline(false); window.addEventListener('online', yes); window.addEventListener('offline', no); return () => { window.removeEventListener('online', yes); window.removeEventListener('offline', no); }; }, []);
  useEffect(() => setOpen(false), [location.pathname]);

  // Demo mode has no real logged-in user, but its persona is displayed as "Kasir" — resolved to
  // 'kasir' here too so the demo build shows the same restricted nav a real kasir account would.
  const role = resolveRole(user?.role ?? (isDemoMode ? 'kasir' : undefined));
  // Comes straight from the login response now (AuthController computes it server-side), not a
  // separate GET /settings/role-permissions call — that route requires settings:read, which most
  // roles don't have, so a role could never learn its own scope that way. Demo mode has no real
  // login response, so it falls back to the demo role-permission seed for the 'kasir' persona.
  const granted = user?.permissions ?? (isDemoMode ? demoRolePermissions.kasir : []);
  const visibleSections = sections.filter(s => sectionVisible(s, granted));
  const defaultPath = visibleSections[0]?.path ?? '/dashboard';

  // Filtering the nav alone doesn't stop someone from already being on (or navigating straight
  // to) a route their role can't see there — e.g. still on /dashboard from before a logout, then
  // logging back in as a kasir. Route access itself needs the same permission check, not just
  // what's rendered in the sidebar.
  const navigate = useNavigate();
  useEffect(() => {
    if (!isPathAllowed(location.pathname, granted)) navigate(defaultPath, { replace: true });
  }, [location.pathname, granted, defaultPath, navigate]);

  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark compact"><SidMark /><span>SID</span></div><button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Tutup menu"><X /></button></div>
      <nav aria-label="Navigasi utama">{visibleSections.map(item => <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><item.icon aria-hidden="true" /><span>{item.label}</span>{!item.ready && <span className="nav-status">Segera</span>}</NavLink>)}</nav>
      <div className="sidebar-footer"><span className={`connection ${online ? 'online' : 'offline'}`}>{online ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}{online ? 'Terhubung' : 'Offline'}</span><button className="nav-link logout" onClick={onLogout}><LogOut aria-hidden="true" />Keluar</button></div>
    </aside>
    {open && <button className="scrim" aria-label="Tutup menu" onClick={() => setOpen(false)} />}
    <main className="workspace"><header className="topbar"><button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Buka menu"><Menu /></button><div><strong>{import.meta.env.VITE_STORE_NAME || 'SID Retail'}</strong><span>Terminal KASIR-01</span></div>{isDemoMode && <span className="demo-badge" title="Data simulasi; tidak menulis ke database lama">Mode simulasi</span>}<div className="topbar-user"><span className="avatar">{user ? initials(user.name) : 'KA'}</span><div><strong>{user ? user.name : 'Kasir Demo'}</strong><span>{user ? user.role : 'Kasir'}</span></div></div></header>
      {!online && <div className="offline-banner" role="alert"><WifiOff /> Koneksi terputus. Transaksi finansial tidak dapat diselesaikan.</div>}
      <div className="page-area"><Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/master" element={<Products />} />
        <Route path="/pos" element={<Pos online={online} />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/hrd" element={<Hrd />} />
        <Route path="/settings" element={<SettingsPage />} />
        {Object.entries(moduleInfo).map(([key, value]) => <Route key={key} path={`/${key}`} element={<ModuleOverview {...value} />} />)}
        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Routes></div>
    </main>
  </div>;
}

// A POS kiosk tab can stay open for days without a hard reload, so the browser never re-checks
// sw.js on its own. Without this, a cashier can be stuck running a build from before some
// backend change (e.g. checkout starting to require a payment method) with no way to know why
// their app is broken — the fix from their side is invisible (just "reload the page"), but they
// have no signal telling them to. Polls hourly on top of vite-plugin-pwa's own checks and shows
// a dismissible-by-action banner instead of forcing a reload, since an in-progress cart is only
// held in memory and a forced reload mid-sale would lose it.
function UpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => { registration.update().catch(() => {}); }, 60 * 60 * 1000);
    },
  });
  if (!needRefresh) return null;
  return <div className="update-banner" role="status">
    <RefreshCw aria-hidden="true" />
    <span>Versi baru tersedia. Muat ulang saat tidak ada transaksi berjalan.</span>
    <button className="button primary" onClick={() => updateServiceWorker(true)}>Muat ulang</button>
  </div>;
}

export function App() {
  const [loggedIn, setLoggedIn] = useState(() => isDemoMode ? sessionStorage.getItem('sid-session') === 'demo' : Boolean(sessionStorage.getItem('sid-token')));
  // Rehydrated from sessionStorage (set alongside the token on login) so the topbar shows the
  // real user on every page, not just the one rendered in the same tick as the login response —
  // component state alone doesn't survive navigation/reload, sessionStorage does.
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  // Registers with api.ts's plain-module 401 hook so an expired/revoked token cleanly returns
  // the app to the login screen instead of leaving the Shell rendered with a broken panel.
  useEffect(() => {
    setUnauthorizedHandler(() => { setUser(null); setLoggedIn(false); });
    return () => setUnauthorizedHandler(null);
  }, []);

  if (!loggedIn) return <><UpdateBanner /><Login onLogin={authUser => { if (isDemoMode) sessionStorage.setItem('sid-session', 'demo'); setUser(authUser ?? null); setLoggedIn(true); }} /></>;
  return <><UpdateBanner /><Shell user={user} onLogout={() => { sessionStorage.removeItem('sid-session'); setUser(null); void apiLogout(); setLoggedIn(false); }} /></>;
}
