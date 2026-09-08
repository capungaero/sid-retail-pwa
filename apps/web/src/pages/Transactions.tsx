import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Printer, RefreshCw, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getStoredUser, getStoreProfile, listSales } from '../lib/api';
import { rootSalesOnly, summarizeSales } from '../lib/reports';
import { money, number } from '../lib/money';
import { resolveRole } from '../lib/permissions';
import { SaleStockDetailModal } from '../components/SaleStockDetailModal';
import { openBlankPreviewPopup, openDailySalesReportPopup } from '../lib/print';
import type { SaleRecord } from '../types';

export function Transactions() {
  const [sales, setSales] = useState<SaleRecord[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<SaleRecord | null>(null);
  const [printing, setPrinting] = useState(false);
  const isAdmin = resolveRole(getStoredUser()?.role) === 'admin';
  const load = () => { setLoading(true); setError(''); listSales().then(setSales).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat transaksi')).finally(() => setLoading(false)); };
  useEffect(load, []);

  const filtered = useMemo(() => sales
    .filter(s => (!from || s.createdAt.slice(0, 10) >= from) && (!to || s.createdAt.slice(0, 10) <= to))
    .filter(s => { const q = search.trim().toLowerCase(); return !q || [s.invoice, s.customerName].some(v => v.toLowerCase().includes(q)); })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [sales, from, to, search]);
  const summary = useMemo(() => summarizeSales(filtered), [filtered]);
  // An exchange's replacement invoice never gets its own row - its history lives in the original
  // faktur's own Detail instead (see rootSalesOnly). `summary` above still reads the full
  // `filtered` set, which already nets exchanges correctly regardless of which rows are shown.
  const rows = useMemo(() => rootSalesOnly(filtered), [filtered]);
  // Prints the rows currently shown (same filter) as the A4 sales report. window.open() must run
  // synchronously inside the click handler or popup blockers kill it - open a blank tab first,
  // then fill it in once the store profile fetch resolves (same pattern as Pos.printReport).
  function printHistory() {
    const popup = openBlankPreviewPopup();
    setPrinting(true);
    (async () => {
      let storeName: string | undefined; try { storeName = (await getStoreProfile())?.name; } catch { storeName = undefined; }
      const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', { dateStyle: 'long' });
      const label = from || to ? `${from ? fmt(from) : '…'} s/d ${to ? fmt(to) : '…'}` : 'Semua transaksi';
      try { openDailySalesReportPopup(rows, label, { storeName, allSales: sales, popup }); }
      catch (e) { popup?.close(); alert(e instanceof Error ? e.message : 'Gagal menyiapkan laporan cetak'); }
      finally { setPrinting(false); }
    })();
  }

  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">Ringkasan</p><h1>Riwayat transaksi</h1><p>Seluruh penjualan, dapat difilter berdasarkan tanggal.</p></div><Link className="button secondary" to="/dashboard"><ArrowLeft /> Kembali</Link></div>
    <section className="metric-grid" aria-label="Ringkasan hasil filter" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
      <article className="metric"><div><span>Transaksi</span><strong>{number.format(summary.count)}</strong></div></article>
      <article className="metric"><div><span>Item terjual</span><strong>{number.format(summary.qtySold)}</strong></div></article>
      <article className="metric"><div><span>Total pendapatan</span><strong>{money.format(summary.revenue)}</strong></div></article>
    </section>
    <section className="panel flush">
      <div className="table-tools">
        <label className="search-box"><Search aria-hidden="true" /><span className="sr-only">Cari faktur atau pelanggan</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari faktur atau nama pelanggan…" /></label>
        <label className="date-field">Dari<input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} /></label>
        <label className="date-field">Sampai<input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></label>
        <button className="button secondary" onClick={printHistory} disabled={printing || loading || !rows.length}><Printer /> {printing ? 'Menyiapkan…' : 'Cetak'}</button>
        <button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button>
      </div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat riwayat transaksi…</div> : rows.length === 0 ? <div className="empty-state">Tidak ada transaksi yang cocok.</div> : <div className="table-wrap"><table><thead><tr><th>Faktur</th><th>Tanggal</th><th>Kasir</th><th>Pelanggan</th><th>Barang</th><th className="numeric">Item</th><th className="numeric">Total</th></tr></thead><tbody>
        {rows.map(s => <tr key={s.id} className={isAdmin ? 'row-clickable' : undefined} tabIndex={isAdmin ? 0 : undefined} role={isAdmin ? 'button' : undefined} onClick={isAdmin ? () => setDetail(s) : undefined} onKeyDown={isAdmin ? e => { if (e.key === 'Enter') setDetail(s); } : undefined}>
          <td className="mono">{s.invoice}{s.exchanges && s.exchanges.length > 0 && <span className="status" style={{ marginLeft: 6 }}>Ditukar</span>}</td><td>{new Date(s.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td><td>{s.cashierName || '—'}</td><td>{s.customerName || 'Tanpa nama'}</td><td><small>{s.lines.map(l => l.productName).join(', ')}</small></td><td className="numeric mono">{number.format(s.lines.reduce((sum, l) => sum + l.qty, 0))}</td><td className="numeric mono">{money.format(s.total)}</td>
        </tr>)}
      </tbody></table></div>}
    </section>
    {detail && <SaleStockDetailModal sale={detail} allSales={sales} onClose={() => setDetail(null)} />}
  </div>;
}
