import { useEffect, useState } from 'react';
import type { AttendanceEntry, LeaveRequest } from '@web/types';
import { todayKey } from '@web/lib/date';
import { listBranches } from '../lib/branches';
import { branchRequest } from '../lib/hqApi';
import type { Branch } from '../types';

const STATUS_CLASS: Record<AttendanceEntry['status'], string> = { hadir: 'success', telat: 'danger', 'pulang-cepat': 'danger' };

export function Attendance() {
  const [branches] = useState(() => listBranches());
  const [selected, setSelected] = useState<Branch | null>(branches[0] ?? null);
  const [date, setDate] = useState(() => todayKey());
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selected) return;
    setLoading(true); setError('');
    Promise.all([
      branchRequest<AttendanceEntry[]>(selected, '/hrd/attendance'),
      branchRequest<LeaveRequest[]>(selected, '/hrd/leave-requests').catch(() => [] as LeaveRequest[])
    ])
      .then(([attendance, leaveRequests]) => { setEntries(attendance); setLeaves(leaveRequests); })
      .catch(err => { setError(err instanceof Error ? err.message : 'Permintaan gagal.'); setEntries([]); setLeaves([]); })
      .finally(() => setLoading(false));
  }, [selected]);

  const dayEntries = entries.filter(e => e.date === date);
  const dayLeaves = leaves.filter(l => l.status === 'disetujui' && l.startDate <= date && date <= l.endDate);

  return <div className="page">
    <div className="page-heading">
      <div><h1>Absensi Karyawan</h1><p>Kehadiran per cabang, dicatat oleh petugas cabang.</p></div>
      <label className="date-field">Tanggal<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
    </div>

    <div className="branch-picker">{branches.map(b => <button key={b.code} className={selected?.code === b.code ? 'active' : ''} onClick={() => setSelected(b)}>{b.name}</button>)}</div>
    {error && <div className="notice error" role="alert">{error}</div>}

    <div className="panel flush"><div className="table-wrap"><table>
      <thead><tr><th>Karyawan</th><th>Masuk</th><th>Pulang</th><th>Status</th></tr></thead>
      <tbody>{dayEntries.map(e => <tr key={e.id}>
        <td>{e.employeeName}</td>
        <td className="mono">{e.checkIn}</td>
        <td className="mono">{e.checkOut ?? '—'}</td>
        <td><span className={`status ${STATUS_CLASS[e.status]}`}>{e.status}</span></td>
      </tr>)}</tbody>
    </table></div>
    {!dayEntries.length && !loading && <div className="empty-state">Belum ada absensi tercatat pada {date} di {selected?.name ?? 'cabang ini'}.</div>}</div>

    {dayLeaves.length > 0 && <div className="panel" style={{ marginTop: 12 }}>
      <div className="panel-heading"><h2>Izin / sakit / cuti disetujui hari ini</h2></div>
      <ul className="action-list">{dayLeaves.map(l => <li key={l.id}><span className="dot amber" /><div><strong>{l.employeeName}</strong><span>{l.type} · {l.startDate} s/d {l.endDate}{l.reason ? ` — ${l.reason}` : ''}</span></div></li>)}</ul>
    </div>}
  </div>;
}
