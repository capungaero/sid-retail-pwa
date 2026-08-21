import { useEffect, useRef, useState } from 'react';
import { CirclePlus, DatabaseBackup, Printer, RefreshCw, X } from 'lucide-react';
import { backupNow, getPrinterConfig, getRolePermissions, getStoreProfile, isDemoMode, listAuditLog, listUserAccounts, savePrinterConfig, saveRolePermissions, saveStoreProfile, saveUserAccount, testPrint } from '../lib/api';
import { openBlankPreviewPopup, openReceiptPreviewPopup } from '../lib/print';
import { formatAuditEntry, togglePermission, validateStoreProfile } from '../lib/settings';
import type { AuditLogEntry, PaperWidth, PermissionKey, PrinterConfig, PrinterConnectionType, RolePermissions, StoreProfile, UserAccount, UserRole } from '../types';

const TABS = [
  { key: 'profile', label: 'Profil toko & struk' },
  { key: 'users', label: 'Pengguna & hak akses' },
  { key: 'printer', label: 'Printer thermal' },
  { key: 'backup', label: 'Backup & audit log' }
] as const;
type TabKey = typeof TABS[number]['key'];

// Shared focus-trap + Escape-to-close + focus-restore behaviour for every modal in this page.
function useModalTrap(onClose: () => void) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const box = ref.current;
    const focusable = () => Array.from(box?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])') ?? []);
    (box?.querySelector<HTMLElement>('[data-autofocus]') ?? focusable()[0])?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab') return;
      const all = focusable();
      if (!all.length) return;
      const first = all[0], last = all[all.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    box?.addEventListener('keydown', keys);
    return () => { box?.removeEventListener('keydown', keys); previous?.focus(); };
  }, [onClose]);
  return ref;
}

