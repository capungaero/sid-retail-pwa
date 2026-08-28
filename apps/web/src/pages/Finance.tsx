import { useEffect, useMemo, useRef, useState } from 'react';
import { CirclePlus, RefreshCw, Search, X } from 'lucide-react';
import { addCashEntry, addInstrument, addPayablePayment, addReceivablePayment, createReceivable, listCashEntries, listCustomers, listInstruments, listPayables, listReceivables, updateInstrumentStatus } from '../lib/api';
import { payableOutstanding, receivableOutstanding } from '../lib/finance';
import { money } from '../lib/money';
import type { CashDirection, CashLedgerEntry, Customer, InstrumentKind, InstrumentStatus, Payable, PaymentInstrument, Receivable } from '../types';

const TABS = [
  { key: 'cash', label: 'Kas masuk & keluar' },
  { key: 'payable', label: 'Hutang supplier' },
  { key: 'receivable', label: 'Piutang pelanggan' },
  { key: 'instrument', label: 'Kartu, voucher & giro' }
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

export function Finance() {
  const [tab, setTab] = useState<TabKey>('cash');
  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">Keuangan</p><h1>Keuangan</h1><p>Pusat kas dan kewajiban usaha.</p></div></div>
    <div className="tabs" role="tablist" aria-label="Sub modul keuangan">{TABS.map(t => <button key={t.key} role="tab" aria-selected={tab === t.key} className={`tab-button ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}</div>
    {tab === 'cash' && <CashTab />}
    {tab === 'payable' && <PayableTab />}
    {tab === 'receivable' && <ReceivableTab />}
    {tab === 'instrument' && <InstrumentTab />}
  </div>;
}

const CASH_CATEGORIES = ['Setoran modal', 'Penjualan tunai tambahan', 'Beli perlengkapan toko', 'Biaya operasional', 'Pengambilan pribadi', 'Lainnya'];

function CashTab() {
  const [entries, setEntries] = useState<CashLedgerEntry[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [adding, setAdding] = useState(false);
  const load = () => { setLoading(true); setError(''); listCashEntries().then(setEntries).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const ordered = useMemo(() => [...entries].reverse(), [entries]);
  const balance = entries.at(-1)?.balanceAfter ?? 0;
  return <>
    <section className="panel flush">
      <div className="table-tools"><h2>Buku kas</h2><span className="status success">Saldo saat ini: {money.format(balance)}</span><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button><button className="button primary" onClick={() => setAdding(true)}><CirclePlus /> Catat transaksi kas</button></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat data kas…</div> : !ordered.length ? <div className="empty-state">Belum ada transaksi kas.</div> : <div className="table-wrap"><table><thead><tr><th>Waktu</th><th>Kategori</th><th>Catatan</th><th className="numeric">Jumlah</th><th className="numeric">Saldo</th></tr></thead><tbody>{ordered.map(e => <tr key={e.id}><td>{new Date(e.createdAt).toLocaleString('id-ID')}</td><td>{e.category}</td><td>{e.note ?? '—'}</td><td className={`numeric mono ${e.direction === 'out' ? 'danger-text' : ''}`}>{e.direction === 'in' ? '+' : '-'}{money.format(e.amount)}</td><td className="numeric mono">{money.format(e.balanceAfter)}</td></tr>)}</tbody></table></div>}
    </section>
    {adding && <CashEntryModal onClose={() => setAdding(false)} onSaved={entry => { setEntries(current => [...current, entry]); setAdding(false); }} />}
  </>;
}

function CashEntryModal({ onClose, onSaved }: { onClose: () => void; onSaved: (entry: CashLedgerEntry) => void }) {
  const [direction, setDirection] = useState<CashDirection>('in'); const [amount, setAmount] = useState(0); const [category, setCategory] = useState(CASH_CATEGORIES[0]); const [note, setNote] = useState('');
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const modalRef = useModalTrap(onClose);
  // Generated once per modal open and reused across retries of the same submit attempt (e.g. a
  // client-side timeout after the server already succeeded), so a retry can't double-write.
  const idempotencyKey = useRef(crypto.randomUUID()).current;
  async function submit() {
    if (amount <= 0) return setError('Jumlah harus lebih dari 0.');
    setSaving(true); setError('');
    try { onSaved(await addCashEntry({ direction, amount, category, note: note.trim() || undefined }, idempotencyKey)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan transaksi kas'); setSaving(false); }
  }
  return <div className="modal-overlay" role="presentation"><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="cash-title">
    <div className="modal-heading"><div><p className="eyebrow">Kas</p><h2 id="cash-title">Catat transaksi kas</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></div>
    <div className="tabs inner" role="tablist" aria-label="Arah kas">
      <button type="button" role="tab" aria-selected={direction === 'in'} className={`tab-button ${direction === 'in' ? 'active' : ''}`} onClick={() => setDirection('in')} data-autofocus="true">Kas masuk</button>
      <button type="button" role="tab" aria-selected={direction === 'out'} className={`tab-button ${direction === 'out' ? 'active' : ''}`} onClick={() => setDirection('out')}>Kas keluar</button>
    </div>
    <label>Kategori<select value={category} onChange={e => setCategory(e.target.value)}>{CASH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
    <label>Jumlah<input type="number" min="0" value={amount} onChange={e => setAmount(Number(e.target.value))} /></label>
    <label>Catatan (opsional)<input value={note} onChange={e => setNote(e.target.value)} placeholder="Detail tambahan" /></label>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Batal</button><button type="button" className="button primary" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button></div>
  </section></div>;
}

function PayableTab() {
  const [payables, setPayables] = useState<Payable[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [paying, setPaying] = useState<Payable | null>(null);
  const load = () => { setLoading(true); setError(''); listPayables().then(setPayables).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const totalOutstanding = payables.reduce((sum, p) => sum + payableOutstanding(p), 0);
  return <>
    <section className="panel flush">
      <div className="table-tools"><h2>Hutang ke supplier</h2><span className="status">Total sisa: {money.format(totalOutstanding)}</span><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat data hutang…</div> : !payables.length ? <div className="empty-state">Belum ada hutang supplier.</div> : <div className="table-wrap"><table><thead><tr><th>Referensi</th><th>Supplier</th><th className="numeric">Total</th><th className="numeric">Sudah dibayar</th><th className="numeric">Sisa</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{payables.map(p => { const outstanding = payableOutstanding(p); return <tr key={p.id}><td className="mono">{p.reference}</td><td>{p.supplierName}</td><td className="numeric mono">{money.format(p.amount)}</td><td className="numeric mono">{money.format(p.amount - outstanding)}</td><td className="numeric mono">{money.format(outstanding)}</td><td>{outstanding > 0 ? <button className="button secondary" onClick={() => setPaying(p)}>Bayar</button> : <span className="status success">Lunas</span>}</td></tr>; })}</tbody></table></div>}
    </section>
    {paying && <PayablePaymentModal payable={paying} onClose={() => setPaying(null)} onSaved={updated => { setPayables(current => current.map(p => p.id === updated.id ? updated : p)); setPaying(null); }} />}
  </>;
}

function PayablePaymentModal({ payable, onClose, onSaved }: { payable: Payable; onClose: () => void; onSaved: (payable: Payable) => void }) {
  const outstanding = payableOutstanding(payable);
  const [amount, setAmount] = useState(outstanding); const [note, setNote] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const modalRef = useModalTrap(onClose);
  const idempotencyKey = useRef(crypto.randomUUID()).current;
  async function submit() {
    if (amount <= 0) return setError('Jumlah harus lebih dari 0.');
    setSaving(true); setError('');
    try { onSaved(await addPayablePayment(payable.id, amount, note.trim() || undefined, idempotencyKey)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan pembayaran'); setSaving(false); }
  }
  return <div className="modal-overlay" role="presentation"><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="payable-title">
    <div className="modal-heading"><div><p className="eyebrow">Hutang supplier</p><h2 id="payable-title">Bayar {payable.supplierName}</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></div>
    <p>Sisa hutang: <strong>{money.format(outstanding)}</strong></p>
    <label>Jumlah dibayar<input data-autofocus="true" type="number" min="0" max={outstanding} value={amount} onChange={e => setAmount(Math.max(0, Math.min(outstanding, Number(e.target.value))))} /></label>
    <label>Catatan (opsional)<input value={note} onChange={e => setNote(e.target.value)} placeholder="No. kwitansi, dsb." /></label>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Batal</button><button type="button" className="button primary" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan pembayaran'}</button></div>
  </section></div>;
}

function ReceivableTab() {
  const [receivables, setReceivables] = useState<Receivable[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [collecting, setCollecting] = useState<Receivable | null>(null); const [adding, setAdding] = useState(false);
  const load = () => { setLoading(true); setError(''); listReceivables().then(setReceivables).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const totalOutstanding = receivables.reduce((sum, r) => sum + receivableOutstanding(r), 0);
  return <>
    <section className="panel flush">
      <div className="table-tools"><h2>Piutang pelanggan</h2><span className="status">Total sisa: {money.format(totalOutstanding)}</span><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button><button className="button primary" onClick={() => setAdding(true)}><CirclePlus /> Piutang baru</button></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat data piutang…</div> : !receivables.length ? <div className="empty-state">Belum ada piutang pelanggan.</div> : <div className="table-wrap"><table><thead><tr><th>Referensi</th><th>Pelanggan</th><th className="numeric">Total</th><th className="numeric">Sudah diterima</th><th className="numeric">Sisa</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{receivables.map(r => { const outstanding = receivableOutstanding(r); return <tr key={r.id}><td className="mono">{r.reference}</td><td>{r.customerName}</td><td className="numeric mono">{money.format(r.amount)}</td><td className="numeric mono">{money.format(r.amount - outstanding)}</td><td className="numeric mono">{money.format(outstanding)}</td><td>{outstanding > 0 ? <button className="button secondary" onClick={() => setCollecting(r)}>Terima bayar</button> : <span className="status success">Lunas</span>}</td></tr>; })}</tbody></table></div>}
    </section>
    {collecting && <ReceivablePaymentModal receivable={collecting} onClose={() => setCollecting(null)} onSaved={updated => { setReceivables(current => current.map(r => r.id === updated.id ? updated : r)); setCollecting(null); }} />}
    {adding && <ReceivableCreateModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
  </>;
}

// Manual piutang entry — for debt not tied to a POS sale (e.g. barang diambil dulu, dicatat manual).
// Sale-time debt (cashier marks a checkout as "pelanggan berhutang") is handled in Pos.tsx instead.
function ReceivableCreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: (receivable: Receivable) => void }) {
  const [customer, setCustomer] = useState<Customer | null>(null); const [customerQuery, setCustomerQuery] = useState(''); const [customers, setCustomers] = useState<Customer[]>([]); const [customersLoading, setCustomersLoading] = useState(false);
  const [amount, setAmount] = useState(0); const [note, setNote] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const modalRef = useModalTrap(onClose);
  const idempotencyKey = useRef(crypto.randomUUID()).current;
  // "Pelanggan Umum" is a frontend-only placeholder for walk-in sales, not a real customer to
  // collect a debt from — excluded here the same way Pos.tsx's debt checkbox refuses it.
  useEffect(() => { if (customer) return; setCustomersLoading(true); const timer = setTimeout(() => listCustomers(customerQuery).then(list => setCustomers(list.filter(c => c.id !== 'general'))).catch(() => setCustomers([])).finally(() => setCustomersLoading(false)), 150); return () => clearTimeout(timer); }, [customerQuery, customer]);
  async function submit() {
    if (!customer) return setError('Pilih pelanggan terlebih dahulu.');
    if (amount <= 0) return setError('Jumlah harus lebih dari 0.');
    setSaving(true); setError('');
    try { onSaved(await createReceivable(customer.id, amount, note.trim() || undefined, idempotencyKey)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan piutang'); setSaving(false); }
  }
  return <div className="modal-overlay" role="presentation"><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="receivable-create-title">
    <div className="modal-heading"><div><p className="eyebrow">Piutang pelanggan</p><h2 id="receivable-create-title">Piutang baru</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></div>
    <label>Pelanggan</label>
    {customer ? <div className="line-add-row"><span>{customer.name} <span className="muted">({customer.code})</span></span><button type="button" className="button ghost" onClick={() => { setCustomer(null); setCustomerQuery(''); }}>Ganti</button></div> : <>
      <label className="search-box"><Search /><span className="sr-only">Cari pelanggan</span><input data-autofocus="true" value={customerQuery} onChange={e => setCustomerQuery(e.target.value)} placeholder="Nama atau kode pelanggan…" /></label>
      {customersLoading ? <div className="empty-compact" role="status">Mencari pelanggan…</div> : <div className="option-list">{customers.map(c => <button type="button" key={c.id} onClick={() => setCustomer(c)}><span><strong>{c.name}</strong><small>{c.code}</small></span></button>)}{!customers.length && <div className="empty-compact">Pelanggan tidak ditemukan.</div>}</div>}
    </>}
    <label>Jumlah piutang<input type="number" min="0" value={amount} onChange={e => setAmount(Number(e.target.value))} /></label>
    <label>Catatan (opsional)<input value={note} onChange={e => setNote(e.target.value)} placeholder="Barang apa, alasan, dsb." maxLength={50} /></label>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Batal</button><button type="button" className="button primary" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan piutang'}</button></div>
  </section></div>;
}

function ReceivablePaymentModal({ receivable, onClose, onSaved }: { receivable: Receivable; onClose: () => void; onSaved: (receivable: Receivable) => void }) {
  const outstanding = receivableOutstanding(receivable);
  const [amount, setAmount] = useState(outstanding); const [note, setNote] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const modalRef = useModalTrap(onClose);
  const idempotencyKey = useRef(crypto.randomUUID()).current;
  async function submit() {
    if (amount <= 0) return setError('Jumlah harus lebih dari 0.');
    setSaving(true); setError('');
    try { onSaved(await addReceivablePayment(receivable.id, amount, note.trim() || undefined, idempotencyKey)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan penerimaan'); setSaving(false); }
  }
  return <div className="modal-overlay" role="presentation"><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="receivable-title">
    <div className="modal-heading"><div><p className="eyebrow">Piutang pelanggan</p><h2 id="receivable-title">Terima bayar dari {receivable.customerName}</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></div>
    <p>Sisa piutang: <strong>{money.format(outstanding)}</strong></p>
    <label>Jumlah diterima<input data-autofocus="true" type="number" min="0" max={outstanding} value={amount} onChange={e => setAmount(Math.max(0, Math.min(outstanding, Number(e.target.value))))} /></label>
    <label>Catatan (opsional)<input value={note} onChange={e => setNote(e.target.value)} placeholder="No. kwitansi, dsb." /></label>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Batal</button><button type="button" className="button primary" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan penerimaan'}</button></div>
  </section></div>;
}

const INSTRUMENT_KIND_LABEL: Record<InstrumentKind, string> = { card: 'Kartu (EDC)', voucher: 'Voucher', giro: 'Giro / cek' };
const INSTRUMENT_STATUS_LABEL: Record<InstrumentStatus, string> = { pending: 'Menunggu kliring', cleared: 'Cair', bounced: 'Ditolak' };

function InstrumentTab() {
  const [instruments, setInstruments] = useState<PaymentInstrument[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [adding, setAdding] = useState(false); const [busyId, setBusyId] = useState('');
  const load = () => { setLoading(true); setError(''); listInstruments().then(setInstruments).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  async function setStatus(id: string, status: InstrumentStatus) {
    setBusyId(id); setError('');
    try { const updated = await updateInstrumentStatus(id, status); setInstruments(current => current.map(i => i.id === updated.id ? updated : i)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal mengubah status'); }
    finally { setBusyId(''); }
  }
  return <>
    <section className="panel flush">
      <div className="table-tools"><h2>Register kartu, voucher & giro</h2><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button><button className="button primary" onClick={() => setAdding(true)}><CirclePlus /> Instrumen baru</button></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat data instrumen…</div> : !instruments.length ? <div className="empty-state">Belum ada instrumen pembayaran non-tunai.</div> : <div className="table-wrap"><table><thead><tr><th>Referensi</th><th>Jenis</th><th className="numeric">Jumlah</th><th>Status</th><th>Catatan</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{instruments.map(i => <tr key={i.id}><td className="mono">{i.reference}</td><td>{INSTRUMENT_KIND_LABEL[i.kind]}</td><td className="numeric mono">{money.format(i.amount)}</td><td><span className={`status ${i.status === 'cleared' ? 'success' : i.status === 'bounced' ? 'danger' : ''}`}>{INSTRUMENT_STATUS_LABEL[i.status]}</span></td><td>{i.note ?? '—'}</td><td>{i.status === 'pending' ? <div className="line-add-row"><button className="button secondary" onClick={() => setStatus(i.id, 'cleared')} disabled={busyId === i.id}>Tandai cair</button><button className="button secondary" onClick={() => setStatus(i.id, 'bounced')} disabled={busyId === i.id}>Tandai ditolak</button></div> : <span className="muted">—</span>}</td></tr>)}</tbody></table></div>}
    </section>
    {adding && <InstrumentModal onClose={() => setAdding(false)} onSaved={instrument => { setInstruments(current => [instrument, ...current]); setAdding(false); }} />}
  </>;
}

function InstrumentModal({ onClose, onSaved }: { onClose: () => void; onSaved: (instrument: PaymentInstrument) => void }) {
  const [kind, setKind] = useState<InstrumentKind>('card'); const [reference, setReference] = useState(''); const [amount, setAmount] = useState(0); const [note, setNote] = useState('');
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const modalRef = useModalTrap(onClose);
  const idempotencyKey = useRef(crypto.randomUUID()).current;
  async function submit() {
    if (!reference.trim()) return setError('Referensi wajib diisi.');
    if (amount <= 0) return setError('Jumlah harus lebih dari 0.');
    setSaving(true); setError('');
    try { onSaved(await addInstrument({ kind, reference: reference.trim(), amount, note: note.trim() || undefined }, idempotencyKey)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan instrumen'); setSaving(false); }
  }
  return <div className="modal-overlay" role="presentation"><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="instrument-title">
    <div className="modal-heading"><div><p className="eyebrow">Instrumen pembayaran</p><h2 id="instrument-title">Instrumen baru</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></div>
    <label>Jenis<select data-autofocus="true" value={kind} onChange={e => setKind(e.target.value as InstrumentKind)}>{(Object.keys(INSTRUMENT_KIND_LABEL) as InstrumentKind[]).map(k => <option key={k} value={k}>{INSTRUMENT_KIND_LABEL[k]}</option>)}</select></label>
    <label>Referensi<input value={reference} onChange={e => setReference(e.target.value)} placeholder="No. EDC / voucher / giro" /></label>
    <label>Jumlah<input type="number" min="0" value={amount} onChange={e => setAmount(Number(e.target.value))} /></label>
    <label>Catatan (opsional)<input value={note} onChange={e => setNote(e.target.value)} placeholder="Detail tambahan" /></label>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Batal</button><button type="button" className="button primary" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button></div>
  </section></div>;
}
