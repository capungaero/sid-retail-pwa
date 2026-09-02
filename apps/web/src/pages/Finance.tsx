import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CirclePlus, Pencil, Printer, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { addCashEntry, addInstrument, addLoanPayment, addPayablePayment, addReceivablePayment, createReceivable, deleteCashEntry, getPaymentMethods, getStoreProfile, listCashEntries, listCustomers, listInstruments, listLoanPayables, listPayables, listReceivables, listSales, updateCashEntry, updateInstrumentStatus } from '../lib/api';
import { payableOutstanding, receivableOutstanding } from '../lib/finance';
import { cashPoolBalance, cashierRemainingDailyCash, walletLedger, withinRange } from '../lib/reports';
import type { WalletLedgerEntry } from '../lib/reports';
import { openBlankPreviewPopup, openCashLedgerReportPopup, type CashLedgerReportRow } from '../lib/print';
import { todayKey as localTodayKey } from '../lib/date';
import { money, number } from '../lib/money';
import type { CashDirection, CashFundingSource, CashInSource, CashLedgerEntry, Customer, InstrumentKind, InstrumentStatus, LoanPayable, Payable, PaymentInstrument, Receivable, SaleRecord } from '../types';

// 'cashier' and 'in_transit' still exist as CashFundingSource/CashInSource values (old entries
// tagged with them still load and display fine via these arrays' .find() lookups elsewhere), but
// are no longer offered here - four clean, non-overlapping wallets only.
const FUNDING_SOURCES: { value: CashFundingSource; label: string; hint?: string }[] = [
  { value: 'daily', label: 'Kas Kasir (Transaksi Hari Ini)', hint: 'Diambil langsung dari hasil jualan hari ini - mengurangi Rekap harian tanggal itu juga' },
  { value: 'loan', label: 'Saldo Akumulasi Toko (Tarik Modal/Laba)', hint: 'Diambil dari saldo akumulasi toko, BUKAN dari drawer kasir hari ini - tercatat sebagai hutang di tab Hutang pinjaman, mengurangi saldo penjualan HARI SEBELUMNYA di Laporan sampai dibayar' },
  { value: 'bank', label: 'Kas Bank' },
  { value: 'petty', label: 'Kas Kecil' },
];

// Sumber dana for a kas masuk = which account the money came from. The +X always lands in the
// active cash book; the source only drives a report side-effect: 'daily' nets that day's cashier
// recap, 'loan' nets the store's accumulated revenue, anything else changes neither figure.
const CASH_SOURCES: { value: CashInSource; label: string }[] = [
  { value: 'daily', label: 'Kas Kasir (Transaksi Hari Ini)' },
  { value: 'loan', label: 'Saldo Akumulasi Toko (Tarik Modal/Laba)' },
  { value: 'bank', label: 'Kas Bank' },
  { value: 'petty', label: 'Kas Kecil' },
  { value: 'external', label: 'Dari luar (modal / pendapatan lain)' },
];

const TABS = [
  { key: 'cash', label: 'Kas masuk & keluar' },
  { key: 'payable', label: 'Hutang supplier' },
  { key: 'receivable', label: 'Piutang pelanggan' },
  { key: 'instrument', label: 'Kartu, voucher & giro' },
  { key: 'loan-payable', label: 'Hutang pinjaman' }
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
    {tab === 'loan-payable' && <LoanPayableTab />}
  </div>;
}

const CASH_CATEGORIES = ['Setoran modal', 'Penjualan tunai tambahan', 'Beli perlengkapan toko', 'Biaya operasional', 'Pengambilan pribadi', 'Lainnya'];

const WALLET_FILTERS: { value: CashFundingSource | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua dompet' },
  { value: 'daily', label: 'Kas Kasir (Transaksi Hari Ini)' },
  { value: 'loan', label: 'Saldo Akumulasi Toko' },
  { value: 'bank', label: 'Kas Bank' },
  { value: 'petty', label: 'Kas Kecil' },
];

// The "Sumber dana" label for one ledger entry - kas keluar reads its fundingSource, kas masuk its
// cashSource, both showing the cashier suffix when present. Shared by the table and the printout.
function cashSourceLabel(e: CashLedgerEntry): string {
  if (e.fundingSource) return `${FUNDING_SOURCES.find(f => f.value === e.fundingSource)?.label ?? e.fundingSource}${e.fundingCashierName ? ` (${e.fundingCashierName})` : ''}`;
  if (e.cashSource) return `${CASH_SOURCES.find(c => c.value === e.cashSource)?.label ?? e.cashSource}${e.fundingCashierName ? ` (${e.fundingCashierName})` : ''}`;
  return '—';
}

