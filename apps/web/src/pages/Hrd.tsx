import { useEffect, useMemo, useRef, useState } from 'react';
import { CirclePlus, RefreshCw, X } from 'lucide-react';
import { listAttendanceEntries, listEmployees, listLeaveRequests, listShiftAssignments, listShiftDefs, saveAttendanceEntry, saveLeaveRequest, saveShiftAssignment, updateLeaveRequestStatus } from '../lib/api';
import { monthlyRecap, workDurationMinutes } from '../lib/hrd';
import { todayYearMonth } from '../lib/date';
import type { AttendanceEntry, AttendanceStatus, Employee, LeaveRequest, LeaveStatus, LeaveType, ShiftAssignment, ShiftDef } from '../types';

const TABS = [
  { key: 'shift', label: 'Jadwal & shift' },
  { key: 'attendance', label: 'Check-in / check-out' },
  { key: 'leave', label: 'Izin, sakit, cuti, lembur' },
  { key: 'recap', label: 'Rekap bulanan' }
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

export function Hrd() {
  const [tab, setTab] = useState<TabKey>('shift');
  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">HRD</p><h1>HRD</h1><p>Absensi manual dan administrasi karyawan.</p></div></div>
    <div className="tabs" role="tablist" aria-label="Sub modul HRD">{TABS.map(t => <button key={t.key} role="tab" aria-selected={tab === t.key} className={`tab-button ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}</div>
    {tab === 'shift' && <ShiftTab />}
    {tab === 'attendance' && <AttendanceTab />}
    {tab === 'leave' && <LeaveTab />}
    {tab === 'recap' && <RecapTab />}
  </div>;
}

function ShiftTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<ShiftDef[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [adding, setAdding] = useState(false);
  const load = () => { setLoading(true); setError(''); Promise.all([listEmployees(), listShiftDefs(), listShiftAssignments()]).then(([e, s, a]) => { setEmployees(e); setShifts(s); setAssignments(a); }).catch(err => setError(err instanceof Error ? err.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const ordered = useMemo(() => [...assignments].sort((a, b) => a.date < b.date ? 1 : -1), [assignments]);
  const shiftName = (id: string) => shifts.find(s => s.id === id)?.name ?? id;
  const shiftTime = (id: string) => { const s = shifts.find(x => x.id === id); return s ? `${s.start}–${s.end}` : '—'; };
  return <>
    <section className="panel flush">
      <div className="table-tools"><h2>Definisi shift</h2></div>
      {loading ? <div className="empty-state">Memuat data shift…</div> : <div className="table-wrap"><table><thead><tr><th>Nama shift</th><th>Mulai</th><th>Selesai</th></tr></thead><tbody>{shifts.map(s => <tr key={s.id}><td>{s.name}</td><td className="mono">{s.start}</td><td className="mono">{s.end}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="panel flush">
      <div className="table-tools"><h2>Jadwal shift karyawan</h2><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button><button className="button primary" onClick={() => setAdding(true)}><CirclePlus /> Jadwalkan shift</button></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat data jadwal…</div> : !ordered.length ? <div className="empty-state">Belum ada jadwal shift.</div> : <div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Karyawan</th><th>Shift</th><th>Jam</th></tr></thead><tbody>{ordered.map(a => <tr key={a.id}><td>{a.date}</td><td>{a.employeeName}</td><td>{shiftName(a.shiftId)}</td><td className="mono">{shiftTime(a.shiftId)}</td></tr>)}</tbody></table></div>}
    </section>
    {adding && <ShiftAssignmentModal employees={employees} shifts={shifts} onClose={() => setAdding(false)} onSaved={a => { setAssignments(current => [...current, a]); setAdding(false); }} />}
  </>;
}

function ShiftAssignmentModal({ employees, shifts, onClose, onSaved }: { employees: Employee[]; shifts: ShiftDef[]; onClose: () => void; onSaved: (a: ShiftAssignment) => void }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? ''); const [shiftId, setShiftId] = useState(shifts[0]?.id ?? ''); const [date, setDate] = useState('');
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const modalRef = useModalTrap(onClose);
  async function submit() {
    if (!employeeId || !shiftId) return setError('Karyawan dan shift wajib dipilih.');
    if (!date) return setError('Tanggal wajib diisi.');
    setSaving(true); setError('');
    try { onSaved(await saveShiftAssignment({ employeeId, shiftId, date })); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan jadwal'); setSaving(false); }
  }
  return <div className="modal-overlay" role="presentation"><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="shift-title">
    <div className="modal-heading"><div><p className="eyebrow">Jadwal shift</p><h2 id="shift-title">Jadwalkan shift</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></div>
    <label>Karyawan<select data-autofocus="true" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>{employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>)}</select></label>
    <label>Shift<select value={shiftId} onChange={e => setShiftId(e.target.value)}>{shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start}–{s.end})</option>)}</select></label>
    <label>Tanggal<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Batal</button><button type="button" className="button primary" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button></div>
  </section></div>;
}

const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = { hadir: 'Hadir', telat: 'Telat', 'pulang-cepat': 'Pulang cepat' };

function AttendanceTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [adding, setAdding] = useState(false);
  const load = () => { setLoading(true); setError(''); Promise.all([listEmployees(), listAttendanceEntries()]).then(([e, a]) => { setEmployees(e); setEntries(a); }).catch(err => setError(err instanceof Error ? err.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const ordered = useMemo(() => [...entries].sort((a, b) => a.date < b.date ? 1 : -1), [entries]);
  return <>
    <section className="panel flush">
      <div className="table-tools"><h2>Absensi harian</h2><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button><button className="button primary" onClick={() => setAdding(true)}><CirclePlus /> Catat absensi</button></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat data absensi…</div> : !ordered.length ? <div className="empty-state">Belum ada catatan absensi.</div> : <div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Karyawan</th><th>Check-in</th><th>Check-out</th><th className="numeric">Durasi</th><th>Status</th></tr></thead><tbody>{ordered.map(a => { const minutes = a.checkOut ? workDurationMinutes(a.checkIn, a.checkOut) : undefined; return <tr key={a.id}><td>{a.date}</td><td>{a.employeeName}</td><td className="mono">{a.checkIn}</td><td className="mono">{a.checkOut ?? '—'}</td><td className="numeric mono">{minutes !== undefined ? `${Math.floor(minutes / 60)}j ${minutes % 60}m` : '—'}</td><td><span className={`status ${a.status === 'hadir' ? 'success' : a.status === 'telat' ? 'danger' : ''}`}>{ATTENDANCE_STATUS_LABEL[a.status]}</span></td></tr>; })}</tbody></table></div>}
    </section>
    {adding && <AttendanceModal employees={employees} onClose={() => setAdding(false)} onSaved={entry => { setEntries(current => [...current, entry]); setAdding(false); }} />}
  </>;
}

function AttendanceModal({ employees, onClose, onSaved }: { employees: Employee[]; onClose: () => void; onSaved: (entry: AttendanceEntry) => void }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? ''); const [date, setDate] = useState(''); const [checkIn, setCheckIn] = useState(''); const [checkOut, setCheckOut] = useState('');
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const modalRef = useModalTrap(onClose);
  async function submit() {
    if (!employeeId) return setError('Karyawan wajib dipilih.');
    if (!date) return setError('Tanggal wajib diisi.');
    if (!checkIn) return setError('Jam check-in wajib diisi.');
    setSaving(true); setError('');
    try { onSaved(await saveAttendanceEntry({ employeeId, date, checkIn, checkOut: checkOut || undefined })); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan absensi'); setSaving(false); }
  }
  return <div className="modal-overlay" role="presentation"><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="attendance-title">
    <div className="modal-heading"><div><p className="eyebrow">Absensi</p><h2 id="attendance-title">Catat absensi</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></div>
    <label>Karyawan<select data-autofocus="true" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>{employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>)}</select></label>
    <label>Tanggal<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
    <div className="form-grid">
      <label>Check-in<input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)} /></label>
      <label>Check-out (opsional)<input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)} /></label>
    </div>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Batal</button><button type="button" className="button primary" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button></div>
  </section></div>;
}

const LEAVE_TYPE_LABEL: Record<LeaveType, string> = { izin: 'Izin', sakit: 'Sakit', cuti: 'Cuti', lembur: 'Lembur' };
const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = { diajukan: 'Diajukan', disetujui: 'Disetujui', ditolak: 'Ditolak' };

function LeaveTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [adding, setAdding] = useState(false); const [busyId, setBusyId] = useState('');
  const load = () => { setLoading(true); setError(''); Promise.all([listEmployees(), listLeaveRequests()]).then(([e, r]) => { setEmployees(e); setRequests(r); }).catch(err => setError(err instanceof Error ? err.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  async function setStatus(id: string, status: LeaveStatus) {
    setBusyId(id); setError('');
    try { const updated = await updateLeaveRequestStatus(id, status); setRequests(current => current.map(r => r.id === updated.id ? updated : r)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal mengubah status'); }
    finally { setBusyId(''); }
  }
  return <>
    <section className="panel flush">
      <div className="table-tools"><h2>Pengajuan izin, sakit, cuti & lembur</h2><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button><button className="button primary" onClick={() => setAdding(true)}><CirclePlus /> Pengajuan baru</button></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat data pengajuan…</div> : !requests.length ? <div className="empty-state">Belum ada pengajuan.</div> : <div className="table-wrap"><table><thead><tr><th>Karyawan</th><th>Jenis</th><th>Tanggal</th><th className="numeric">Jam lembur</th><th>Alasan</th><th>Status</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{requests.map(r => <tr key={r.id}><td>{r.employeeName}</td><td>{LEAVE_TYPE_LABEL[r.type]}</td><td>{r.startDate === r.endDate ? r.startDate : `${r.startDate} – ${r.endDate}`}</td><td className="numeric mono">{r.type === 'lembur' ? r.hours ?? 0 : '—'}</td><td>{r.reason ?? '—'}</td><td><span className={`status ${r.status === 'disetujui' ? 'success' : r.status === 'ditolak' ? 'danger' : ''}`}>{LEAVE_STATUS_LABEL[r.status]}</span></td><td>{r.status === 'diajukan' ? <div className="line-add-row"><button className="button secondary" onClick={() => setStatus(r.id, 'disetujui')} disabled={busyId === r.id}>Setujui</button><button className="button secondary" onClick={() => setStatus(r.id, 'ditolak')} disabled={busyId === r.id}>Tolak</button></div> : <span className="muted">—</span>}</td></tr>)}</tbody></table></div>}
    </section>
    {adding && <LeaveRequestModal employees={employees} onClose={() => setAdding(false)} onSaved={r => { setRequests(current => [r, ...current]); setAdding(false); }} />}
  </>;
}

function LeaveRequestModal({ employees, onClose, onSaved }: { employees: Employee[]; onClose: () => void; onSaved: (r: LeaveRequest) => void }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? ''); const [type, setType] = useState<LeaveType>('izin');
  const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState(''); const [hours, setHours] = useState(1); const [reason, setReason] = useState('');
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const modalRef = useModalTrap(onClose);
  async function submit() {
    if (!employeeId) return setError('Karyawan wajib dipilih.');
    if (!startDate) return setError('Tanggal wajib diisi.');
    if (type === 'lembur' && hours <= 0) return setError('Jam lembur harus lebih dari 0.');
    if (type !== 'lembur' && endDate && endDate < startDate) return setError('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    setSaving(true); setError('');
    const effectiveEnd = type === 'lembur' ? startDate : (endDate || startDate);
    try { onSaved(await saveLeaveRequest({ employeeId, type, startDate, endDate: effectiveEnd, hours: type === 'lembur' ? hours : undefined, reason: reason.trim() || undefined })); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan pengajuan'); setSaving(false); }
  }
  return <div className="modal-overlay" role="presentation"><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="leave-title">
    <div className="modal-heading"><div><p className="eyebrow">Pengajuan</p><h2 id="leave-title">Pengajuan baru</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></div>
    <label>Karyawan<select data-autofocus="true" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>{employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>)}</select></label>
    <label>Jenis<select value={type} onChange={e => setType(e.target.value as LeaveType)}>{(Object.keys(LEAVE_TYPE_LABEL) as LeaveType[]).map(t => <option key={t} value={t}>{LEAVE_TYPE_LABEL[t]}</option>)}</select></label>
    {type === 'lembur' ? <div className="form-grid">
      <label>Tanggal<input value={startDate} onChange={e => setStartDate(e.target.value)} type="date" /></label>
      <label>Jam lembur<input type="number" min="1" value={hours} onChange={e => setHours(Number(e.target.value))} /></label>
    </div> : <div className="form-grid">
      <label>Dari tanggal<input value={startDate} onChange={e => setStartDate(e.target.value)} type="date" /></label>
      <label>Sampai tanggal<input value={endDate} onChange={e => setEndDate(e.target.value)} type="date" min={startDate} /></label>
    </div>}
    <label>Alasan (opsional)<input value={reason} onChange={e => setReason(e.target.value)} placeholder="Keterangan tambahan" /></label>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Batal</button><button type="button" className="button primary" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Ajukan'}</button></div>
  </section></div>;
}

function currentYearMonth() { return todayYearMonth(); }

function RecapTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [month, setMonth] = useState(currentYearMonth());
  const load = () => { setLoading(true); setError(''); Promise.all([listEmployees(), listAttendanceEntries(), listLeaveRequests()]).then(([e, a, l]) => { setEmployees(e); setAttendance(a); setLeaveRequests(l); }).catch(err => setError(err instanceof Error ? err.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const rows = useMemo(() => monthlyRecap(employees, attendance, leaveRequests, month), [employees, attendance, leaveRequests, month]);
  return <>
    <section className="panel">
      <div className="panel-heading"><div><p className="eyebrow">Filter periode</p><h2>Bulan rekap</h2></div></div>
      <div className="form-grid"><label>Bulan<input type="month" value={month} onChange={e => setMonth(e.target.value)} /></label></div>
    </section>
    <section className="panel flush">
      <div className="table-tools"><h2>Rekap kehadiran bulanan</h2><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat data rekap…</div> : !rows.length ? <div className="empty-state">Belum ada karyawan.</div> : <div className="table-wrap"><table><thead><tr><th>Karyawan</th><th className="numeric">Hadir</th><th className="numeric">Telat</th><th className="numeric">Pulang cepat</th><th className="numeric">Izin/sakit/cuti (hari)</th><th className="numeric">Lembur (jam)</th></tr></thead><tbody>{rows.map(r => <tr key={r.employeeId}><td>{r.employeeName}</td><td className="numeric mono">{r.hadir}</td><td className="numeric mono">{r.telat}</td><td className="numeric mono">{r.pulangCepat}</td><td className="numeric mono">{r.izinSakitCuti}</td><td className="numeric mono">{r.overtimeHours}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
