import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { UserAccount, UserRole } from '@web/types';
import { listBranches } from '../lib/branches';
import { branchRequest } from '../lib/hqApi';
import type { Branch } from '../types';

type Draft = { id?: string; name: string; username: string; role: UserRole; active: boolean; password: string };
const emptyDraft: Draft = { name: '', username: '', role: 'kasir', active: true, password: '' };

// Account management is scoped to app_user_settings — legacy karyawan logins are read-only by
// design (created/maintained by the legacy desktop tooling, not this stack).
export function Accounts() {
  const [branches] = useState(() => listBranches());
  const [selected, setSelected] = useState<Branch | null>(branches[0] ?? null);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');

  const load = (branch: Branch) => {
    setLoading(true); setError('');
    branchRequest<UserAccount[]>(branch, '/settings/users')
      .then(setAccounts)
      .catch(err => { setError(err instanceof Error ? err.message : 'Permintaan gagal.'); setAccounts([]); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { if (selected) load(selected); }, [selected]);

  const save = async (input: Draft) => {
    if (!selected) return;
    setSaving(true); setModalError('');
    try {
      const body: Record<string, unknown> = { name: input.name, username: input.username, role: input.role, active: input.active };
      if (input.password) body.password = input.password;
      await branchRequest<UserAccount>(selected, `/settings/users${input.id ? `/${input.id}` : ''}`, {
        method: input.id ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      });
      setDraft(null);
      load(selected);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Gagal menyimpan.');
    } finally { setSaving(false); }
  };

  const toggleActive = async (account: UserAccount) => {
    if (!selected) return;
    if (account.active && !confirm(`Nonaktifkan akun ${account.name}? Akun ini tidak bisa login lagi di ${selected.name}.`)) return;
    try {
      await branchRequest(selected, `/settings/users/${account.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: account.name, username: account.username, role: account.role, active: !account.active })
      });
      load(selected);
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal mengubah status.'); }
  };

  return <div className="page">
    <div className="page-heading">
      <div><h1>Akun Cabang</h1><p>Buat, ubah, dan nonaktifkan akun aplikasi cabang dari pusat.</p></div>
      <button className="button primary" onClick={() => { setDraft(emptyDraft); setModalError(''); }} disabled={!selected}><Plus aria-hidden="true" />Akun baru</button>
    </div>

    <div className="branch-picker">{branches.map(b => <button key={b.code} className={selected?.code === b.code ? 'active' : ''} onClick={() => setSelected(b)}>{b.name}</button>)}</div>
    {error && <div className="notice error" role="alert">{error}</div>}

    <div className="panel flush"><div className="table-wrap"><table>
      <thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th>Status</th><th /></tr></thead>
      <tbody>{accounts.map(a => <tr key={a.id}>
        <td>{a.name}</td>
        <td className="mono">{a.username}</td>
        <td><span className="status">{a.role}</span></td>
        <td><span className={`status ${a.active ? 'success' : 'danger'}`}>{a.active ? 'Aktif' : 'Nonaktif'}</span></td>
        <td><div className="row-actions">
          <button className="button ghost" onClick={() => { setDraft({ id: a.id, name: a.name, username: a.username, role: a.role, active: a.active, password: '' }); setModalError(''); }}>Ubah</button>
          <button className={`button ${a.active ? 'secondary' : 'primary'}`} onClick={() => void toggleActive(a)}>{a.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
        </div></td>
      </tr>)}</tbody>
    </table></div>
    {!accounts.length && !loading && <div className="empty-state">Belum ada akun aplikasi di {selected?.name ?? 'cabang ini'}. Akun karyawan legacy tidak tampil di sini (hanya-baca).</div>}</div>

    {draft && <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-heading"><h2>{draft.id ? 'Ubah akun' : `Akun baru di ${selected?.name ?? ''}`}</h2></div>
        <div className="form-grid">
          <label>Nama<input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
          <label>Username<input value={draft.username} onChange={e => setDraft({ ...draft, username: e.target.value })} /></label>
          <label>Peran<select value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as UserRole })}>
            <option value="kasir">Kasir</option><option value="supervisor">Supervisor</option><option value="admin">Admin</option>
          </select></label>
          <label>{draft.id ? 'Password baru (opsional)' : 'Password (min 6 karakter)'}<input type="password" value={draft.password} onChange={e => setDraft({ ...draft, password: e.target.value })} /></label>
        </div>
        <label className="checkbox-row"><input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} />Akun aktif (boleh login)</label>
        {modalError && <p className="field-error" role="alert">{modalError}</p>}
        <div className="modal-actions">
          <button className="button secondary" onClick={() => setDraft(null)}>Batal</button>
          <button className="button primary" disabled={saving} onClick={() => void save(draft)}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </div>
    </div>}
  </div>;
}
