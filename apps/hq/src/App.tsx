import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowLeftRight, Boxes, Building2, CircleDollarSign, Gauge, LogOut, Menu, Network, ReceiptText, UserCog, UsersRound, X } from 'lucide-react';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Sales } from './pages/Sales';
import { Stock } from './pages/Stock';
import { StockOps } from './pages/StockOps';
import { Attendance } from './pages/Attendance';
import { Cash } from './pages/Cash';
import { Accounts } from './pages/Accounts';
import { Branches } from './pages/Branches';
import { getStoredUser, logoutAllBranches } from './lib/hqApi';
import { listBranches } from './lib/branches';
import type { AuthUser } from './lib/hqApi';

const sections = [
  { label: 'Ringkasan', path: '/dashboard', icon: Gauge },
  { label: 'Penjualan', path: '/sales', icon: ReceiptText },
  { label: 'Stok', path: '/stock', icon: Boxes },
  { label: 'Operasi Stok', path: '/stock-ops', icon: ArrowLeftRight },
  { label: 'Absensi', path: '/attendance', icon: UsersRound },
  { label: 'Kas', path: '/cash', icon: CircleDollarSign },
  { label: 'Akun Cabang', path: '/accounts', icon: UserCog },
  { label: 'Kelola Cabang', path: '/branches', icon: Network }
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}

function Shell({ user, onLogout }: { user: AuthUser | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark compact"><Building2 aria-hidden="true" /><span>SID</span></div><button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Tutup menu"><X /></button></div>
      <nav aria-label="Navigasi utama">{sections.map(item => <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><item.icon aria-hidden="true" /><span>{item.label}</span></NavLink>)}</nav>
      <div className="sidebar-footer"><button className="nav-link logout" onClick={onLogout}><LogOut aria-hidden="true" />Keluar</button></div>
    </aside>
    {open && <button className="scrim" aria-label="Tutup menu" onClick={() => setOpen(false)} />}
    <main className="workspace">
      <header className="topbar">
        <button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Buka menu"><Menu /></button>
        <div><strong>SID Pusat</strong><span>Dashboard Kantor Pusat</span></div>
        <div className="topbar-user"><span className="avatar">{user ? initials(user.name) : 'HQ'}</span><div><strong>{user ? user.name : 'Kantor Pusat'}</strong><span>{user ? user.role : ''}</span></div></div>
      </header>
      <div className="page-area"><Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/stock-ops" element={<StockOps />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/cash" element={<Cash />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/branches" element={<Branches />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes></div>
    </main>
  </div>;
}

export function App() {
  // "Logged in" = at least one branch login succeeded this tab (getStoredUser is written on the
  // first success). Per-branch session gaps are surfaced inside each page, not here.
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  if (!user) return <Login onLogin={() => setUser(getStoredUser())} />;
  return <Shell user={user} onLogout={() => { void logoutAllBranches(listBranches()); setUser(null); }} />;
}
