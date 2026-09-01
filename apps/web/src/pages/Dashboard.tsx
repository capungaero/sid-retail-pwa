import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, CircleDollarSign, PackageCheck, TrendingDown, TriangleAlert, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDailyRecap, listCashEntries, listProducts, listPurchaseOrders, listReceivables, listSales } from '../lib/api';
import { dailyDrawnTotal, lowStockProducts, summarizeSales, withMethodPercentages } from '../lib/reports';
import { receivableOutstanding } from '../lib/finance';
import { todayKey as localTodayKey } from '../lib/date';
import { money, number } from '../lib/money';
import type { CashLedgerEntry, DailyRecap, Product, PurchaseOrder, Receivable, SaleRecord } from '../types';

const todayLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

// Label angka di atas titik chart butuh format ringkas - "Rp 1.250.000" kepanjangan
// buat 13 titik per jam, jadi disingkat "1,3jt" / "416rb".
function compactMoney(v: number) {
  if (v <= 0) return '0';
  if (v >= 1_000_000) return (v / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + 'jt';
  if (v >= 1_000) return Math.round(v / 1000) + 'rb';
  return String(Math.round(v));
}

export function Dashboard() {
  const [sales, setSales] = useState<SaleRecord[]>([]); const [products, setProducts] = useState<Product[]>([]); const [orders, setOrders] = useState<PurchaseOrder[]>([]); const [receivables, setReceivables] = useState<Receivable[]>([]); const [loading, setLoading] = useState(true);
  const [histFrom, setHistFrom] = useState(''); const [histTo, setHistTo] = useState('');
  const [chartRange, setChartRange] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  // 0 = periode berjalan (sampai hari ini); 1 = satu periode ke belakang, dst. Direset
  // ke 0 setiap ganti tab supaya gak "nyangkut" di masa lalu waktu pindah rentang.
  const [chartOffset, setChartOffset] = useState(0);
  const [recap, setRecap] = useState<DailyRecap | null>(null);
  const [cashEntries, setCashEntries] = useState<CashLedgerEntry[]>([]);
  function selectRange(range: typeof chartRange) { setChartRange(range); setChartOffset(0); }
  useEffect(() => {
    // Each fetch degrades to an empty list on its own instead of failing the whole page: a
    // kasir's token only has the 'pos' ability, so purchase-orders (inventory) and receivables
    // (finance) 403 for them — that's expected RBAC, not an error worth showing. Sales/stock
    // still load fine, so a kasir gets an honestly-scoped dashboard instead of a page-wide
    // "Invalid ability provided." banner blocking everything, including what they can see.
    const safe = <T,>(p: Promise<T[]>): Promise<T[]> => p.catch(() => []);
    Promise.all([safe(listSales()), safe(listProducts()), safe(listPurchaseOrders()), safe(listReceivables()), safe(listCashEntries())])
      .then(([s, p, o, r, c]) => { setSales(s); setProducts(p); setOrders(o); setReceivables(r); setCashEntries(c); })
      .finally(() => setLoading(false));
  }, []);
  // Today's revenue split per payment method (best-effort; failure just hides the card).
  useEffect(() => { getDailyRecap().then(setRecap).catch(() => setRecap(null)); }, []);
  const recapRows = useMemo(() => recap ? withMethodPercentages(recap.byMethod, recap.totalRevenue) : [], [recap]);

  const todayKey = localTodayKey();
  const todaySales = useMemo(() => sales.filter(s => s.createdAt.slice(0, 10) === todayKey), [sales, todayKey]);
  const summary = useMemo(() => summarizeSales(todaySales), [todaySales]);
  // "Penjualan hari ini" shows GROSS sales (before any till withdrawal). The kas keluar draws
  // funded "Kas Kasir (Transaksi Hari Ini)" are shown on their own as "Pengeluaran hari ini", and
  // the remainder as "Sisa saldo" - which equals recap.totalRevenue (Rekap harian's netted
  // figure, gross minus those same draws), so Sisa saldo and Rekap harian still agree.
  const todayGrossRevenue = summary.revenue;
  const todayTransactionCount = recap?.transactionCount ?? summary.count;
  const todayExpense = useMemo(() => dailyDrawnTotal(cashEntries, { start: todayKey, end: todayKey }), [cashEntries, todayKey]);
  const sisaSaldo = todayGrossRevenue - todayExpense;
  const avgTicket = todayTransactionCount ? todayGrossRevenue / todayTransactionCount : 0;
  const low = useMemo(() => lowStockProducts(products), [products]);
  const negativeStock = products.filter(p => p.stock < 0).length;
  const pendingOrders = orders.filter(o => o.status !== 'received');
  const overdueReceivables = useMemo(() => receivables.filter(r => r.dueAt && r.dueAt <= todayKey && receivableOutstanding(r) > 0), [receivables, todayKey]);
  const overdueTotal = overdueReceivables.reduce((sum, r) => sum + receivableOutstanding(r), 0);

  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00–20:00, the store's typical operating window

  const chart = useMemo(() => {
    if (chartRange === 'harian') {
      const day = new Date(); day.setDate(day.getDate() - chartOffset);
      const dayKey = day.toISOString().slice(0, 10);
      const daySales = sales.filter(s => s.createdAt.slice(0, 10) === dayKey);
      const values = hours.map(h => daySales.filter(s => new Date(s.createdAt).getHours() === h).reduce((sum, s) => sum + s.total, 0));
      const rangeLabel = day.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      return { labels: hours.map(h => String(h).padStart(2, '0')), values, empty: daySales.length === 0, rangeLabel };
    }
    if (chartRange === 'mingguan') {
      const end = new Date(); end.setDate(end.getDate() - chartOffset * 7);
      const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(end); d.setDate(d.getDate() - (6 - i)); return d; });
      const values = days.map(d => { const key = d.toISOString().slice(0, 10); return sales.filter(s => s.createdAt.slice(0, 10) === key).reduce((sum, s) => sum + s.total, 0); });
      const rangeLabel = `${days[0].toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      return { labels: days.map(d => d.toLocaleDateString('id-ID', { weekday: 'short' })), values, empty: values.every(v => v === 0), rangeLabel };
    }
    const end = new Date(); end.setDate(1); end.setMonth(end.getMonth() - chartOffset * 6);
    const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(end); d.setMonth(d.getMonth() - (5 - i)); return d; });
    const values = months.map(d => sales.filter(s => { const sd = new Date(s.createdAt); return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth(); }).reduce((sum, s) => sum + s.total, 0));
    const rangeLabel = `${months[0].toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })} – ${months[5].toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`;
    return { labels: months.map(d => d.toLocaleDateString('id-ID', { month: 'short' })), values, empty: values.every(v => v === 0), rangeLabel };
  }, [chartRange, chartOffset, sales, hours]);
  const maxChart = Math.max(1, ...chart.values);
  const canGoNext = chartOffset > 0;

  // Geometri line chart: viewBox tetap 700x230, ada ruang atas (padTop) buat
  // label angka per titik supaya gak nabrak garis, dan ruang bawah (padBottom)
  // buat label waktu (jam/hari/bulan).
  const CHART_W = 700, CHART_H = 230, padTop = 26, padBottom = 26;
  const plotH = CHART_H - padTop - padBottom;
  const points = chart.values.map((v, i) => {
    const x = chart.values.length > 1 ? (i / (chart.values.length - 1)) * CHART_W : CHART_W / 2;
    const y = padTop + (1 - v / maxChart) * plotH;
    return { x, y, v, label: chart.labels[i] };
  });
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = points.length ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${CHART_H - padBottom} L${points[0].x.toFixed(1)},${CHART_H - padBottom} Z` : '';

  const filteredHistory = useMemo(() => sales
    .filter(s => (!histFrom || s.createdAt.slice(0, 10) >= histFrom) && (!histTo || s.createdAt.slice(0, 10) <= histTo))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [sales, histFrom, histTo]);
  const recentHistory = filteredHistory.slice(0, 10);

  return <div className="page"><div className="page-heading"><div><p className="eyebrow">{todayLabel}</p><h1>Ringkasan operasional</h1><p>Pantau aktivitas toko hari ini.</p></div><Link className="button primary" to="/pos">Buka kasir <ArrowRight /></Link></div>
    <section className="metric-grid" aria-label="Metrik hari ini">
      <article className="metric"><span className="metric-icon blue"><CircleDollarSign /></span><div><span>Penjualan hari ini</span><strong>{loading ? '—' : money.format(todayGrossRevenue)}</strong><small>{loading ? 'Memuat…' : `${number.format(todayTransactionCount)} transaksi`}</small></div></article>
      <article className="metric"><span className="metric-icon red"><TrendingDown /></span><div><span>Pengeluaran hari ini</span><strong>{loading ? '—' : money.format(todayExpense)}</strong><small>Dari kas kasir hari ini</small></div></article>
      <article className="metric"><span className="metric-icon green"><Wallet /></span><div><span>Sisa saldo hari ini</span><strong>{loading ? '—' : money.format(sisaSaldo)}</strong><small>Rata-rata {money.format(avgTicket)}/transaksi</small></div></article>
      <article className="metric"><span className="metric-icon amber"><TriangleAlert /></span><div><span>Stok perlu perhatian</span><strong>{loading ? '—' : number.format(low.length)} barang</strong><small>{number.format(negativeStock)} stok negatif</small></div></article>
      <article className="metric"><span className="metric-icon purple"><PackageCheck /></span><div><span>Pembelian tertunda</span><strong>{loading ? '—' : number.format(pendingOrders.length)} PO</strong><small>Belum diterima penuh</small></div></article>
    </section>
    <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><h2>Aktivitas penjualan</h2><div className="chart-nav">
          <button type="button" onClick={() => setChartOffset(o => o + 1)} aria-label="Periode sebelumnya"><ChevronLeft /></button>
          <p>{chart.rangeLabel}</p>
          <button type="button" onClick={() => setChartOffset(o => Math.max(0, o - 1))} disabled={!canGoNext} aria-label="Periode berikutnya"><ChevronRight /></button>
        </div></div><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div className="chart-range" role="group" aria-label="Rentang grafik">
          <button type="button" className={chartRange === 'harian' ? 'active' : ''} onClick={() => selectRange('harian')}>Harian</button>
          <button type="button" className={chartRange === 'mingguan' ? 'active' : ''} onClick={() => selectRange('mingguan')}>Mingguan</button>
          <button type="button" className={chartRange === 'bulanan' ? 'active' : ''} onClick={() => selectRange('bulanan')}>Bulanan</button>
        </div>
        <span className="status success">Aktif</span>
      </div></div>
      {chart.empty && !loading ? <p className="muted" style={{ padding: '24px 0' }}>Belum ada transaksi pada rentang ini.</p> : <svg className="line-chart" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" role="img" aria-label="Grafik pendapatan">
        <defs><linearGradient id="lcGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0" /></linearGradient></defs>
        <line className="lc-axis" x1="0" y1={CHART_H - padBottom} x2={CHART_W} y2={CHART_H - padBottom} />
        {areaPath && <path className="lc-area" d={areaPath} />}
        {linePath && <path className="lc-line" d={linePath} />}
        {points.map((p, i) => <g key={i}>
          <circle className="lc-dot" cx={p.x} cy={p.y} r={4} />
          <text className="lc-value" x={p.x} y={Math.max(12, p.y - 10)}>{compactMoney(p.v)}</text>
          <text className="lc-label" x={p.x} y={CHART_H - padBottom + 16}>{p.label}</text>
        </g>)}
      </svg>}
    </section>
      <section className="panel"><div className="panel-heading"><div><h2>Perlu tindakan</h2><p>Pengecualian operasional</p></div></div><ul className="action-list">
        <li><span className="dot red" /><div><strong>{number.format(negativeStock)} stok negatif</strong><span>Lakukan rekonsiliasi stok</span></div></li>
        <li><span className="dot amber" /><div><strong>{number.format(low.length)} barang di bawah minimum</strong><span>Siapkan usulan pembelian</span></div></li>
        <li><span className="dot blue" /><div><strong>{number.format(overdueReceivables.length)} piutang jatuh tempo</strong><span>Total {money.format(overdueTotal)}</span></div></li>
      </ul>
      <div className="panel-heading" style={{ marginTop: 18 }}><div><h2>Pembayaran hari ini</h2><p>Per metode</p></div><Wallet /></div>
      {!recapRows.length ? <p className="muted">Belum ada penjualan hari ini.</p> : <ul className="recap-methods">{recapRows.map(r => <li key={r.methodCode}><span>{r.methodName}</span><span className="rm-track"><span className="rm-bar" style={{ width: `${Math.max(2, r.percent * 100)}%` }} /></span><strong className="mono">{money.format(r.amount)}</strong></li>)}</ul>}
      </section></div>
    <section className="panel flush" style={{ marginTop: 12 }}>
      <div className="panel-heading" style={{ padding: '16px 16px 0' }}><div><h2>Riwayat transaksi</h2><p>{filteredHistory.length} transaksi cocok filter</p></div></div>
      <div className="table-tools">
        <label className="date-field">Dari<input type="date" value={histFrom} max={histTo || undefined} onChange={e => setHistFrom(e.target.value)} /></label>
        <label className="date-field">Sampai<input type="date" value={histTo} min={histFrom || undefined} onChange={e => setHistTo(e.target.value)} /></label>
        <Link className="button secondary" to="/transactions">Lihat semua <ArrowRight /></Link>
      </div>
      {loading ? <div className="empty-state">Memuat riwayat transaksi…</div> : recentHistory.length === 0 ? <div className="empty-state">Tidak ada transaksi pada rentang ini.</div> : <div className="table-wrap"><table><thead><tr><th>Faktur</th><th>Tanggal</th><th>Pelanggan</th><th className="numeric">Item</th><th className="numeric">Total</th></tr></thead><tbody>
        {recentHistory.map(s => <tr key={s.id}><td className="mono">{s.invoice}</td><td>{new Date(s.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td><td>{s.customerName || 'Tanpa nama'}</td><td className="numeric mono">{number.format(s.lines.reduce((sum, l) => sum + l.qty, 0))}</td><td className="numeric mono">{money.format(s.total)}</td></tr>)}
      </tbody></table></div>}
    </section>
  </div>;
}