function CashTab() {
  const [entries, setEntries] = useState<CashLedgerEntry[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [adding, setAdding] = useState(false);
  const [wallet, setWallet] = useState<CashFundingSource | 'all'>('all');
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [printing, setPrinting] = useState(false);
  const [loans, setLoans] = useState<LoanPayable[]>([]);
  const [editing, setEditing] = useState<CashLedgerEntry | null>(null); const [busyId, setBusyId] = useState<string | null>(null);
  const load = () => { setLoading(true); setError(''); listCashEntries().then(setEntries).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat data')).finally(() => setLoading(false)); listLoanPayables().then(setLoans).catch(() => setLoans([])); };
  useEffect(load, []);
  // Deleting cascades server-side (a loan draw takes its debt with it, a repayment restores the
  // outstanding) - see CashController::destroy - so we reload the whole ledger rather than splice.
  async function remove(e: CashLedgerEntry) {
    if (!confirm(`Hapus transaksi kas ini?\n\n${e.category} ${e.direction === 'in' ? '+' : '-'}${money.format(e.amount)}${e.note ? `\n${e.note}` : ''}\n\nTindakan ini tidak bisa dibatalkan.`)) return;
    setBusyId(e.id); setError('');
    try { await deleteCashEntry(e.id); load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menghapus transaksi kas'); }
    finally { setBusyId(null); }
  }
  // Per loan-draw ledger row, how much is still unpaid - makes the Saldo Akumulasi Toko wallet
  // treat loans as outstanding (not cash), so a repayment never inflates its running balance.
  const outstandingByLedger = useMemo(() => Object.fromEntries(loans.map(l => [l.ledgerId, payableOutstanding(l)])), [loans]);
  // "Semua dompet" shows the whole store ledger with its own balanceAfter (already loan-adjusted
  // server-side); picking one wallet isolates just its entries with a running balance scoped to
  // THAT wallet only - a big Saldo Akumulasi Toko draw elsewhere shouldn't make Kas Kasir's own log
  // read as deeply negative. Normalized to WalletLedgerEntry either way so the table never branches.
  const walletEntries = useMemo<WalletLedgerEntry[]>(() => wallet === 'all'
    ? entries.map(e => ({ ...e, walletBalanceAfter: e.balanceAfter }))
    : walletLedger(entries, wallet, outstandingByLedger), [entries, wallet, outstandingByLedger]);
  // Date range only filters which rows are shown/printed - each row keeps its true cumulative
  // balanceAfter (computed over all entries), so filtering never distorts the running balance.
  const range = useMemo(() => ({ start: from || undefined, end: to || undefined }), [from, to]);
  const rangeEntries = useMemo(() => walletEntries.filter(e => withinRange(e.createdAt, range)), [walletEntries, range]);
  const ordered = useMemo(() => [...rangeEntries].reverse(), [rangeEntries]);
  const balance = walletEntries.at(-1)?.walletBalanceAfter ?? 0;
  function printCashReport() {
    const popup = openBlankPreviewPopup();
    setPrinting(true);
    (async () => {
      let storeName: string | undefined; try { storeName = (await getStoreProfile())?.name; } catch { storeName = undefined; }
      const rows: CashLedgerReportRow[] = rangeEntries.map(e => ({ createdAt: e.createdAt, category: e.category, sourceLabel: cashSourceLabel(e), note: e.note, direction: e.direction, amount: e.amount }));
      const rangeLabel = from || to ? `${from ? new Date(`${from}T00:00:00`).toLocaleDateString('id-ID') : '…'} s/d ${to ? new Date(`${to}T00:00:00`).toLocaleDateString('id-ID') : '…'}` : undefined;
      try { openCashLedgerReportPopup(rows, { storeName, rangeLabel, walletLabel: wallet === 'all' ? undefined : WALLET_FILTERS.find(w => w.value === wallet)?.label, popup }); }
      catch (e) { popup?.close(); alert(e instanceof Error ? e.message : 'Gagal menyiapkan laporan kas'); }
      finally { setPrinting(false); }
    })();
  }
  return <>
    <section className="panel flush">
      <div className="table-tools">
        <h2>Buku kas</h2>
        <select aria-label="Filter dompet" value={wallet} onChange={e => setWallet(e.target.value as CashFundingSource | 'all')}>
          {WALLET_FILTERS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
        </select>
        <label className="history-filter-label" htmlFor="cash-from">Dari</label>
        <input id="cash-from" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        <label className="history-filter-label" htmlFor="cash-to">Sampai</label>
        <input id="cash-to" type="date" value={to} onChange={e => setTo(e.target.value)} />
        {(from || to) && <button className="button ghost" onClick={() => { setFrom(''); setTo(''); }}>Reset</button>}
        <span className="status success">{wallet === 'all' ? 'Saldo saat ini' : `Saldo ${WALLET_FILTERS.find(w => w.value === wallet)?.label}`}: {money.format(balance)}</span>
        <button className="button secondary" onClick={printCashReport} disabled={printing || !rangeEntries.length}><Printer /> {printing ? 'Menyiapkan…' : 'Cetak laporan kas'}</button>
        <button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button>
        <button className="button primary" onClick={() => setAdding(true)}><CirclePlus /> Catat transaksi kas</button>
      </div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat data kas…</div> : !ordered.length ? <div className="empty-state">{from || to ? 'Tidak ada transaksi kas di rentang tanggal ini.' : 'Belum ada transaksi kas.'}</div> : <div className="table-wrap"><table><thead><tr><th>Waktu</th><th>Kategori</th><th>Sumber dana</th><th>Catatan</th><th className="numeric">Jumlah</th><th className="numeric">Saldo</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{ordered.map(e => <tr key={e.id}><td>{new Date(e.createdAt).toLocaleString('id-ID')}</td><td>{e.category}</td><td>{cashSourceLabel(e)}</td><td>{e.note ?? '—'}</td><td className={`numeric mono ${e.direction === 'out' ? 'danger-text' : ''}`}>{e.direction === 'in' ? '+' : '-'}{money.format(e.amount)}</td><td className="numeric mono">{money.format(e.walletBalanceAfter)}</td><td><div className="row-actions"><button className="icon-button" aria-label="Edit transaksi" title="Edit" onClick={() => setEditing(e)} disabled={busyId === e.id}><Pencil /></button><button className="icon-button danger" aria-label="Hapus transaksi" title="Hapus" onClick={() => void remove(e)} disabled={busyId === e.id}><Trash2 /></button></div></td></tr>)}</tbody></table></div>}
    </section>
    {/* Reloads instead of appending locally: a "daily" kas keluar also books a second, linked kas
        masuk server-side (see CashController), so the response's one entry isn't the full picture. */}
    {adding && <CashEntryModal entries={entries} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    {editing && <CashEditModal entry={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
  </>;
}

// Editing is deliberately field-level (amount/category/note/date/direction), not funding-source:
// changing which wallet paid would need to re-run the paired-entry / loan bookings store() does,
// which delete-then-recreate covers more safely. A loan-linked amount change is mirrored into the
// loan record server-side (see CashController::update).
function CashEditModal({ entry, onClose, onSaved }: { entry: CashLedgerEntry; onClose: () => void; onSaved: () => void }) {
  const d = new Date(entry.createdAt);
  const isoDate = Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [direction, setDirection] = useState<CashDirection>(entry.direction);
  const [amount, setAmount] = useState(String(entry.amount));
  const [category, setCategory] = useState(entry.category);
  const [note, setNote] = useState(entry.note ?? '');
  const [date, setDate] = useState(isoDate);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const amt = Number(amount);
    if (!(amt > 0)) { setError('Jumlah harus lebih dari 0.'); return; }
    if (!category.trim()) { setError('Kategori wajib diisi.'); return; }
    if (!date) { setError('Tanggal wajib diisi.'); return; }
    setBusy(true); setError('');
    try { await updateCashEntry(entry.id, { direction, amount: amt, category: category.trim(), note: note.trim() || undefined, date }); onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan'); setBusy(false); }
  }
  return <div className="modal-overlay" role="presentation" onClick={onClose}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="cash-edit-title" onClick={ev => ev.stopPropagation()}>
      <div className="modal-heading"><div><p className="eyebrow">Buku kas</p><h2 id="cash-edit-title">Edit transaksi kas</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></div>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>Arah<select value={direction} onChange={e => setDirection(e.target.value as CashDirection)}><option value="in">Kas masuk (+)</option><option value="out">Kas keluar (−)</option></select></label>
          <label>Jumlah<input type="number" min="0" step="1" value={amount} onChange={e => setAmount(e.target.value)} /></label>
          <label>Tanggal<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          <label>Kategori<input value={category} maxLength={25} onChange={e => setCategory(e.target.value)} /></label>
          <label className="span-2">Catatan<input value={note} maxLength={50} onChange={e => setNote(e.target.value)} /></label>
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Batal</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan perubahan'}</button></div>
      </form>
    </section>
  </div>;
}

const POOL_SOURCES: CashFundingSource[] = ['petty', 'bank'];

function CashEntryModal({ entries, onClose, onSaved }: { entries: CashLedgerEntry[]; onClose: () => void; onSaved: (entry: CashLedgerEntry) => void }) {
  const [direction, setDirection] = useState<CashDirection>('in'); const [amount, setAmount] = useState(0); const [category, setCategory] = useState(CASH_CATEGORIES[0]); const [note, setNote] = useState('');
  const [fundingSource, setFundingSource] = useState<CashFundingSource | null>(null);
  const [fundingCashierName, setFundingCashierName] = useState('');
  const [cashSource, setCashSource] = useState<CashInSource | null>(null);
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const [sales, setSales] = useState<SaleRecord[]>([]); const [cashMethodName, setCashMethodName] = useState<string | null>(null);
  const modalRef = useModalTrap(onClose);
  // Fetched once, only actually needed if the cashier picks "dari transaksi harian" - loaded
  // eagerly anyway so the picker has data ready the moment that option is chosen.
  useEffect(() => {
    listSales().then(setSales).catch(() => setSales([]));
    getPaymentMethods().then(methods => setCashMethodName(methods.find(m => m.type === 'cash')?.name ?? null)).catch(() => setCashMethodName(null));
  }, []);
  const todayKey = localTodayKey();
  const cashierTotals = useMemo(() => cashMethodName ? cashierRemainingDailyCash(sales, entries, todayKey, cashMethodName) : [], [sales, entries, cashMethodName, todayKey]);
  // Generated once per modal open and reused across retries of the same submit attempt (e.g. a
  // client-side timeout after the server already succeeded), so a retry can't double-write.
  const idempotencyKey = useRef(crypto.randomUUID()).current;
  async function submit() {
    if (amount <= 0) return setError('Jumlah harus lebih dari 0.');
    if (direction === 'out' && !fundingSource) return setError('Pilih sumber dana.');
    if (direction === 'out' && fundingSource === 'daily' && !fundingCashierName) return setError('Pilih kasir.');
    if (direction === 'in' && !cashSource) return setError('Pilih sumber dana.');
    setSaving(true); setError('');
    try {
      onSaved(await addCashEntry({
        direction, amount, category, note: note.trim() || undefined,
        fundingSource: direction === 'out' ? fundingSource ?? undefined : undefined,
        fundingCashierName: direction === 'out' && fundingSource === 'daily' ? fundingCashierName : undefined,
        cashSource: direction === 'in' ? cashSource ?? undefined : undefined,
      }, idempotencyKey));
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan transaksi kas'); setSaving(false); }
  }
  return <div className="modal-overlay" role="presentation"><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="cash-title">
    <div className="modal-heading"><div><p className="eyebrow">Kas</p><h2 id="cash-title">Catat transaksi kas</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></div>
    <div className="tabs inner" role="tablist" aria-label="Arah kas">
      <button type="button" role="tab" aria-selected={direction === 'in'} className={`tab-button ${direction === 'in' ? 'active' : ''}`} onClick={() => setDirection('in')} data-autofocus="true">Kas masuk</button>
      <button type="button" role="tab" aria-selected={direction === 'out'} className={`tab-button ${direction === 'out' ? 'active' : ''}`} onClick={() => setDirection('out')}>Kas keluar</button>
    </div>
    <label>Kategori<select value={category} onChange={e => setCategory(e.target.value)}>{CASH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
    {direction === 'in' && <label>Sumber dana<select value={cashSource ?? ''} onChange={e => setCashSource(e.target.value as CashInSource)}><option value="" disabled>Pilih sumber dana…</option>{CASH_SOURCES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
      {cashSource === 'daily' && <small className="muted">Rekap kasir hari ini di Laporan otomatis berkurang {money.format(amount)}.</small>}
      {cashSource === 'loan' && <small className="muted">Saldo akumulasi toko di Laporan otomatis berkurang {money.format(amount)}.</small>}
      {cashSource === 'external' && <small className="muted">Pemasukan dari luar — tidak memotong rekap kasir maupun saldo akumulasi toko.</small>}
      {cashSource && cashSource !== 'external' && POOL_SOURCES.includes(cashSource as CashFundingSource) && <small className="muted">Saldo {CASH_SOURCES.find(c => c.value === cashSource)?.label} saat ini: {money.format(cashPoolBalance(entries, cashSource as CashFundingSource))}</small>}
    </label>}
    {direction === 'out' && <label>Sumber dana<select value={fundingSource ?? ''} onChange={e => { setFundingSource(e.target.value as CashFundingSource); setFundingCashierName(''); }}><option value="" disabled>Pilih sumber dana…</option>{FUNDING_SOURCES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
      {FUNDING_SOURCES.find(f => f.value === fundingSource)?.hint && <small className="muted">{FUNDING_SOURCES.find(f => f.value === fundingSource)?.hint}</small>}
      {fundingSource && POOL_SOURCES.includes(fundingSource) && <small className="muted">Saldo {FUNDING_SOURCES.find(f => f.value === fundingSource)?.label} saat ini: {money.format(cashPoolBalance(entries, fundingSource))}</small>}
    </label>}
    {direction === 'out' && fundingSource === 'daily' && <label>Kasir
      <select value={fundingCashierName} onChange={e => setFundingCashierName(e.target.value)}>
        <option value="" disabled>Pilih kasir…</option>
        {cashierTotals.map(c => <option key={c.cashierName} value={c.cashierName}>{c.cashierName} — {money.format(c.amount)}</option>)}
      </select>
      {!cashierTotals.length && <small className="muted">Belum ada transaksi tunai hari ini per kasir.</small>}
    </label>}
    <label>Jumlah<input type="text" inputMode="numeric" placeholder="0" value={amount ? number.format(amount) : ''} onChange={e => setAmount(Number(e.target.value.replace(/\D/g, '')) || 0)} /></label>
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
    <label>Jumlah dibayar<input data-autofocus="true" type="number" min="0" max={outstanding} value={amount || ''} onChange={e => setAmount(Math.max(0, Math.min(outstanding, Number(e.target.value))))} /></label>
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
    <label>Jumlah piutang<input type="number" min="0" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} /></label>
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
    <label>Jumlah diterima<input data-autofocus="true" type="number" min="0" max={outstanding} value={amount || ''} onChange={e => setAmount(Math.max(0, Math.min(outstanding, Number(e.target.value))))} /></label>
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
    <label>Jumlah<input type="number" min="0" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} /></label>
    <label>Catatan (opsional)<input value={note} onChange={e => setNote(e.target.value)} placeholder="Detail tambahan" /></label>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Batal</button><button type="button" className="button primary" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button></div>
  </section></div>;
}

// Hutang pinjaman - booked automatically whenever a kas keluar draws "dari kas pinjaman" (see
// CashEntryModal), never created manually here. Mirrors PayableTab/PayablePaymentModal: paying
// one down shrinks its outstanding amount, which is what reportedRevenueDrawnTotal reads to
// restore that loan's forDate Penjualan figure in Laporan.
function LoanPayableTab() {
  const [loans, setLoans] = useState<LoanPayable[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [paying, setPaying] = useState<LoanPayable | null>(null);
  const load = () => { setLoading(true); setError(''); listLoanPayables().then(setLoans).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const totalOutstanding = loans.reduce((sum, l) => sum + payableOutstanding(l), 0);
  return <>
    <section className="panel flush">
      <div className="table-tools"><h2>Hutang pinjaman</h2><span className="status">Total sisa: {money.format(totalOutstanding)}</span><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat data hutang pinjaman…</div> : !loans.length ? <div className="empty-state">Belum ada hutang pinjaman.</div> : <div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Catatan</th><th className="numeric">Jumlah</th><th className="numeric">Sudah dibayar</th><th className="numeric">Sisa</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{loans.map(l => { const outstanding = payableOutstanding(l); return <tr key={l.id}><td>{new Date(l.createdAt).toLocaleDateString('id-ID')}</td><td>{l.note ?? '—'}</td><td className="numeric mono">{money.format(l.amount)}</td><td className="numeric mono">{money.format(l.amount - outstanding)}</td><td className="numeric mono">{money.format(outstanding)}</td><td>{outstanding > 0 ? <button className="button secondary" onClick={() => setPaying(l)}>Bayar</button> : <span className="status success">Lunas</span>}</td></tr>; })}</tbody></table></div>}
    </section>
    {paying && <LoanPaymentModal loan={paying} onClose={() => setPaying(null)} onSaved={updated => { setLoans(current => current.map(l => l.id === updated.id ? updated : l)); setPaying(null); }} />}
  </>;
}

// The wallets a loan repayment's money can come out of - each books a real kas keluar from that
// wallet (see LoanPayableController). 'daily' (Kas Kasir) draws today's takings under a chosen
// cashier; the rest draw down their own pool balance.
const LOAN_PAY_SOURCES: { value: CashFundingSource; label: string }[] = [
  { value: 'daily', label: 'Kas Kasir (Transaksi Hari Ini)' },
  { value: 'petty', label: 'Kas Kecil' },
  { value: 'bank', label: 'Kas Bank' },
  { value: 'in_transit', label: 'Kas Dalam Perjalanan' },
];

function LoanPaymentModal({ loan, onClose, onSaved }: { loan: LoanPayable; onClose: () => void; onSaved: (loan: LoanPayable) => void }) {
  const outstanding = payableOutstanding(loan);
  const [amount, setAmount] = useState(outstanding); const [note, setNote] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const [fundingSource, setFundingSource] = useState<CashFundingSource | null>(null);
  const [fundingCashierName, setFundingCashierName] = useState('');
  const [sales, setSales] = useState<SaleRecord[]>([]); const [entries, setEntries] = useState<CashLedgerEntry[]>([]); const [cashMethodName, setCashMethodName] = useState<string | null>(null);
  const modalRef = useModalTrap(onClose);
  useEffect(() => {
    listSales().then(setSales).catch(() => setSales([]));
    listCashEntries().then(setEntries).catch(() => setEntries([]));
    getPaymentMethods().then(methods => setCashMethodName(methods.find(m => m.type === 'cash')?.name ?? null)).catch(() => setCashMethodName(null));
  }, []);
  const todayKey = localTodayKey();
  const cashierTotals = useMemo(() => cashMethodName ? cashierRemainingDailyCash(sales, entries, todayKey, cashMethodName) : [], [sales, entries, cashMethodName, todayKey]);
  const idempotencyKey = useRef(crypto.randomUUID()).current;
  async function submit() {
    if (amount <= 0) return setError('Jumlah harus lebih dari 0.');
    if (!fundingSource) return setError('Pilih sumber kas.');
    if (fundingSource === 'daily' && !fundingCashierName) return setError('Pilih kasir.');
    setSaving(true); setError('');
    try { onSaved(await addLoanPayment(loan.id, amount, note.trim() || undefined, fundingSource, fundingSource === 'daily' ? fundingCashierName : undefined, idempotencyKey)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan pembayaran'); setSaving(false); }
  }
  return <div className="modal-overlay" role="presentation"><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="loan-title">
    <div className="modal-heading"><div><p className="eyebrow">Hutang pinjaman</p><h2 id="loan-title">Bayar hutang {new Date(loan.createdAt).toLocaleDateString('id-ID')}</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></div>
    <p>Sisa hutang: <strong>{money.format(outstanding)}</strong></p>
    <label>Jumlah dibayar<input data-autofocus="true" type="number" min="0" max={outstanding} value={amount || ''} onChange={e => setAmount(Math.max(0, Math.min(outstanding, Number(e.target.value))))} /></label>
    <label>Sumber kas<select value={fundingSource ?? ''} onChange={e => { setFundingSource(e.target.value as CashFundingSource); setFundingCashierName(''); }}><option value="" disabled>Pilih sumber kas…</option>{LOAN_PAY_SOURCES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
      {fundingSource && fundingSource !== 'daily' && <small className="muted">Saldo {LOAN_PAY_SOURCES.find(f => f.value === fundingSource)?.label} saat ini: {money.format(cashPoolBalance(entries, fundingSource))}</small>}
      {fundingSource === 'daily' && <small className="muted">Diambil dari pendapatan tunai kasir hari ini</small>}
    </label>
    {fundingSource === 'daily' && <label>Kasir
      <select value={fundingCashierName} onChange={e => setFundingCashierName(e.target.value)}>
        <option value="" disabled>Pilih kasir…</option>
        {cashierTotals.map(c => <option key={c.cashierName} value={c.cashierName}>{c.cashierName} — {money.format(c.amount)}</option>)}
      </select>
      {!cashierTotals.length && <small className="muted">Belum ada transaksi tunai hari ini per kasir.</small>}
    </label>}
    <label>Catatan (opsional)<input value={note} onChange={e => setNote(e.target.value)} placeholder="Detail tambahan" /></label>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Batal</button><button type="button" className="button primary" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan pembayaran'}</button></div>
  </section></div>;
}
