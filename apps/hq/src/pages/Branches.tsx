import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { listBranches, saveBranches, testConnection } from '../lib/branches';
import { isBranchAuthenticated } from '../lib/hqApi';
import type { Branch } from '../types';

type ConnState = 'checking' | 'online' | 'offline';

export function Branches() {
  const [branches, setBranches] = useState<Branch[]>(() => listBranches());
  const [conn, setConn] = useState<Record<string, ConnState>>({});
  const [editing, setEditing] = useState<Branch | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    branches.forEach(branch => {
      setConn(prev => ({ ...prev, [branch.code]: 'checking' }));
      void testConnection(branch).then(ok => setConn(prev => ({ ...prev, [branch.code]: ok ? 'online' : 'offline' })));
    });
  }, [branches]);

  const persist = (next: Branch[]) => { saveBranches(next); setBranches(next); };

  return <div className="page">
    <div className="page-heading">
      <div><h1>Kelola Cabang</h1><p>Registry cabang yang dipantau dashboard pusat.</p></div>
      <button className="button primary" onClick={() => { setEditing({ code: '', name: '', apiUrl: '' }); setIsNew(true); setError(''); }}><Plus aria-hidden="true" />Tambah cabang</button>
    </div>

    <div className="panel flush"><div className="table-wrap"><table>
      <thead><tr><th>Kode</th><th>Nama</th><th>API URL</th><th>Server</th><th>Sesi</th><th /></tr></thead>
      <tbody>{branches.map(branch => <tr key={branch.code}>
        <td className="mono">{branch.code}</td>
        <td>{branch.name}</td>
        <td className="mono">{branch.apiUrl}</td>
        <td><span className={`status ${conn[branch.code] === 'online' ? 'online' : conn[branch.code] === 'offline' ? 'offline' : 'pending'}`}>{conn[branch.code] === 'online' ? 'Terhubung' : conn[branch.code] === 'offline' ? 'Offline' : 'Memeriksa…'}</span></td>
        <td><span className={`status ${isBranchAuthenticated(branch.code) ? 'online' : 'pending'}`}>{isBranchAuthenticated(branch.code) ? 'Login aktif' : 'Belum login'}</span></td>
        <td><div className="row-actions">
          <button className="button ghost" onClick={() => { setEditing(branch); setIsNew(false); setError(''); }}>Ubah</button>
          <button className="icon-button danger" aria-label={`Hapus ${branch.name}`} onClick={() => { if (confirm(`Hapus cabang ${branch.name} dari registry?`)) persist(branches.filter(b => b.code !== branch.code)); }}><Trash2 /></button>
        </div></td>
      </tr>)}</tbody>
    </table></div>
    {!branches.length && <div className="empty-state">Belum ada cabang. Tambahkan cabang pertama.</div>}</div>

    <div className="notice info" style={{ marginTop: 14 }}>
      Setiap cabang perlu punya akun HQ (role admin) yang dibuat lewat Pengaturan &gt; Pengguna di aplikasi cabang, dengan username &amp; password yang sama, agar login pusat bisa menjangkau semuanya sekaligus.
    </div>

    {editing && <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-heading"><h2>{isNew ? 'Tambah cabang' : `Ubah cabang ${editing.code}`}</h2></div>
        <div className="form-grid">
          <label>Kode<input value={editing.code} disabled={!isNew} onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase().trim() })} placeholder="CAB-02" /></label>
          <label>Nama<input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Cabang Kedua" /></label>
          <label className="span-2">API URL<input value={editing.apiUrl} onChange={e => setEditing({ ...editing, apiUrl: e.target.value.trim() })} placeholder="https://cabang2.example.com/api" /></label>
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button className="button secondary" onClick={() => setEditing(null)}>Batal</button>
          <button className="button primary" onClick={() => {
            if (!editing.code || !editing.name || !editing.apiUrl) { setError('Semua kolom wajib diisi.'); return; }
            if (isNew && branches.some(b => b.code === editing.code)) { setError('Kode cabang sudah dipakai.'); return; }
            persist(isNew ? [...branches, editing] : branches.map(b => b.code === editing.code ? editing : b));
            setEditing(null);
          }}>Simpan</button>
        </div>
      </div>
    </div>}
  </div>;
}
