import { useEffect, useMemo, useState } from 'react';
import { Banknote, CircleDollarSign, PackageSearch, ReceiptText, RefreshCw, TrendingDown, TrendingUp, TriangleAlert, Wallet } from 'lucide-react';
import { getDailyRecap, listCashEntries, listPayables, listProducts, listPurchaseOrders, listReceivables, listSales, listStockMovements, listSuppliers } from '../lib/api';
import { calculateProfitLoss, cashPosition, filterByRange, lowStockProducts, summarizePayablesBySupplier, summarizePurchases, summarizeReceivablesByCustomer, summarizeSales, withMethodPercentages } from '../lib/reports';
import { money, number } from '../lib/money';
import type { CashLedgerEntry, DailyRecap, Payable, Product, PurchaseOrder, Receivable, SaleRecord, StockMovement, StockMovementType, Supplier } from '../types';

const TABS = [
  { key: 'daily-recap', label: 'Rekap harian' },
  { key: 'sales-purchase', label: 'Penjualan & pembelian' },
  { key: 'stock', label: 'Kartu stok & stok minimum' },
  { key: 'cash-pl', label: 'Kas & laba rugi' },
  { key: 'payable-receivable', label: 'Hutang & piutang' }
] as const;
type TabKey = typeof TABS[number]['key'];

const MOVEMENT_LABEL: Record<StockMovementType, string> = { 'purchase-receipt': 'Penerimaan pembelian', 'purchase-return': 'Retur pembelian', 'sales-return': 'Retur penjualan', adjustment: 'Koreksi stok' };