export function Settings() {
  const [tab, setTab] = useState<TabKey>('profile');
  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">Pengaturan</p><h1>Pengaturan</h1><p>Konfigurasi toko, pengguna, printer, dan audit{isDemoMode ? ' — mode simulasi.' : '.'}</p></div></div>
    <div className="tabs" role="tablist" aria-label="Sub modul Pengaturan">{TABS.map(t => <button key={t.key} role="tab" aria-selected={tab === t.key} className={`tab-button ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}</div>
    {tab === 'profile' && <ProfileTab />}
    {tab === 'users' && <UsersTab />}
    {tab === 'printer' && <PrinterTab />}
    {tab === 'backup' && <BackupTab />}
  </div>;
}

function ProfileTab() {
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [form, setForm] = useState<StoreProfile>({ name: '', address: '', phone: '' });
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  const load = () => { setLoading(true); setError(''); setSaved(false); getStoreProfile().then(p => { setProfile(p); setForm(p); }).catch(err => setError(err instanceof Error ? err.message : 'Gagal memuat profil toko')).finally(() => setLoading(false)); };
  useEffect(load, []);
  async function submit() {
    const errors = validateStoreProfile(form);
    if (errors.length) return setError(errors[0]);
    setSaving(true); setError(''); setSaved(false);
    try { const updated = await saveStoreProfile(form); setProfile(updated); setForm(updated); setSaved(true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan profil toko'); }
    finally { setSaving(false); }
  }
  return <>
    <section className="panel">
      <div className="panel-heading"><div><p className="eyebrow">Identitas toko</p><h2>Profil toko & struk</h2></div><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button></div>
      {loading ? <div className="empty-state">Memuat profil toko…</div> : <>
        <div className="form-grid">
          <label>Nama toko<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label>Telepon<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
          <label className="span-2">Alamat<input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
          <label>NPWP (opsional)<input value={form.taxId ?? ''} onChange={e => setForm({ ...form, taxId: e.target.value })} /></label>
          <label className="span-2">Header struk (opsional)<input value={form.receiptHeader ?? ''} onChange={e => setForm({ ...form, receiptHeader: e.target.value })} placeholder="Contoh: Terima kasih telah berbelanja" /></label>
          <label className="span-2">Footer struk (opsional)<input value={form.receiptFooter ?? ''} onChange={e => setForm({ ...form, receiptFooter: e.target.value })} placeholder="Contoh: Barang yang sudah dibeli tidak dapat ditukar" /></label>
        </div>
        {error && <div className="notice error" role="alert">{error}</div>}
        {saved && !error && <div className="notice info" role="status">Profil toko tersimpan. Struk berikutnya akan memakai data ini.</div>}
        <div className="modal-actions"><button className="button primary" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan profil'}</button></div>
      </>}
    </section>
    {profile && <section className="panel">
      <div className="panel-heading"><div><p className="eyebrow">Pratinjau</p><h2>Pratinjau struk</h2></div></div>
      <div className="mono">
        <p><strong>{form.name || 'SID Retail'}</strong></p>
        {(form.address || form.phone || form.taxId) && <p className="muted">{[form.address, form.phone, form.taxId ? `NPWP: ${form.taxId}` : ''].filter(Boolean).join(' · ')}</p>}
        {form.receiptHeader && <p>{form.receiptHeader}</p>}
        <p className="muted">— rincian barang —</p>
        <p><strong>TOTAL Rp0</strong></p>
        {form.receiptFooter && <p>{form.receiptFooter}</p>}
      </div>
    </section>}
  </>;
}

const ROLE_LABEL: Record<UserRole, string> = { kasir: 'Kasir', supervisor: 'Supervisor', admin: 'Admin' };
const PERMISSION_LABEL: Record<PermissionKey, string> = { pos: 'Transaksi', inventory: 'Persediaan', finance: 'Keuangan', reports: 'Laporan', hrd: 'HRD', settings: 'Pengaturan' };
const ROLES: UserRole[] = ['kasir', 'supervisor', 'admin'];
const PERMISSIONS: PermissionKey[] = ['pos', 'inventory', 'finance', 'reports', 'hrd', 'settings'];

function UsersTab() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [adding, setAdding] = useState(false); const [savingPerm, setSavingPerm] = useState(false);
  const load = () => { setLoading(true); setError(''); Promise.all([listUserAccounts(), getRolePermissions()]).then(([u, p]) => { setUsers(u); setPermissions(p); }).catch(err => setError(err instanceof Error ? err.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  async function toggle(role: UserRole, key: PermissionKey) {
    if (!permissions) return;
    const next = togglePermission(permissions, role, key);
    setPermissions(next); setSavingPerm(true); setError('');
    try { setPermissions(await saveRolePermissions(next)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan hak akses'); setPermissions(permissions); }
    finally { setSavingPerm(false); }
  }
  return <>
    <section className="panel flush">
      <div className="table-tools"><h2>Daftar pengguna</h2><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button><button className="button primary" onClick={() => setAdding(true)}><CirclePlus /> Tambah pengguna</button></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat pengguna…</div> : !users.length ? <div className="empty-state">Belum ada pengguna.</div> : <div className="table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th>Status</th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td>{u.name}</td><td className="mono">{u.username}</td><td>{ROLE_LABEL[u.role]}</td><td><span className={`status ${u.active ? 'success' : ''}`}>{u.active ? 'Aktif' : 'Nonaktif'}</span></td></tr>)}</tbody></table></div>}
    </section>
    <section className="panel flush">
      <div className="table-tools"><h2>Hak akses per peran</h2>{savingPerm && <span className="muted">Menyimpan…</span>}</div>
      <p className="muted" style={{ padding: '0 20px' }}>{isDemoMode ? 'Pengaturan tampilan saja (view only) — belum menegakkan RBAC nyata di demo ini.' : 'Perubahan di sini langsung berlaku pada hak akses token login setiap peran.'}</p>
      {!permissions ? <div className="empty-state">Memuat hak akses…</div> : <div className="table-wrap"><table><thead><tr><th>Modul</th>{ROLES.map(r => <th key={r} className="numeric">{ROLE_LABEL[r]}</th>)}</tr></thead><tbody>{PERMISSIONS.map(key => <tr key={key}><td>{PERMISSION_LABEL[key]}</td>{ROLES.map(role => <td key={role} className="numeric"><input type="checkbox" aria-label={`${PERMISSION_LABEL[key]} — ${ROLE_LABEL[role]}`} checked={permissions[role].includes(key)} onChange={() => toggle(role, key)} /></td>)}</tr>)}</tbody></table></div>}
    </section>
    {adding && <UserModal onClose={() => setAdding(false)} onSaved={u => { setUsers(current => [...current, u]); setAdding(false); }} />}
  </>;
}

function UserModal({ onClose, onSaved }: { onClose: () => void; onSaved: (u: UserAccount) => void }) {
  const [name, setName] = useState(''); const [username, setUsername] = useState(''); const [role, setRole] = useState<UserRole>('kasir'); const [active, setActive] = useState(true);
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const modalRef = useModalTrap(onClose);
  async function submit() {
    if (!name.trim()) return setError('Nama wajib diisi.');
    if (!username.trim()) return setError('Username wajib diisi.');
    setSaving(true); setError('');
    try { onSaved(await saveUserAccount({ name: name.trim(), username: username.trim(), role, active })); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan pengguna'); setSaving(false); }
  }
  return <div className="modal-overlay" role="presentation"><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="user-title">
    <div className="modal-heading"><div><p className="eyebrow">Pengguna</p><h2 id="user-title">Tambah pengguna</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></div>
    <label>Nama<input data-autofocus="true" value={name} onChange={e => setName(e.target.value)} /></label>
    <label>Username<input value={username} onChange={e => setUsername(e.target.value)} /></label>
    <div className="form-grid">
      <label>Peran<select value={role} onChange={e => setRole(e.target.value as UserRole)}>{ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></label>
      <label>Status<select value={active ? '1' : '0'} onChange={e => setActive(e.target.value === '1')}><option value="1">Aktif</option><option value="0">Nonaktif</option></select></label>
    </div>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Batal</button><button type="button" className="button primary" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button></div>
  </section></div>;
}

const CONNECTION_LABEL: Record<PrinterConnectionType, string> = { usb: 'USB', network: 'Jaringan (LAN/WiFi)', bluetooth: 'Bluetooth' };

function PrinterTab() {
  const [config, setConfig] = useState<PrinterConfig | null>(null);
  const [form, setForm] = useState<PrinterConfig>({ name: '', connection: 'usb', paperWidth: '58mm' });
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false); const [testResult, setTestResult] = useState('');
  const load = () => { setLoading(true); setError(''); setSaved(false); getPrinterConfig().then(c => { setConfig(c); setForm(c); }).catch(err => setError(err instanceof Error ? err.message : 'Gagal memuat konfigurasi printer')).finally(() => setLoading(false)); };
  useEffect(load, []);
  async function submit() {
    if (!form.name.trim()) return setError('Nama printer wajib diisi.');
    setSaving(true); setError(''); setSaved(false);
    try { const updated = await savePrinterConfig(form); setConfig(updated); setForm(updated); setSaved(true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi printer'); }
    finally { setSaving(false); }
  }
  async function runTestPrint() {
    setTesting(true); setTestResult(''); setError('');
    // Open the popup window synchronously inside this click handler BEFORE any await, so the
    // browser keeps the user-gesture context and doesn't block it as an unrequested popup.
    const popup = openBlankPreviewPopup();
    if (!popup) { setTesting(false); setError('Popup pratinjau diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.'); return; }
    try {
      // Fill the already-open popup with a printable sample receipt at the configured paper
      // width, using the real store profile for header/footer - this is what lets the cashier
      // confirm the physical printer works, not just an audit-log entry. The backend testPrint()
      // call still records the audit trail, but its failure must not block the real print.
      let profile: StoreProfile | undefined; try { profile = await getStoreProfile(); } catch { profile = undefined; }
      const sample = {
        invoice: 'TES-CETAK',
        customer: { id: 'general', code: 'UMUM', name: 'Pelanggan Umum', tier: 'retail' as const },
        lines: [{ productName: 'Contoh Barang A', qty: 2, unitName: 'Pcs', unitPrice: 5000, discount: 0 }, { productName: 'Contoh Barang B', qty: 1, unitName: 'Pcs', unitPrice: 12500, discount: 500 }],
        paid: 25000, total: 22000
      };
      openReceiptPreviewPopup(sample, profile, form.paperWidth, popup);
      try { await testPrint(); } catch { /* audit logging is best-effort; the print popup already opened */ }
      setTestResult('Pratinjau tes cetak dibuka. Klik "Cetak" di jendela pratinjau untuk mengirim ke printer.');
    }
    catch (err) { try { popup.close(); } catch { /* ignore */ } setError(err instanceof Error ? err.message : 'Tes cetak gagal'); }
    finally { setTesting(false); }
  }
  return <section className="panel">
    <div className="panel-heading"><div><p className="eyebrow">Konfigurasi</p><h2>Printer thermal</h2></div><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button></div>
    {loading ? <div className="empty-state">Memuat konfigurasi printer…</div> : <>
      <div className="form-grid">
        <label>Nama printer<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label>Jenis koneksi<select value={form.connection} onChange={e => setForm({ ...form, connection: e.target.value as PrinterConnectionType })}>{(Object.keys(CONNECTION_LABEL) as PrinterConnectionType[]).map(c => <option key={c} value={c}>{CONNECTION_LABEL[c]}</option>)}</select></label>
      </div>
      <div className="form-grid"><label>Lebar kertas<select value={form.paperWidth} onChange={e => setForm({ ...form, paperWidth: e.target.value as PaperWidth })}><option value="58mm">58 mm</option><option value="80mm">80 mm</option></select></label></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {saved && !error && <div className="notice info" role="status">Konfigurasi printer tersimpan.</div>}
      {testResult && !error && <div className="notice info" role="status">{testResult}</div>}
      <div className="modal-actions"><button className="button secondary" onClick={runTestPrint} disabled={testing}><Printer /> {testing ? 'Mencetak…' : 'Tes cetak'}</button><button className="button primary" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan konfigurasi'}</button></div>
      {config && <p className="muted">Printer aktif saat ini: {config.name} · {CONNECTION_LABEL[config.connection]} · {config.paperWidth}</p>}
    </>}
  </section>;
}

function BackupTab() {
  const [log, setLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [backingUp, setBackingUp] = useState(false); const [lastBackup, setLastBackup] = useState('');
  const load = () => { setLoading(true); setError(''); listAuditLog().then(setLog).catch(err => setError(err instanceof Error ? err.message : 'Gagal memuat audit log')).finally(() => setLoading(false)); };
  useEffect(load, []);
  async function runBackup() {
    setBackingUp(true); setError('');
    try { const result = await backupNow(); setLastBackup(result.createdAt); load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Backup gagal'); }
    finally { setBackingUp(false); }
  }
  return <>
    <section className="panel">
      <div className="panel-heading"><div><p className="eyebrow">Backup</p><h2>Backup data</h2></div></div>
      <div className="notice warning" role="status">{isDemoMode ? 'Mode simulasi: tombol di bawah hanya mencatat aktivitas backup, tidak menulis ke database sungguhan.' : 'Backup ini benar-benar menulis dump database ke server.'}</div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {lastBackup && <p className="muted">Backup terakhir: {new Date(lastBackup).toLocaleString('id-ID')}</p>}
      <div className="modal-actions"><button className="button primary" onClick={runBackup} disabled={backingUp}><DatabaseBackup /> {backingUp ? 'Memproses…' : 'Jalankan backup sekarang'}</button></div>
    </section>
    <section className="panel flush">
      <div className="table-tools"><h2>Audit log sesi ini</h2><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button></div>
      {loading ? <div className="empty-state">Memuat audit log…</div> : !log.length ? <div className="empty-state">Belum ada aktivitas tercatat.</div> : <div className="table-wrap"><table><thead><tr><th>Aktivitas</th></tr></thead><tbody>{log.map(entry => <tr key={entry.id}><td>{formatAuditEntry(entry)}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
