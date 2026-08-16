import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CircleDollarSign, PackageCheck, ReceiptText, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listProducts, listPurchaseOrders, listReceivables, listSales } from '../lib/api';
import { lowStockProducts, summarizeSales } from '../lib/reports';
import { receivableOutstanding } from '../lib/finance';
import { money, number } from '../lib/money';
import type { Product, PurchaseOrder, Receivable, SaleRecord } from '../types';

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
  const [sales, setSales] = useState<SaleRecord[]>([]); const [products, setProducts] = useState<Product[]>([]); const [orders, setOrders] = useState<PurchaseOrder[]>([]); const [receivables, setReceivables] = useState<Receivable[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [histFrom, setHistFrom] = useState(''); const [histTo, setHistTo] = useState('');
  const [chartRange, setChartRange] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  useEffect(() => {
    Promise.all([listSales(), listProducts(), listPurchaseOrders(), listReceivables()])
      .then(([s, p, o, r]) => { setSales(s); setProducts(p); setOrders(o); setReceivables(r); })
      .catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat ringkasan'))
      .finally(() => setLoading(false));
  }, []);

  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySales = useMemo(() => sales.filter(s => s.createdAt.slice(0, 10) === todayKey), [sales, todayKey]);
  const summary = useMemo(() => summarizeSales(todaySales), [todaySales]);
  const avgTicket = summary.count ? summary.revenue / summary.count : 0;
  const low = useMemo(() => lowStockProducts(products), [products]);
  const negativeStock = products.filter(p => p.stock < 0).length;
  const pendingOrders = orders.filter(o => o.status !== 'received');
  const overdueReceivables = useMemo(() => receivables.filter(r => r.dueAt && r.dueAt <= todayKey && receivableOutstanding(r) > 0), [receivables, todayKey]);
  const overdueTotal = overdueReceivables.reduce((sum, r) => sum + receivableOutstanding(r), 0);

  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00–20:00, the store's typical operating window

  const chart = useMemo(() => {
    if (chartRange === 'harian') {
      const values = hours.map(h => todaySales.filter(s => new Date(s.createdAt).getHours() === h).reduce((sum, s) => sum + s.total, 0));
      return { labels: hours.map(h => String(h).padStart(2, '0')), values, empty: todaySales.length === 0 };
    }
    if (chartRange === 'mingguan') {
      const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
      const values = days.map(d => { const key = d.toISOString().slice(0, 10); return sales.filter(s => s.createdAt.slice(0, 10) === key).reduce((sum, s) => sum + s.total, 0); });
      return { labels: days.map(d => d.toLocaleDateString('id-ID', { weekday: 'short' })), values, empty: values.every(v => v === 0) };
    }
    const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); return d; });
    const values = months.map(d => sales.filter(s => { const sd = new Date(s.createdAt); return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth(); }).reduce((sum, s) => sum + s.total, 0));
    return { labels: months.map(d => d.toLocaleDateString('id-ID', { month: 'short' })), values, empty: values.every(v => v === 0) };
  }, [chartRange, sales, todaySales, hours]);
  const maxChart = Math.max(1, ...chart.values);
  const chartSubtitle = chartRange === 'harian' ? 'Per jam, hari ini' : chartRange === 'mingguan' ? '7 hari terakhir' : '6 bulan terakhir';

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
    {error && <div className="notice error" role="alert">{error}</div>}
    <section className="metric-grid" aria-label="Metrik hari ini">
      <article className="metric"><span className="metric-icon blue"><CircleDollarSign /></span><div><span>Penjualan hari ini</span><strong>{loading ? '—' : money.format(summary.revenue)}</strong><small>{loading ? 'Memuat…' : `${number.format(summary.count)} transaksi`}</small></div></article>
      <article className="metric"><span className="metric-icon green"><ReceiptText /></span><div><span>Rata-rata transaksi</span><strong>{loading ? '—' : money.format(avgTicket)}</strong><small>{number.format(summary.qtySold)} item terjual</small></div></article>
      <article className="metric"><span className="metric-icon amber"><TriangleAlert /></span><div><span>Stok perlu perhatian</span><strong>{loading ? '—' : number.format(low.length)} barang</strong><small>{number.format(negativeStock)} stok negatif</small></div></article>
      <article className="metric"><span className="metric-icon purple"><PackageCheck /></span><div><span>Pembelian tertunda</span><strong>{loading ? '—' : number.format(pendingOrders.length)} PO</strong><small>Belum diterima penuh</small></div></article>
    </section>
    <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><h2>Aktivitas penjualan</h2><p>{chartSubtitle}</p></div><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div className="chart-range" role="group" aria-label="Rentang grafik">
          <button type="button" className={chartRange === 'harian' ? 'active' : ''} onClick={() => setChartRange('harian')}>Harian</button>
          <button type="button" className={chartRange === 'mingguan' ? 'active' : ''} onClick={() => setChartRange('mingguan')}>Mingguan</button>
          <button type="button" className={chartRange === 'bulanan' ? 'active' : ''} onClick={() => setChartRange('bulanan')}>Bulanan</button>
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
      </ul></section></div>
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