export function Reports() {
  const [tab, setTab] = useState<TabKey>('sales-purchase');
  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">Laporan</p><h1>Laporan</h1><p>Ringkasan operasional yang dapat direkonsiliasi. Modul ini hanya membaca data — tidak ada perubahan yang disimpan di sini.</p></div></div>
    <div className="tabs" role="tablist" aria-label="Sub modul laporan">{TABS.map(t => <button key={t.key} role="tab" aria-selected={tab === t.key} className={`tab-button ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}</div>
    {tab === 'daily-recap' && <DailyRecapTab />}
    {tab === 'sales-purchase' && <SalesPurchaseTab />}
    {tab === 'stock' && <StockReportTab />}
    {tab === 'cash-pl' && <CashProfitLossTab />}
    {tab === 'payable-receivable' && <PayableReceivableTab />}
  </div>;
}

function DateRangeFilter({ start, end, setStart, setEnd, onReset }: { start: string; end: string; setStart: (v: string) => void; setEnd: (v: string) => void; onReset: () => void }) {
  return <section className="panel">
    <div className="panel-heading"><div><p className="eyebrow">Filter periode</p><h2>Rentang tanggal</h2></div></div>
    <div className="form-grid">
      <label>Dari<input type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
      <label>Sampai<input type="date" value={end} onChange={e => setEnd(e.target.value)} /></label>
      <div className="line-add-row"><button type="button" className="button secondary" onClick={onReset}>Reset filter</button></div>
    </div>
  </section>;
}

function DailyRecapTab() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [recap, setRecap] = useState<DailyRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = (d: string) => { setLoading(true); setError(''); getDailyRecap(d).then(setRecap).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat rekap harian')).finally(() => setLoading(false)); };
  useEffect(() => { load(date); }, [date]);
  const rows = useMemo(() => recap ? withMethodPercentages(recap.byMethod, recap.totalRevenue) : [], [recap]);
  return <>
    <section className="panel">
      <div className="panel-heading"><div><p className="eyebrow">Rekap per metode</p><h2>Rekap harian</h2></div><button className="button secondary" onClick={() => load(date)} disabled={loading}><RefreshCw /> Muat ulang</button></div>
      <div className="form-grid"><label>Tanggal<input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} /></label></div>
    </section>
    {error && <div className="notice error" role="alert">{error}</div>}
    <section className="metric-grid" aria-label="Ringkasan hari terpilih">
      <article className="metric"><span className="metric-icon blue"><CircleDollarSign /></span><div><span>Total pendapatan</span><strong>{loading ? '—' : money.format(recap?.totalRevenue ?? 0)}</strong><small>Seluruh penjualan hari ini</small></div></article>
      <article className="metric"><span className="metric-icon green"><ReceiptText /></span><div><span>Jumlah transaksi</span><strong>{loading ? '—' : number.format(recap?.transactionCount ?? 0)}</strong><small>Faktur pada tanggal ini</small></div></article>
      <article className="metric"><span className="metric-icon purple"><Wallet /></span><div><span>Metode terpakai</span><strong>{loading ? '—' : number.format(rows.length)}</strong><small>Rincian di bawah</small></div></article>
    </section>
    <section className="panel flush">
      <div className="table-tools"><h2>Rincian per metode pembayaran</h2></div>
      {loading ? <div className="empty-state">Memuat rekap…</div> : !rows.length ? <div className="empty-state">Belum ada penjualan pada tanggal ini.</div> : <div className="table-wrap"><table><thead><tr><th>Metode</th><th className="numeric">Jumlah transaksi</th><th className="numeric">Total</th><th className="numeric">% hari ini</th></tr></thead><tbody>
        {rows.map(r => <tr key={r.methodCode}><td>{r.methodName}</td><td className="numeric mono">{number.format(r.count)}</td><td className="numeric mono">{money.format(r.amount)}</td><td className="numeric mono">{(r.percent * 100).toFixed(1)}%</td></tr>)}
      </tbody><tfoot><tr><th>Total</th><th className="numeric mono">{number.format(recap?.transactionCount ?? 0)}</th><th className="numeric mono">{money.format(recap?.totalRevenue ?? 0)}</th><th className="numeric mono">100.0%</th></tr></tfoot></table></div>}
    </section>
  </>;
}

function SalesPurchaseTab() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const load = () => { setLoading(true); setError(''); Promise.all([listSales(), listPurchaseOrders(), listSuppliers()]).then(([s, p, sup]) => { setSales(s); setOrders(p); setSuppliers(sup); }).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const range = useMemo(() => ({ start: start || undefined, end: end || undefined }), [start, end]);
  const filteredSales = useMemo(() => filterByRange(sales, range), [sales, range]);
  const filteredOrders = useMemo(() => filterByRange(orders, range), [orders, range]);
  const salesSummary = useMemo(() => summarizeSales(filteredSales), [filteredSales]);
  const purchaseSummary = useMemo(() => summarizePurchases(filteredOrders), [filteredOrders]);
  const supplierName = (id: string) => suppliers.find(s => s.id === id)?.name ?? id;
  return <>
    <DateRangeFilter start={start} end={end} setStart={setStart} setEnd={setEnd} onReset={() => { setStart(''); setEnd(''); }} />
    {error && <div className="notice error" role="alert">{error}</div>}
    <section className="metric-grid" aria-label="Ringkasan penjualan & pembelian">
      <article className="metric"><span className="metric-icon blue"><ReceiptText /></span><div><span>Penjualan</span><strong>{money.format(salesSummary.revenue)}</strong><small>{salesSummary.count} transaksi · {number.format(salesSummary.qtySold)} item terjual</small></div></article>
      <article className="metric"><span className="metric-icon amber"><TrendingDown /></span><div><span>Diskon penjualan</span><strong>{money.format(salesSummary.discount)}</strong><small>Total diskon periode ini</small></div></article>
      <article className="metric"><span className="metric-icon purple"><PackageSearch /></span><div><span>Pembelian dipesan</span><strong>{money.format(purchaseSummary.orderedValue)}</strong><small>{purchaseSummary.count} PO</small></div></article>
      <article className="metric"><span className="metric-icon green"><TrendingUp /></span><div><span>Pembelian diterima</span><strong>{money.format(purchaseSummary.receivedValue)}</strong><small>Nilai barang sudah masuk stok</small></div></article>
    </section>
    <section className="panel flush">
      <div className="table-tools"><h2>Detail penjualan</h2><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button></div>
      {loading ? <div className="empty-state">Memuat data penjualan…</div> : !filteredSales.length ? <div className="empty-state">Tidak ada penjualan pada periode ini.</div> : <div className="table-wrap"><table><thead><tr><th>Waktu</th><th>Faktur</th><th>Pelanggan</th><th className="numeric">Baris</th><th className="numeric">Total</th></tr></thead><tbody>{filteredSales.map(s => <tr key={s.id}><td>{new Date(s.createdAt).toLocaleString('id-ID')}</td><td className="mono">{s.invoice}</td><td>{s.customerName}</td><td className="numeric mono">{s.lines.length}</td><td className="numeric mono">{money.format(s.total)}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="panel flush">
      <div className="table-tools"><h2>Detail pembelian</h2></div>
      {loading ? <div className="empty-state">Memuat data pembelian…</div> : !filteredOrders.length ? <div className="empty-state">Tidak ada pembelian pada periode ini.</div> : <div className="table-wrap"><table><thead><tr><th>Referensi</th><th>Pemasok</th><th>Status</th><th className="numeric">Dipesan</th><th className="numeric">Diterima</th></tr></thead><tbody>{filteredOrders.map(po => <tr key={po.id}><td className="mono">{po.reference}</td><td>{supplierName(po.supplierId)}</td><td><span className={`status ${po.status === 'received' ? 'success' : ''}`}>{po.status === 'draft' ? 'Draft' : po.status === 'open' ? 'PO terbuka' : 'Diterima'}</span></td><td className="numeric mono">{money.format(po.lines.reduce((sum, l) => sum + l.qty * l.cost, 0))}</td><td className="numeric mono">{money.format(po.lines.reduce((sum, l) => sum + l.receivedQty * l.cost, 0))}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}

function StockReportTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const load = () => { setLoading(true); setError(''); Promise.all([listProducts(), listStockMovements()]).then(([p, m]) => { setProducts(p); setMovements(m); }).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const filtered = filterProduct ? movements.filter(m => m.productId === filterProduct) : movements;
  const lowStock = useMemo(() => lowStockProducts(products), [products]);
  return <>
    {error && <div className="notice error" role="alert">{error}</div>}
    <section className="panel flush">
      <div className="table-tools"><h2>Stok minimum</h2><span className="status danger">{lowStock.length} barang perlu perhatian</span><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button></div>
      {loading ? <div className="empty-state">Memuat data stok…</div> : !lowStock.length ? <div className="empty-state">Semua barang berada di atas stok minimum.</div> : <div className="table-wrap"><table><thead><tr><th>Barang</th><th>Kategori</th><th className="numeric">Stok</th><th className="numeric">Stok minimum</th></tr></thead><tbody>{lowStock.map(p => <tr key={p.id}><td>{p.name}<small>{p.code}</small></td><td>{p.category}</td><td className={`numeric mono ${p.stock <= 0 ? 'danger-text' : ''}`}>{number.format(p.stock)}</td><td className="numeric mono">{number.format(p.minStock)}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="panel flush">
      <div className="table-tools"><h2>Kartu stok</h2><select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} aria-label="Filter barang"><option value="">Semua barang</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      {loading ? <div className="empty-state">Memuat data mutasi…</div> : !filtered.length ? <div className="empty-state">Belum ada mutasi stok.</div> : <div className="table-wrap"><table><thead><tr><th>Waktu</th><th>Barang</th><th>Jenis</th><th className="numeric">Jumlah</th><th>Referensi</th><th>Catatan</th></tr></thead><tbody>{filtered.map(m => <tr key={m.id}><td>{new Date(m.createdAt).toLocaleString('id-ID')}</td><td>{m.productName}</td><td>{MOVEMENT_LABEL[m.type]}</td><td className={`numeric mono ${m.qty < 0 ? 'danger-text' : ''}`}>{m.qty > 0 ? '+' : ''}{number.format(m.qty)}</td><td className="mono">{m.reference}</td><td>{m.note ?? '—'}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}

function CashProfitLossTab() {
  const [entries, setEntries] = useState<CashLedgerEntry[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = () => { setLoading(true); setError(''); Promise.all([listCashEntries(), listSales(), listProducts()]).then(([e, s, p]) => { setEntries(e); setSales(s); setProducts(p); }).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const position = useMemo(() => cashPosition(entries), [entries]);
  const pl = useMemo(() => calculateProfitLoss(sales, products), [sales, products]);
  const ordered = useMemo(() => [...entries].reverse(), [entries]);
  return <>
    {error && <div className="notice error" role="alert">{error}</div>}
    <section className="metric-grid" aria-label="Ringkasan kas dan laba rugi">
      <article className="metric"><span className="metric-icon green"><Banknote /></span><div><span>Saldo kas saat ini</span><strong>{money.format(position.balance)}</strong><small>Kas masuk {money.format(position.totalIn)} · keluar {money.format(position.totalOut)}</small></div></article>
      <article className="metric"><span className="metric-icon blue"><CircleDollarSign /></span><div><span>Pendapatan penjualan</span><strong>{money.format(pl.revenue)}</strong><small>Dari seluruh transaksi tersimpan</small></div></article>
      <article className="metric"><span className="metric-icon amber"><TrendingDown /></span><div><span>Harga pokok penjualan (HPP)</span><strong>{money.format(pl.cogs)}</strong><small>Berdasarkan biaya per barang</small></div></article>
      <article className="metric"><span className="metric-icon purple"><TrendingUp /></span><div><span>Laba kotor</span><strong>{money.format(pl.grossProfit)}</strong><small>Margin {(pl.margin * 100).toFixed(1)}%</small></div></article>
    </section>
    <section className="panel flush">
      <div className="table-tools"><h2>Buku kas</h2><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button></div>
      {loading ? <div className="empty-state">Memuat data kas…</div> : !ordered.length ? <div className="empty-state">Belum ada transaksi kas.</div> : <div className="table-wrap"><table><thead><tr><th>Waktu</th><th>Kategori</th><th>Catatan</th><th className="numeric">Jumlah</th><th className="numeric">Saldo</th></tr></thead><tbody>{ordered.map(e => <tr key={e.id}><td>{new Date(e.createdAt).toLocaleString('id-ID')}</td><td>{e.category}</td><td>{e.note ?? '—'}</td><td className={`numeric mono ${e.direction === 'out' ? 'danger-text' : ''}`}>{e.direction === 'in' ? '+' : '-'}{money.format(e.amount)}</td><td className="numeric mono">{money.format(e.balanceAfter)}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}

function PayableReceivableTab() {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = () => { setLoading(true); setError(''); Promise.all([listPayables(), listReceivables()]).then(([p, r]) => { setPayables(p); setReceivables(r); }).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const bySupplier = useMemo(() => summarizePayablesBySupplier(payables), [payables]);
  const byCustomer = useMemo(() => summarizeReceivablesByCustomer(receivables), [receivables]);
  const totalPayable = bySupplier.reduce((sum, s) => sum + s.outstanding, 0);
  const totalReceivable = byCustomer.reduce((sum, c) => sum + c.outstanding, 0);
  return <>
    {error && <div className="notice error" role="alert">{error}</div>}
    <section className="metric-grid" aria-label="Ringkasan hutang & piutang">
      <article className="metric"><span className="metric-icon amber"><TriangleAlert /></span><div><span>Total hutang belum lunas</span><strong>{money.format(totalPayable)}</strong><small>{bySupplier.length} pemasok</small></div></article>
      <article className="metric"><span className="metric-icon blue"><CircleDollarSign /></span><div><span>Total piutang belum lunas</span><strong>{money.format(totalReceivable)}</strong><small>{byCustomer.length} pelanggan</small></div></article>
    </section>
    <section className="panel flush">
      <div className="table-tools"><h2>Hutang per pemasok</h2><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button></div>
      {loading ? <div className="empty-state">Memuat data hutang…</div> : !bySupplier.length ? <div className="empty-state">Belum ada hutang supplier.</div> : <div className="table-wrap"><table><thead><tr><th>Pemasok</th><th className="numeric">Total tagihan</th><th className="numeric">Sisa hutang</th></tr></thead><tbody>{bySupplier.map(s => <tr key={s.id}><td>{s.name}</td><td className="numeric mono">{money.format(s.total)}</td><td className="numeric mono">{money.format(s.outstanding)}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="panel flush">
      <div className="table-tools"><h2>Piutang per pelanggan</h2></div>
      {loading ? <div className="empty-state">Memuat data piutang…</div> : !byCustomer.length ? <div className="empty-state">Belum ada piutang pelanggan.</div> : <div className="table-wrap"><table><thead><tr><th>Pelanggan</th><th className="numeric">Total tagihan</th><th className="numeric">Sisa piutang</th></tr></thead><tbody>{byCustomer.map(c => <tr key={c.id}><td>{c.name}</td><td className="numeric mono">{money.format(c.total)}</td><td className="numeric mono">{money.format(c.outstanding)}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
